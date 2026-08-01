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
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
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

/**
 * Phase 3b. Deliberately not written yet: it needs the four database ids,
 * which are now known, and a NOTION_TOKEN with access to them.
 *
 * When it is written, two rules it must keep:
 *   - Everything lands as `Status = Draft`. Nothing publishes itself.
 *   - Images are *uploaded* to Notion, never linked. A linked image is the
 *     WordPress media library, and that is what we are switching off.
 */
function load(): never {
  console.error('load: not implemented yet — see MIGRATION.md phase 3b.');
  console.error('Run `extract` first and read wordpress-export/.');
  process.exit(1);
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
} else if (command === 'load') load();
else {
  console.error(
    'usage: tsx scripts/import-wordpress.ts <extract|attachments|load> [--type=posts|pages]',
  );
  process.exit(1);
}
