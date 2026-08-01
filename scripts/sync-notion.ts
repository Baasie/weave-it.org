/**
 * Notion → src/content/. The script the whole publishing loop rests on.
 *
 *   content --collection=<posts|talks|training|learning-journeys>
 *
 * Nothing here is hand-edited afterwards: Notion is the source of truth and
 * this is the only writer. Add `--write` to land files under `src/content/`;
 * without it everything goes to `preview/` instead, so fidelity can be
 * inspected before anything real changes.
 *
 * Ported from virtualddd.com. The parts that look over-careful are the parts
 * that were learned the hard way — the image rescue, the redirect ledger and
 * the digest check each exist because their absence broke something. See
 * docs/pipeline.md.
 */
import dotenv from 'dotenv';
import { Client } from '@notionhq/client';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, readdirSync, unlinkSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';
import { normaliseTags } from '../src/lib/tags.ts';
import {
  assetRefs, createBlocksToMd, decodeEntities, fileUrl, isAssetFor, plainTitle,
  statusOf, yamlList, yamlStr, type AssetCtx,
} from './lib/notion-md.ts';

dotenv.config({ path: 'local.env', quiet: true });

const token = process.env.NOTION_TOKEN;
if (!token) {
  // Names both places it can come from. It said "expected in local.env", which
  // is true locally and misleading in CI — where there is no such file and the
  // fix is a repository secret.
  console.error(
    'NOTION_TOKEN is not set.\n' +
      '  locally: add it to local.env\n' +
      '  in CI:   Settings → Secrets and variables → Actions',
  );
  process.exit(1);
}
const notion = new Client({ auth: token });

// --- API pacing -------------------------------------------------------------
// Notion allows roughly three requests per second and answers 429 above that.
// Every call goes through `api()`, which paces and retries, so a large sync
// cannot fail halfway for want of patience.

const MIN_INTERVAL_MS = 340; // ≈ 2.9 req/s
let nextSlot = 0;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function api<T>(label: string, fn: () => Promise<T>, attempt = 0): Promise<T> {
  const wait = Math.max(0, nextSlot - Date.now());
  if (wait) await sleep(wait);
  nextSlot = Date.now() + MIN_INTERVAL_MS;
  try {
    return await fn();
  } catch (e: any) {
    const status = e?.status ?? e?.code;
    const retriable = status === 429 || status === 502 || status === 503 || status === 504 ||
      e?.code === 'notionhq_client_request_timeout';
    if (!retriable || attempt >= 4) throw e;
    const retryAfter = Number(e?.headers?.['retry-after'] ?? 0);
    const backoff = retryAfter > 0 ? retryAfter * 1000 : 1000 * 2 ** attempt;
    console.warn(`  … ${label} got ${status}; retrying in ${Math.round(backoff / 1000)}s`);
    await sleep(backoff);
    return api(label, fn, attempt + 1);
  }
}

/** Every row of a data source, paged. */
async function queryAll(dataSourceId: string): Promise<any[]> {
  const rows: any[] = [];
  let cursor: string | undefined;
  do {
    // `any` because the call itself is: the data-source query is not on the
    // typed client surface, so nothing downstream of it can be inferred.
    const res: any = await api('query', () => (notion as any).dataSources.query({
      data_source_id: dataSourceId, page_size: 100, start_cursor: cursor,
    }));
    rows.push(...res.results);
    cursor = res.has_more ? (res.next_cursor as string) : undefined;
  } while (cursor);
  return rows;
}

async function childrenOf(blockId: string): Promise<any[]> {
  const out: any[] = [];
  let cursor: string | undefined;
  do {
    const res = await api('blocks.children', () =>
      notion.blocks.children.list({ block_id: blockId, page_size: 100, start_cursor: cursor }));
    out.push(...res.results);
    cursor = res.has_more ? (res.next_cursor as string) : undefined;
  } while (cursor);
  return out;
}

// --- what the last sync saw -------------------------------------------------
//
// Fetching a page's blocks costs about two seconds; reading its properties is
// nearly free, because they arrive with the list query. So a sync re-renders
// every entry's front matter every time — a relation can go stale without the
// page being touched — and re-fetches a *body* only when Notion says the page
// changed.
//
// Committed rather than cached: it makes a rename visible as a fact (the same
// page id under a new slug) instead of a guess, and it keeps the "a script and
// a commit" fallback working from a clean checkout.

const STATE_FILE = 'data/sync-state.json';

interface EntryState {
  slug: string;
  edited?: string;
  /** Digest of the body we wrote, so an edit made here rather than in Notion is
   *  noticed and refetched instead of quietly kept. */
  hash?: string;
}
type SyncState = Record<string, Record<string, EntryState>>;

const digest = (body: string) => createHash('sha256').update(body).digest('hex').slice(0, 16);

function loadState(): SyncState {
  try { return JSON.parse(readFileSync(STATE_FILE, 'utf8')); } catch { return {}; }
}

/** Sorted at both levels. JSON key order is insertion order, and Notion does
 *  not promise a stable row order — an unsorted file would diff whenever that
 *  shifted, with no page having changed. `git diff --quiet` is the entire
 *  deploy gate, so that would mean a build and a deploy announcing nothing. */
function saveState(state: SyncState) {
  mkdirSync('data', { recursive: true });
  const byKey = (entries: Record<string, EntryState>) =>
    Object.fromEntries(Object.keys(entries).sort().map((id) => [id, entries[id]]));
  const ordered = Object.fromEntries(Object.keys(state).sort().map((k) => [k, byKey(state[k])]));
  writeFileSync(STATE_FILE, JSON.stringify(ordered, null, 2) + '\n');
}

// --- the redirect ledger and the alert file ---------------------------------

/** Every address the site has promised to answer. */
function liveUrlSet(): Set<string> {
  try {
    return new Set(readFileSync('data/live-urls.txt', 'utf8').trim().split('\n').map((l) => l.trim()));
  } catch { return new Set(); }
}

const ALERTS_FILE = 'data/sync-alerts.json';

interface Alert {
  kind: 'unpublished-but-live' | 'published-without-a-slug' | 'image-source-gone';
  section: string;
  title: string;
  url: string;
}

/** What the run wants a person to look at, for the workflow to hand to n8n.
 *
 * A file rather than a webhook call: the sync stays offline-friendly and
 * testable, and the pipeline decides where the message goes.
 *
 * One collection per process but one file for all of them, so a run replaces
 * its own section's entries and leaves the others alone. Written even when
 * there is nothing to say, because something resolved has to be able to
 * disappear — a file that only ever grows is a file nobody reads.
 *
 * Deliberately carries no timestamp: the pipeline deploys only when the sync
 * produced a diff, and a `generated` field would change on every run. */
function writeAlert(section: string, items: Alert[]) {
  mkdirSync('data', { recursive: true });
  let kept: Alert[] = [];
  try {
    kept = (JSON.parse(readFileSync(ALERTS_FILE, 'utf8')).items ?? [])
      .filter((i: { section?: string }) => i.section !== section);
  } catch { /* no file yet — this run writes a fresh one */ }
  const merged = [...kept, ...items].sort((a, b) => (a.kind + a.url).localeCompare(b.kind + b.url));
  writeFileSync(ALERTS_FILE, JSON.stringify({ items: merged }, null, 2) + '\n');
}

const REDIRECTS_FILE = 'data/retired-urls.csv';

interface RedirectRule { from: string; to?: string; kind: '301' | '410' }

/** A URL is a promise, and two ordinary editorial actions break one: renaming a
 *  slug, and taking a page down. Both are recorded here rather than left to be
 *  noticed — `build-redirects.ts` reads this file, so the promise is kept by
 *  the same run that broke it. */
function recordRedirects(rules: RedirectRule[]) {
  if (!rules.length) return;
  const existing = new Map<string, string>();
  try {
    for (const line of readFileSync(REDIRECTS_FILE, 'utf8').trim().split('\n').slice(1)) {
      const [from] = line.split(',');
      if (from) existing.set(from, line);
    }
  } catch { /* first write */ }

  const today = new Date().toISOString().slice(0, 10);
  for (const r of rules) {
    // A later rename wins: /a/ → /b/ → /c/ should send /a/ to /c/, not to a
    // page that has itself moved on.
    existing.set(r.from, `${r.from},${r.kind},${r.to ?? ''},${today}`);
  }
  // And collapse any chain the new rule just created.
  for (const [from, line] of existing) {
    const [, kind, to] = line.split(',');
    if (kind !== '301' || !to) continue;
    const onward = existing.get(to);
    if (onward) {
      const [, k2, t2] = onward.split(',');
      if (k2 === '301' && t2) existing.set(from, `${from},301,${t2},${today}`);
    }
  }
  mkdirSync('data', { recursive: true });
  writeFileSync(REDIRECTS_FILE,
    'from,kind,to,recorded\n' + [...existing.keys()].sort().map((k) => existing.get(k)).join('\n') + '\n');
}

// --- images -----------------------------------------------------------------

const EXT_BY_CT: Record<string, string> = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/gif': 'gif',
  'image/webp': 'webp', 'image/svg+xml': 'svg', 'image/avif': 'avif',
};
function extFromUrl(url: string): string | null {
  const m = url.split('?')[0].match(/\.([a-z0-9]{2,4})$/i);
  return m ? m[1].toLowerCase() : null;
}

const IMG_MAX = 1600;
/** Cap dimensions and recompress so committed source images stay small. */
async function shrinkImage(raw: Buffer, ext: string): Promise<Buffer> {
  if (!['png', 'jpg', 'jpeg', 'webp'].includes(ext)) return raw;
  try {
    let img = sharp(raw, { failOn: 'none' });
    const m = await img.metadata();
    if ((m.width ?? 0) > IMG_MAX || (m.height ?? 0) > IMG_MAX) {
      img = img.resize({ width: IMG_MAX, height: IMG_MAX, fit: 'inside', withoutEnlargement: true });
    }
    img = ext === 'png' ? img.png({ compressionLevel: 9, quality: 80 })
      : ext === 'webp' ? img.webp({ quality: 82 })
      : img.jpeg({ quality: 82, mozjpeg: true });
    const out = await img.toBuffer();
    return out.length < raw.length ? out : raw;
  } catch { return raw; }
}

/** Delete pictures no entry refers to any more. The entry files are the
 *  authority, not this run's bookkeeping: a sync is incremental, so most
 *  entries were not re-rendered and their images must survive. */
function pruneAssets(outDir: string): void {
  const assetDir = `${outDir}/_assets`;
  let files: string[];
  try {
    files = readdirSync(assetDir, { withFileTypes: true }).filter((e) => e.isFile()).map((e) => e.name);
  } catch { return; }
  const referenced = new Set(
    readdirSync(outDir).filter((f) => f.endsWith('.md'))
      .flatMap((f) => assetRefs(readFileSync(`${outDir}/${f}`, 'utf8'))),
  );
  for (const f of files.filter((f) => !referenced.has(f))) {
    unlinkSync(`${assetDir}/${f}`);
    console.log(`  – removed image ${f} (nothing refers to it)`);
  }
}

function existingAsset(dir: string, slug: string, label: string): string | null {
  try { return readdirSync(dir).find((f) => isAssetFor(f, slug, label)) ?? null; } catch { return null; }
}

const strandedImages: { slug: string; label: string; url: string }[] = [];

/** Download an image next to the entry; return the `./` relative path or null.
 *
 * **A download that fails must never remove a picture the site already has.**
 * Going live on the site this came from proved why: eight portraits were
 * external URLs into an old WordPress media library, so the moment the document
 * root swapped they 404'd, and the next sync rewrote every row without a photo
 * — every portrait gone, from a green run that reported success. The bytes were
 * in `_assets` the whole time.
 *
 * So when the source will not answer, the copy from the last good sync stands.
 * That also repairs itself: a row whose photo was dropped gets it back on the
 * next run, because the file on disk outlives the entry that references it. */
async function downloadImage(url: string, ctx: AssetCtx, label: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const raw = Buffer.from(await res.arrayBuffer());
    const ext = extFromUrl(url) ?? EXT_BY_CT[res.headers.get('content-type') ?? ''] ?? 'png';
    const buf = await shrinkImage(raw, ext);
    const name = `${ctx.slug}-${label}.${ext}`;
    mkdirSync(ctx.dir, { recursive: true });
    writeFileSync(`${ctx.dir}/${name}`, buf);
    ctx.count++;
    return `./_assets/${name}`;
  } catch (e: any) {
    const kept = existingAsset(ctx.dir, ctx.slug, label);
    if (kept) {
      console.warn(`    ! image source gone (${label}): ${e.message} — keeping ${kept}`);
      strandedImages.push({ slug: ctx.slug, label, url });
      return `./_assets/${kept}`;
    }
    console.warn(`    ! image download failed (${label}): ${e.message}`);
    return null;
  }
}

const { blocksToMd, seenUnhandled } = createBlocksToMd({
  childrenOf: (id) => childrenOf(id),
  downloadImage: (url, ctx, label) => downloadImage(url, ctx, label),
});

// --- the collections --------------------------------------------------------

interface Helpers {
  text: (n: string) => string;
  multi: (n: string) => string[];
  url: (n: string) => string | undefined;
  date: (n: string) => string | undefined;
  num: (n: string) => number | undefined;
  select: (n: string) => string | undefined;
  /** Slugs of the related pages in another collection, unpublished ones dropped. */
  rel: (n: string, target: string) => string[];
  lines: (n: string) => string[];
}

interface ContentSpec {
  dataSourceId: string;
  /** URL section, so a rename can be turned into a redirect. */
  section: string;
  /** Collections whose slugs this one references, so they are looked up first. */
  needs?: string[];
  extra: (h: Helpers) => string[];
}

/**
 * What is different about each collection — not how to fetch one.
 *
 * This table is the per-site part of an otherwise generic script; see
 * docs/template.md.
 */
const CONTENT_SPECS: Record<string, ContentSpec> = {
  posts: {
    dataSourceId: '3b6001d5-d680-497c-bf95-c51e1f5990a2',
    section: '/blog/',
    extra: (h) => {
      const l: string[] = [];
      const d = h.date('Published'); if (d) l.push(`published: ${d}`);
      const c = h.url('Canonical URL'); if (c) l.push(`canonicalUrl: ${yamlStr(c)}`);
      return l;
    },
  },
  talks: {
    dataSourceId: '7e42a0a2-5318-481b-8519-15c00392428c',
    section: '/talks/',
    extra: (h) => {
      const l: string[] = [];
      // The only thing that decides upcoming versus past. There is deliberately
      // no second property to disagree with it.
      const d = h.date('Date'); if (d) l.push(`date: ${d}`);
      const e = h.text('Event'); if (e) l.push(`event: ${yamlStr(e)}`);
      const loc = h.text('Location'); if (loc) l.push(`location: ${yamlStr(loc)}`);
      const v = h.url('Video URL'); if (v) l.push(`videoUrl: ${yamlStr(v)}`);
      const s = h.url('Slides URL'); if (s) l.push(`slidesUrl: ${yamlStr(s)}`);
      return l;
    },
  },
  training: {
    dataSourceId: 'd3778874-6b92-43e2-8e8e-e362e57e337c',
    section: '/training/',
    extra: (h) => {
      const l: string[] = [];
      const o = h.num('Order'); if (o != null) l.push(`order: ${o}`);
      const f = h.multi('Format'); if (f.length) l.push(`format: ${yamlList(f)}`);
      const d = h.text('Duration'); if (d) l.push(`duration: ${yamlStr(d)}`);
      const a = h.text('Audience'); if (a) l.push(`audience: ${yamlStr(a)}`);
      const out = h.lines('Outcomes'); if (out.length) l.push(`outcomes: ${yamlList(out)}`);
      return l;
    },
  },
  'learning-journeys': {
    dataSourceId: 'd8dc5950-4492-4e58-a71a-b43f035fa88d',
    section: '/learning-journeys/',
    needs: ['training', 'talks', 'posts'],
    extra: (h) => {
      const l: string[] = [];
      const o = h.num('Order'); if (o != null) l.push(`order: ${o}`);
      const s = h.text('Summary'); if (s) l.push(`summary: ${yamlStr(s)}`);
      const sp = h.text('Starting point'); if (sp) l.push(`startingPoint: ${yamlStr(sp)}`);
      const oc = h.text('Outcome'); if (oc) l.push(`outcome: ${yamlStr(oc)}`);
      for (const [prop, target] of [['Training', 'training'], ['Talks', 'talks'], ['Posts', 'posts']] as const) {
        const refs = h.rel(prop, target);
        if (refs.length) l.push(`${target}: ${yamlList(refs)}`);
      }
      return l;
    },
  },
};

/** Directory under src/content/ for a collection key. */
const dirFor = (key: string) => `src/content/${key}`;

/** The featured image and body of an entry already on disk, so an unchanged
 *  page costs no API calls at all. */
function readExisting(path: string): { featured?: string; body: string } | null {
  try {
    const raw = readFileSync(path, 'utf8');
    const m = raw.match(/^---\n([\s\S]*?)\n---\n\n?([\s\S]*)$/);
    if (!m) return null;
    return { featured: m[1].match(/^featuredImage: "(.*)"$/m)?.[1], body: m[2].replace(/\n+$/, '') };
  } catch { return null; }
}

/** slug of every *published* page in a collection, by Notion page id, so a
 *  relation can be resolved to something that will actually have a URL. */
async function slugLookup(key: string): Promise<Map<string, string>> {
  const spec = CONTENT_SPECS[key];
  const map = new Map<string, string>();
  try {
    for (const p of await queryAll(spec.dataSourceId)) {
      if (statusOf(p, 'select') !== 'Published') continue;
      const slug = (p.properties?.Slug?.rich_text ?? []).map((t: any) => t.plain_text).join('').trim();
      if (slug) map.set((p.id as string).replace(/-/g, ''), slug);
    }
  } catch (e: any) {
    console.warn(`  ! ${key} not readable (${e.code ?? e.message}); relations to it left unresolved.`);
  }
  return map;
}

async function runContent(
  key: string, outDir: string, write: boolean, full: boolean, strict: boolean, drafts: boolean,
) {
  const spec = CONTENT_SPECS[key];
  if (!spec) { console.error(`unknown collection: ${key}`); process.exit(1); }

  // Relations resolve to slugs, and only a *published* page has one. Anything
  // else is dropped and reported rather than silently written — Astro's
  // `reference()` fails the build on a slug with no page.
  const lookups = new Map<string, Map<string, string>>();
  for (const need of spec.needs ?? []) {
    console.log(`  building ${need} lookup…`);
    lookups.set(need, await slugLookup(need));
  }
  /** Relations that pointed at nothing renderable. */
  const dropped: { slug: string; prop: string; ref: string }[] = [];

  const state = loadState();
  const was = state[key] ?? {};
  const now: Record<string, EntryState> = {};
  const renamed: { from: string; to: string }[] = [];
  const retired: string[] = [];
  const quarantined: { url: string; title: string }[] = [];
  const unrenderable: { url: string; title: string }[] = [];
  const edited: string[] = [];
  let reused = 0;

  const allRows = await queryAll(spec.dataSourceId);
  // `--drafts` pulls everything, published or not, so the site can be worked on
  // locally while the content is still being edited in Notion. It is safe
  // because *nothing renders a draft in a production build*: every route
  // filters on `isVisible` in src/lib/collections.ts, which lets a draft
  // through only under `astro dev`. CI never passes this flag.
  const pages = drafts
    ? allRows.filter((p) => statusOf(p, 'select') !== '')
    : allRows.filter((p) => statusOf(p, 'select') === 'Published');
  const withdrawn = new Map<string, { title: string; retire: boolean }>(
    allRows.filter((p) => !pages.includes(p)).map((p) => [
      (p.id as string).replace(/-/g, ''),
      { title: plainTitle(p, 'Title'), retire: p.properties?.['Retire URL']?.checkbox === true },
    ]),
  );

  const assetDir = `${outDir}/_assets`;
  mkdirSync(outDir, { recursive: true });
  console.log(
    `${key}: ${pages.length}${drafts ? ' (drafts included)' : ' published'} of ${allRows.length} -> ${outDir}\n`,
  );

  /** filename -> contents, written in one go once every page has rendered. */
  const rendered = new Map<string, string>();

  for (const page of pages) {
    const P = page.properties;
    const get = (n: string) => P[n];
    const slug = (get('Slug')?.rich_text ?? []).map((t: any) => t.plain_text).join('').trim();
    const title = plainTitle(page, 'Title');

    // Published in Notion, but with nowhere to live. Skipping is right — there
    // is no address to build — but silently skipping is not: the editor thinks
    // this is on the site, and only they can give it a slug.
    if (!slug) {
      console.log(`  ! no slug, skipping "${title}"`);
      unrenderable.push({ title, url: page.url });
      continue;
    }

    const ctx: AssetCtx = { dir: assetDir, slug, count: 0 };
    const relIds = (n: string) => (get(n)?.relation ?? []).map((r: any) => r.id.replace(/-/g, ''));

    const h: Helpers = {
      // Decoded for the same reason a title is: the import left character
      // references in a handful of SEO fields, and a `&amp;` in a meta
      // description is a `&amp;` in a search result. See notion-md.ts.
      text: (n) => decodeEntities((get(n)?.rich_text ?? []).map((t: any) => t.plain_text).join('')).trim(),
      multi: (n) => (get(n)?.multi_select ?? []).map((o: any) => o.name),
      url: (n) => get(n)?.url || undefined,
      date: (n) => get(n)?.date?.start ?? undefined,
      num: (n) => (typeof get(n)?.number === 'number' ? get(n).number : undefined),
      select: (n) => get(n)?.select?.name ?? undefined,
      // One outcome per line, which is how an editor naturally writes a list
      // into a text property.
      lines: (n) => decodeEntities((get(n)?.rich_text ?? []).map((t: any) => t.plain_text).join(''))
        .split('\n').map((s: string) => s.trim()).filter(Boolean),
      rel: (n, target) => relIds(n).flatMap((id: string) => {
        const found = lookups.get(target)?.get(id);
        if (found) return [found];
        dropped.push({ slug, prop: n, ref: `unpublished or unknown ${id.slice(0, 8)}…` });
        return [];
      }),
    };

    const id = (page.id as string).replace(/-/g, '');
    const before = was[id];
    const editedAt = page.last_edited_time as string;
    const previous = before && !full ? readExisting(`${outDir}/${before.slug}.md`) : null;
    // Reuse the body only if Notion says the page has not changed *and* the
    // file is still the one we wrote. A missing digest means we cannot vouch
    // for what is on disk, so we refetch rather than trust it — a guard that
    // trusts by default is a decoration.
    const untouched = !!previous && !!before!.hash && digest(previous.body) === before!.hash;
    const unchanged = !!previous && before!.edited === editedAt && untouched;
    if (previous && before?.edited === editedAt && !untouched) {
      edited.push(`${outDir}/${before.slug}.md`);
    }
    if (before && before.slug !== slug) renamed.push({ from: before.slug, to: slug });
    now[id] = { slug, edited: editedAt, hash: '' };

    const fm: string[] = ['---'];
    fm.push(`title: ${yamlStr(title)}`);
    fm.push(`slug: ${yamlStr(slug)}`);
    fm.push(`status: ${yamlStr(statusOf(page, 'select'))}`);
    const tags = normaliseTags(h.multi('Tags'));
    if (tags.length) fm.push(`tags: ${yamlList(tags)}`);
    const seoTitle = h.text('SEO Title'); if (seoTitle) fm.push(`seoTitle: ${yamlStr(seoTitle)}`);
    const seoDesc = h.text('SEO Description'); if (seoDesc) fm.push(`seoDescription: ${yamlStr(seoDesc)}`);
    fm.push(...spec.extra(h));

    const featuredRel = unchanged
      ? previous!.featured
      : await (async () => {
          const u = fileUrl((get('Cover')?.files ?? [])[0]);
          return u ? await downloadImage(u, ctx, 'featured') : null;
        })();
    if (featuredRel) fm.push(`featuredImage: ${yamlStr(featuredRel)}`);
    fm.push('---');

    const body = unchanged ? previous!.body : await blocksToMd(await childrenOf(page.id), ctx);
    if (unchanged) reused++;
    // Trailing blank lines are normalised here rather than in either branch, so
    // a fetched body and a reused body are byte-identical. Without this a
    // changed page flip-flops between syncs and "no diff, no deploy" quietly
    // becomes false.
    const finalBody = body.replace(/\n+$/, '');
    now[id].hash = digest(finalBody);
    rendered.set(`${slug}.md`, `${fm.join('\n')}\n\n${finalBody}\n`);
    if (!unchanged) console.log(`  ✓ ${slug}.md (${body.length}c, ${ctx.count} imgs)`);
  }

  // Write only once every page has rendered. A rate-limit or network failure
  // half way through must not leave src/content/ in a state worth committing.
  for (const [name, content] of rendered) writeFileSync(`${outDir}/${name}`, content);

  // A page that stops being published is three different situations, and only
  // the editor knows which. `Retire URL` is where they say so.
  //
  //   ticked      → they mean it. Delete the page and answer 410 Gone.
  //   not ticked  → keep serving it and tell somebody. An accidental unpublish
  //                 must not quietly 404 an address others have linked to, and
  //                 it must not block everyone else's publishing either.
  //   never live  → nothing to protect; just remove the file.
  const contract = liveUrlSet();
  const stale = readdirSync(outDir).filter((f) => f.endsWith('.md') && !rendered.has(f));
  for (const f of stale) {
    const gone = f.replace(/\.md$/, '');
    const url = `${spec.section}${gone}/`;
    const id = Object.keys(was).find((k) => was[k].slug === gone);
    const row = id ? withdrawn.get(id) : undefined;

    if (row?.retire || !contract.has(url)) {
      unlinkSync(`${outDir}/${f}`);
      if (contract.has(url)) {
        retired.push(url);
        console.log(`  – removed ${f} — retired on purpose, will answer 410`);
      } else {
        console.log(`  – removed ${f} (never had a public URL)`);
      }
      continue;
    }
    quarantined.push({ url, title: row?.title ?? gone });
    rendered.set(f, readFileSync(`${outDir}/${f}`, 'utf8'));
    if (id) now[id] = was[id];
    console.log(`  ! ${f} is no longer published in Notion but ${url} is a live URL — still serving it`);
  }
  pruneAssets(outDir); // after the entries, so a quarantined page keeps its pictures

  if (reused) console.log(`  · ${reused} unchanged, body reused (no fetch)`);

  if (edited.length) {
    console.log(`\n  ! ${edited.length} generated file(s) had been changed by hand; refetched from Notion:`);
    for (const f of edited) console.log(`      ${f}`);
    console.log('    Notion is the source of truth. Make the change there.');
  }
  if (renamed.length) {
    console.log(`\n  ! ${renamed.length} slug(s) changed, which changes a URL:`);
    for (const r of renamed) console.log(`      ${spec.section}${r.from}/ → ${spec.section}${r.to}/`);
    if (write) {
      recordRedirects(renamed.map((r) => ({
        from: `${spec.section}${r.from}/`, to: `${spec.section}${r.to}/`, kind: '301' as const,
      })));
      console.log('    Recorded in data/retired-urls.csv; the old address will 301 to the new one.');
    }
  }
  if (retired.length && write) {
    recordRedirects(retired.map((from) => ({ from, kind: '410' as const })));
    console.log(`\n  ${retired.length} address(es) retired; recorded as Gone.`);
  }
  if (quarantined.length) {
    console.log(`\n  ! ${quarantined.length} page(s) unpublished in Notion without "Retire URL" ticked.`);
    console.log('    They are still being served, and nothing is blocked. Either republish them,');
    console.log('    or tick Retire URL to take the address down properly:');
    for (const q of quarantined) console.log(`      ${q.url}  (${q.title})`);
  }
  if (unrenderable.length) {
    console.log(`\n  ! ${unrenderable.length} page(s) published with no slug, so they have no address:`);
    for (const u of unrenderable) console.log(`      ${u.title}  ${u.url}`);
  }
  if (dropped.length) {
    console.log(`\n  i ${dropped.length} relation(s) point at a page that is not published; the link`);
    console.log('    will appear by itself once it is:');
    for (const d of dropped.slice(0, 20)) console.log(`      ${d.slug} → ${d.prop}: ${d.ref}`);
    if (dropped.length > 20) console.log(`      … and ${dropped.length - 20} more`);
    if (strict) { console.error('\n  --strict: failing because of the relations above.'); process.exit(1); }
  }

  // Unconditional, so resolving the last alert empties the list rather than
  // leaving a stale one the pipeline keeps raising.
  if (write) {
    writeAlert(spec.section, [
      ...quarantined.map((q) => ({ kind: 'unpublished-but-live' as const, section: spec.section, title: q.title, url: q.url })),
      ...unrenderable.map((u) => ({ kind: 'published-without-a-slug' as const, section: spec.section, title: u.title, url: u.url })),
      ...strandedImages.map((s) => ({
        kind: 'image-source-gone' as const, section: spec.section, title: `${s.slug} (${s.label})`, url: s.url,
      })),
    ]);
    state[key] = now;
    saveState(state);
  }

  if (seenUnhandled.size) console.log(`\n  unhandled block types seen: ${[...seenUnhandled].join(', ')}`);
  if (!write) console.log(`\n  (preview only — files in ${outDir}, nothing under src/content/)`);
}

// --- dispatch ---------------------------------------------------------------

const argOf = (n: string) => process.argv.find((a) => a.startsWith(`--${n}=`))?.split('=')[1];

async function run() {
  const command = process.argv[2];
  const write = process.argv.includes('--write');
  const full = process.argv.includes('--full');
  const strict = process.argv.includes('--strict');
  const drafts = process.argv.includes('--drafts');

  if (command !== 'content') {
    console.error(
      'usage: tsx scripts/sync-notion.ts content --collection=<name> [--write] [--full] [--strict] [--drafts]',
    );
    console.error(`  collections: ${Object.keys(CONTENT_SPECS).join(', ')}`);
    process.exit(1);
  }
  const key = argOf('collection');
  if (!key) { console.error('--collection is required'); process.exit(1); }
  const outDir = write ? dirFor(key) : `preview/${key}`;
  await runContent(key, outDir, write, full, strict, drafts);
}

await run();
