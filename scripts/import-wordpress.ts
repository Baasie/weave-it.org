/**
 * One-shot migration: WordPress → Notion.
 *
 * **This is a migration tool, not a sync.** It runs a handful of times during
 * the move and is then deleted. Nothing reads WordPress after cutover, and
 * nothing here must ever be wired into a schedule — a tool that keeps pushing
 * into the source of truth goes stale the moment an editor improves something
 * there, and nothing in the tool can tell.
 *
 * Two halves, deliberately separable:
 *
 *   extract   read the (open) WP REST API, convert to markdown, write to
 *             wordpress-export/ for a person to look at. Needs no credentials
 *             and touches nothing.
 *   load      create Notion pages from that. Needs NOTION_TOKEN and the
 *             database ids. Phase 3b of MIGRATION.md.
 *
 * Extract first and *read the output*. The blog posts are ordinary post content
 * and come across cleanly; the training and consultancy pages are Divi layouts,
 * so they arrive as structure-flavoured soup and are a rewrite that starts from
 * an import rather than an import. Knowing which is which before loading
 * anything is the whole point of the split.
 *
 *   npx tsx scripts/import-wordpress.ts extract
 *   npx tsx scripts/import-wordpress.ts extract --type=pages
 *   npx tsx scripts/import-wordpress.ts attachments wordpress-export/<file>.xml
 */
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const WP = 'https://weave-it.org/wp-json/wp/v2';
const OUT = 'wordpress-export';

/** The two categories that split one WordPress post type into two collections. */
const CATEGORY = { blog: 49, talks: 5 } as const;

interface WpItem {
  id: number;
  date: string;
  modified: string;
  slug: string;
  link: string;
  status: string;
  title: { rendered: string };
  content: { rendered: string };
  excerpt: { rendered: string };
  categories?: number[];
  tags?: number[];
  featured_media?: number;
  yoast_head_json?: { title?: string; description?: string; og_image?: { url: string }[] };
}

const arg = (name: string, fallback = '') =>
  process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=')[1] ?? fallback;

async function getAll(type: string): Promise<WpItem[]> {
  const out: WpItem[] = [];
  for (let page = 1; ; page++) {
    const res = await fetch(`${WP}/${type}?per_page=100&page=${page}&_embed=wp:term`);
    if (res.status === 400) break; // WordPress says "no such page" once it runs out
    if (!res.ok) throw new Error(`${type} page ${page}: ${res.status}`);
    const batch = (await res.json()) as WpItem[];
    out.push(...batch);
    const total = Number(res.headers.get('x-wp-totalpages') ?? 1);
    if (page >= total) break;
  }
  return out;
}

/** Tag and category names, so the export carries words rather than numeric ids. */
async function termNames(taxonomy: string): Promise<Map<number, string>> {
  const res = await fetch(`${WP}/${taxonomy}?per_page=100&_fields=id,name,slug`);
  const terms = (await res.json()) as { id: number; name: string; slug: string }[];
  return new Map(terms.map((t) => [t.id, t.name]));
}

/**
 * HTML → markdown, well enough to read and to paste.
 *
 * Deliberately not a general converter. It handles what WordPress and Divi
 * actually emit on this site, and leaves anything it does not recognise as
 * HTML rather than guessing — a wrong conversion is harder to spot than a
 * visible tag, and every one of these pages gets human eyes before it is
 * published.
 */
function toMarkdown(html: string): string {
  let s = html;

  // Divi wraps everything in nested layout divs that carry no meaning once the
  // page is prose. Strip the wrappers, keep what was inside them.
  s = s.replace(/<div[^>]*class="[^"]*et_pb_[^"]*"[^>]*>/g, '\n');
  s = s.replace(/<\/div>/g, '\n');

  s = s.replace(/<script[\s\S]*?<\/script>/g, '');
  s = s.replace(/<style[\s\S]*?<\/style>/g, '');

  s = s.replace(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/g, (_, n: string, t: string) =>
    `\n\n${'#'.repeat(Number(n))} ${t.trim()}\n\n`,
  );
  s = s.replace(/<(strong|b)[^>]*>([\s\S]*?)<\/\1>/g, '**$2**');
  s = s.replace(/<(em|i)[^>]*>([\s\S]*?)<\/\1>/g, '_$2_');
  s = s.replace(/<code[^>]*>([\s\S]*?)<\/code>/g, '`$1`');
  s = s.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/g, (_, t: string) =>
    `\n\n> ${t.replace(/\n+/g, ' ').trim()}\n\n`,
  );
  s = s.replace(/<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/g, '[$2]($1)');
  s = s.replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*>/g, '\n\n![$2]($1)\n\n');
  s = s.replace(/<img[^>]*src="([^"]*)"[^>]*>/g, '\n\n![]($1)\n\n');
  s = s.replace(/<li[^>]*>([\s\S]*?)<\/li>/g, (_, t: string) => `\n- ${t.trim()}`);
  s = s.replace(/<\/?(ul|ol)[^>]*>/g, '\n');
  s = s.replace(/<p[^>]*>/g, '\n\n').replace(/<\/p>/g, '\n\n');
  s = s.replace(/<br\s*\/?>/g, '  \n');
  s = s.replace(/<\/?(span|figure|figcaption|section|article|header|footer)[^>]*>/g, '');

  // Entities WordPress emits routinely. Ampersand last, or it re-decodes the
  // ones above into something else entirely.
  const entities: [RegExp, string][] = [
    [/&nbsp;/g, ' '],
    [/&#8217;|&rsquo;/g, '’'],
    [/&#8216;|&lsquo;/g, '‘'],
    [/&#8220;|&ldquo;/g, '“'],
    [/&#8221;|&rdquo;/g, '”'],
    [/&#8211;|&ndash;/g, '–'],
    [/&#8212;|&mdash;/g, '—'],
    [/&#8230;|&hellip;/g, '…'],
    [/&lt;/g, '<'],
    [/&gt;/g, '>'],
    [/&quot;/g, '"'],
    [/&amp;/g, '&'],
  ];
  for (const [re, to] of entities) s = s.replace(re, to);

  return s.replace(/\n{3,}/g, '\n\n').trim();
}

/** What the site publishes at this address today, so nothing is guessed later. */
function frontMatter(item: WpItem, collection: string, tags: string[]): string {
  const q = (v: string) => `"${v.replace(/"/g, '\\"')}"`;
  const lines = [
    '---',
    `collection: ${collection}`,
    `title: ${q(item.title.rendered)}`,
    `slug: ${q(item.slug)}`,
    // The address WordPress serves. This is the promise the rebuild inherits,
    // and it is the reason the slug is carried rather than regenerated from
    // the title — a title tidied up in Notion must not move the page.
    `sourceUrl: ${q(item.link)}`,
    `date: ${q(item.date)}`,
    `modified: ${q(item.modified)}`,
    `status: ${q(item.status)}`,
    tags.length ? `tags: [${tags.map(q).join(', ')}]` : 'tags: []',
  ];
  if (item.yoast_head_json?.title) lines.push(`seoTitle: ${q(item.yoast_head_json.title)}`);
  if (item.yoast_head_json?.description)
    lines.push(`seoDescription: ${q(item.yoast_head_json.description)}`);
  const og = item.yoast_head_json?.og_image?.[0]?.url;
  if (og) lines.push(`image: ${q(og)}`);
  lines.push('---', '');
  return lines.join('\n');
}

async function extract() {
  const only = arg('type');
  const tagNames = await termNames('tags');

  const posts = only && only !== 'posts' ? [] : await getAll('posts');
  const pages = only && only !== 'pages' ? [] : await getAll('pages');

  const buckets = new Map<string, WpItem[]>([
    ['posts', posts.filter((p) => p.categories?.includes(CATEGORY.blog))],
    ['talks', posts.filter((p) => p.categories?.includes(CATEGORY.talks))],
    // Training is a page whose path sits under /training/. The index itself is
    // not a course, so it is left with the standalone pages.
    ['training', pages.filter((p) => /^\/training\/.+/.test(new URL(p.link).pathname))],
    ['pages', pages.filter((p) => !/^\/training\/.+/.test(new URL(p.link).pathname))],
  ]);

  let total = 0;
  const suspect: string[] = [];

  for (const [collection, items] of buckets) {
    if (!items.length) continue;
    const dir = join(OUT, collection);
    mkdirSync(dir, { recursive: true });

    for (const item of items) {
      const tags = (item.tags ?? []).map((id) => tagNames.get(id)).filter(Boolean) as string[];
      const body = toMarkdown(item.content.rendered);
      writeFileSync(join(dir, `${item.slug}.md`), frontMatter(item, collection, tags) + body + '\n');
      total++;

      // Say which ones will need real editing rather than leaving it to be
      // discovered one page at a time. A Divi layout that survives the strip
      // above still carries its class names, and a page that converts to almost
      // nothing converted to nothing useful.
      if (/et_pb_|\[et_pb/.test(body)) suspect.push(`${collection}/${item.slug} — Divi markup survived`);
      else if (body.length < 400) suspect.push(`${collection}/${item.slug} — only ${body.length} chars`);
    }
    console.log(`  ${collection.padEnd(9)} ${items.length}`);
  }

  console.log(`\nextracted ${total} item(s) to ${OUT}/`);
  if (suspect.length) {
    console.log(`\n${suspect.length} need a person before they are loaded:`);
    for (const s of suspect) console.log(`  ${s}`);
  }
  console.log('\nRead the output before loading anything into Notion.');
}

/**
 * Mine the XML export for what the REST API cannot show.
 *
 * The REST API lists what is *published*. The export carries drafts, the media
 * library and — the one that mattered — the 97 **attachment pages**: a page per
 * uploaded file, at a root-level slug like `/tech-03/`, in no sitemap, and all
 * of them live. The first URL inventory missed every one.
 *
 * Writes `data/attachment-pages.csv`, which `build-redirects.ts` turns into 97
 * rules. Frozen once written: WordPress is going away and these addresses are
 * not going to grow.
 *
 * Parsed with regular expressions rather than an XML library on purpose. This
 * is a one-shot tool reading one known file, the shape of a WXR `<item>` is
 * fixed, and adding a parser dependency to the site's package.json for a script
 * that gets deleted is the wrong trade.
 *
 *   npx tsx scripts/import-wordpress.ts attachments wordpress-export/<file>.xml
 */
function attachments(xmlPath: string) {
  const xml = readFileSync(xmlPath, 'utf8');
  const items = xml.split('<item>').slice(1);
  const pick = (block: string, tag: string) =>
    block.match(new RegExp(`<${tag}>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?</${tag}>`))?.[1]?.trim() ?? '';

  const rows: [string, string][] = [];
  let drafts = 0;
  for (const block of items) {
    const type = pick(block, 'wp:post_type');
    if (pick(block, 'wp:status') === 'draft' && (type === 'post' || type === 'page')) drafts++;
    if (type !== 'attachment') continue;
    const page = pick(block, 'link');
    const file = pick(block, 'wp:attachment_url');
    if (!page || !file) continue;
    // The slug of the attachment *page*, and the path of the file it points at.
    // There is no derivable relationship between them — `/tech-03/` lives under
    // `2023/08/` — which is why this has to be data.
    rows.push([new URL(page).pathname.replace(/^\/|\/$/g, ''), new URL(file).pathname]);
  }
  // Plain codepoint order, not localeCompare: this file is committed and a test
  // compares it, and localeCompare answers differently depending on the
  // runtime's ICU locale — which would make the file "changed" on a machine
  // that merely has a different one.
  rows.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));

  mkdirSync('data', { recursive: true });
  writeFileSync(
    join('data', 'attachment-pages.csv'),
    'slug,file\n' + rows.map(([s, f]) => `${s},${f}`).join('\n') + '\n',
  );
  console.log(`attachments: ${rows.length} page(s) -> data/attachment-pages.csv`);
  console.log(`  add each as /<slug>/ to data/live-urls.txt, then \`npm run redirects\``);
  console.log(`  the files they point at belong in public/wp-content/uploads/ — see docs/urls.md`);
  if (drafts) console.log(`\n${drafts} draft(s) in the export that the REST API never showed. Worth reading.`);
}

// ---------------------------------------------------------------------------
// load — the export into Notion
// ---------------------------------------------------------------------------

/**
 * Where each extracted directory lands. `pages/` is deliberately absent: the
 * six standalone pages become hand-authored `.astro`, not Notion rows, because
 * a page with one-off layout is code and pretending otherwise gives an editor a
 * body they cannot safely change.
 */
const DATA_SOURCES: Record<string, string> = {
  posts: '3b6001d5-d680-497c-bf95-c51e1f5990a2',
  talks: '7e42a0a2-5318-481b-8519-15c00392428c',
  training: 'd3778874-6b92-43e2-8e8e-e362e57e337c',
};

interface FrontMatter {
  [k: string]: string | string[];
}

/** Split `---` front matter from the body. Written by `extract`, so the shape is ours. */
function parseFrontMatter(text: string): { fm: FrontMatter; body: string } {
  const m = text.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) return { fm: {}, body: text };
  const fm: FrontMatter = {};
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^(\w+):\s*(.*)$/);
    if (!kv) continue;
    const [, k, raw] = kv;
    if (raw.startsWith('[')) {
      fm[k] = [...raw.matchAll(/"((?:[^"\\]|\\.)*)"/g)].map((x) => x[1].replace(/\\"/g, '"'));
    } else {
      fm[k] = raw.replace(/^"|"$/g, '').replace(/\\"/g, '"');
    }
  }
  return { fm, body: m[2] };
}

const str = (fm: FrontMatter, k: string): string =>
  typeof fm[k] === 'string' ? (fm[k] as string) : '';

/**
 * Inline markdown → Notion rich text.
 *
 * Links, bold, italic and code, which is everything `toMarkdown` emits. Notion
 * caps a single rich-text element at 2000 characters, so long runs are split —
 * a limit that is invisible until one post in fifty silently loses its tail.
 */
function richText(md: string): object[] {
  const out: object[] = [];
  const push = (content: string, annotations: object = {}, link: string | null = null) => {
    for (let i = 0; i < content.length; i += 1900) {
      out.push({
        type: 'text',
        text: { content: content.slice(i, i + 1900), link: link ? { url: link } : null },
        annotations,
      });
    }
  };

  const token = /\[([^\]]*)\]\(([^)]+)\)|\*\*([^*]+)\*\*|_([^_]+)_|`([^`]+)`/g;
  let last = 0;
  for (const m of md.matchAll(token)) {
    if (m.index! > last) push(md.slice(last, m.index));
    if (m[1] !== undefined) {
      // A relative or malformed href is not a link Notion will accept, and it
      // rejects the whole block rather than the property. Keep the words.
      const href = m[2].trim();
      if (/^https?:\/\//.test(href)) push(m[1], {}, href);
      else push(m[1]);
    } else if (m[3] !== undefined) push(m[3], { bold: true });
    else if (m[4] !== undefined) push(m[4], { italic: true });
    else if (m[5] !== undefined) push(m[5], { code: true });
    last = m.index! + m[0].length;
  }
  if (last < md.length) push(md.slice(last));
  return out.length ? out : [{ type: 'text', text: { content: '' } }];
}

/** Markdown → Notion blocks. Handles what `toMarkdown` emits, and nothing else. */
function toBlocks(body: string): object[] {
  const blocks: object[] = [];
  for (const raw of body.split(/\n{2,}/)) {
    const chunk = raw.trim();
    if (!chunk) continue;

    const heading = chunk.match(/^(#{1,3})\s+(.*)$/s);
    if (heading) {
      const level = heading[1].length as 1 | 2 | 3;
      blocks.push({
        type: `heading_${level}`,
        [`heading_${level}`]: { rich_text: richText(heading[2].replace(/\n/g, ' ')) },
      });
      continue;
    }

    const image = chunk.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (image && /^https?:\/\//.test(image[2])) {
      // External rather than uploaded, and this is the one place the "upload,
      // never link" rule bends — on purpose. These URLs point at
      // wp-content/uploads, and those 103 files are now committed under
      // public/ and served by this site. It is no longer somebody else's
      // uptime; it is ours. Anything Kenny adds later still gets uploaded.
      blocks.push({ type: 'image', image: { type: 'external', external: { url: image[2] } } });
      continue;
    }

    if (chunk.startsWith('> ')) {
      blocks.push({
        type: 'quote',
        quote: { rich_text: richText(chunk.replace(/^> ?/gm, '').replace(/\n/g, ' ')) },
      });
      continue;
    }

    if (/^- /.test(chunk)) {
      for (const item of chunk.split('\n')) {
        const t = item.replace(/^-\s*/, '').trim();
        if (t) {
          blocks.push({
            type: 'bulleted_list_item',
            bulleted_list_item: { rich_text: richText(t) },
          });
        }
      }
      continue;
    }

    blocks.push({ type: 'paragraph', paragraph: { rich_text: richText(chunk.replace(/\n/g, ' ')) } });
  }
  return blocks;
}

/** Properties for a row, from the front matter `extract` wrote. */
function propertiesFor(collection: string, fm: FrontMatter): Record<string, unknown> {
  const text = (v: string) => (v ? [{ type: 'text', text: { content: v.slice(0, 1900) } }] : []);
  const props: Record<string, unknown> = {
    Title: { title: text(str(fm, 'title')) },
    Slug: { rich_text: text(str(fm, 'slug')) },
    // Never Published. Nothing publishes itself: the whole point of the pass in
    // phase 3c is that a person looks at each page before it has an address.
    Status: { select: { name: 'Idea' } },
    'SEO Title': { rich_text: text(str(fm, 'seoTitle')) },
    'SEO Description': { rich_text: text(str(fm, 'seoDescription')) },
  };

  const tags = Array.isArray(fm.tags) ? fm.tags : [];
  if (tags.length) {
    // Notion rejects a multi-select option containing a comma, and silently
    // mangles nothing else — so the whole row fails on one badly-named tag.
    props.Tags = { multi_select: tags.filter(Boolean).map((name) => ({ name: name.replace(/,/g, ' ') })) };
  }

  const date = str(fm, 'date').slice(0, 10);
  if (date) {
    if (collection === 'posts') props.Published = { date: { start: date } };
    if (collection === 'talks') props.Date = { date: { start: date } };
  }

  const cover = str(fm, 'image');
  if (cover) {
    props.Cover = {
      files: [{ type: 'external', name: cover.split('/').pop() ?? 'cover', external: { url: cover } }],
    };
  }
  return props;
}

/**
 * Create a Notion page per extracted file.
 *
 * Re-runnable: it reads the slugs already in each database first and skips
 * them, so a run that dies half way through is fixed by running it again
 * rather than by deleting rows. That matters more than it sounds — the failure
 * mode without it is 25 duplicate posts and no way to tell which is which.
 *
 *   npx tsx scripts/import-wordpress.ts load --dry-run
 *   npx tsx scripts/import-wordpress.ts load
 *   npx tsx scripts/import-wordpress.ts load --collection=posts
 */
async function load() {
  const dry = process.argv.includes('--dry-run');
  const only = arg('collection');

  const token = process.env.NOTION_TOKEN;
  if (!token && !dry) {
    console.error('load: NOTION_TOKEN is not set.');
    console.error('  Create an internal integration at notion.so/my-integrations,');
    console.error('  then share each of the four databases with it (••• → Connections).');
    console.error('  Put it in local.env, which is gitignored.');
    process.exit(1);
  }

  const { Client } = await import('@notionhq/client');
  const notion = new Client({ auth: token ?? 'dry-run' });

  for (const [collection, dataSourceId] of Object.entries(DATA_SOURCES)) {
    if (only && only !== collection) continue;

    let files: string[];
    try {
      files = readdirSync(join(OUT, collection)).filter((f) => f.endsWith('.md')).sort();
    } catch {
      console.log(`${collection}: nothing extracted, skipping.`);
      continue;
    }

    // What is already there, so a second run is a no-op rather than a mess.
    const existing = new Set<string>();
    if (!dry) {
      let cursor: string | undefined;
      do {
        const page: any = await (notion as any).dataSources.query({
          data_source_id: dataSourceId,
          start_cursor: cursor,
        });
        for (const row of page.results) {
          const slug = row.properties?.Slug?.rich_text?.[0]?.plain_text;
          if (slug) existing.add(slug);
        }
        cursor = page.has_more ? page.next_cursor : undefined;
      } while (cursor);
    }

    let created = 0;
    let skipped = 0;
    for (const file of files) {
      const { fm, body } = parseFrontMatter(readFileSync(join(OUT, collection, file), 'utf8'));
      const slug = str(fm, 'slug') || file.replace(/\.md$/, '');
      if (existing.has(slug)) {
        skipped++;
        continue;
      }

      const blocks = toBlocks(body);
      if (dry) {
        console.log(`  would create ${collection}/${slug}  (${blocks.length} blocks)`);
        created++;
        continue;
      }

      // Notion accepts 100 children on create; the rest are appended.
      const page: any = await (notion as any).pages.create({
        parent: { type: 'data_source_id', data_source_id: dataSourceId },
        properties: propertiesFor(collection, fm) as any,
        children: blocks.slice(0, 100) as any,
      });
      for (let i = 100; i < blocks.length; i += 100) {
        await (notion as any).blocks.children.append({
          block_id: page.id,
          children: blocks.slice(i, i + 100) as any,
        });
      }
      created++;
      console.log(`  ${collection}/${slug}  (${blocks.length} blocks)`);
      // Notion's published limit is ~3 requests a second, averaged.
      await new Promise((r) => setTimeout(r, 350));
    }
    console.log(`${collection}: ${created} created, ${skipped} already there\n`);
  }

  if (dry) console.log('Dry run. Nothing was written to Notion.');
  else console.log('Everything landed as Status = Idea. Nothing publishes itself.');
}

const command = process.argv[2];
if (command === 'extract') await extract();
else if (command === 'attachments') {
  const xml = process.argv[3];
  if (!xml) {
    console.error('usage: tsx scripts/import-wordpress.ts attachments <export.xml>');
    process.exit(1);
  }
  attachments(xml);
} else if (command === 'load') await load();
else {
  console.error(
    'usage: tsx scripts/import-wordpress.ts <extract|attachments|load> [options]\n' +
      '  extract      [--type=posts|pages]      WP REST API -> wordpress-export/\n' +
      '  attachments  <export.xml>              -> data/attachment-pages.csv\n' +
      '  load         [--dry-run] [--collection=posts|talks|training]',
  );
  process.exit(1);
}
