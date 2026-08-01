/** Shared test helpers: read the built site, and know which build it is. */
import { createServer } from 'node:http';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { extname, join } from 'node:path';

export const DIST = 'dist';

/**
 * Which build is in `dist/`?
 *
 * **This site builds two ways and the tests have to know which they are
 * looking at.** Everything in Notion is still `Status = Idea`, so a production
 * build emits ten pages and a staging build emits seventy-nine. A suite that
 * assumed either one would be useless against the other.
 *
 * The build declares it in the only artefact that has to differ — `robots.txt`,
 * which is `Disallow: /` on staging. Reading it back is better than passing a
 * flag in: the test then checks what was actually produced, not what somebody
 * meant to produce.
 */
export const isStaging = () =>
  readFileSync(`${DIST}/robots.txt`, 'utf8').startsWith('# Staging.');

/**
 * Front matter of every entry in a collection, as { id, status }.
 *
 * A collection directory that does not exist is an empty collection, not an
 * error. Learning journeys has no entries yet — and **git cannot store an empty
 * directory**, so the folder is present on a machine that has run the sync and
 * absent in a fresh checkout. This suite passed locally and failed on its first
 * CI run for exactly that reason.
 */
export const entries = (collection) => {
  const dir = `src/content/${collection}`;
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .map((f) => ({
      id: f.replace(/\.md$/, ''),
      status: (readFileSync(`${dir}/${f}`, 'utf8').match(/^status:\s*"([^"]*)"/m) ?? [])[1] ?? '',
    }));
};

/**
 * How many entries of a collection this build should have turned into pages.
 *
 * The rule the site itself uses — `isVisible` in src/lib/collections.ts — so a
 * test asserts the *relationship* ("every entry that should be a page is one")
 * rather than a number an editor could change from Notion. Publishing a post
 * must never turn a test red.
 */
export const expected = (collection) =>
  isStaging()
    ? entries(collection).length
    : entries(collection).filter((e) => e.status === 'Published').length;

/** The four content collections, by directory name. */
export const COLLECTIONS = ['posts', 'talks', 'training', 'learning-journeys'];

/** Which URL segment a collection is served under. */
export const SECTION = {
  posts: 'blog',
  talks: 'talks',
  training: 'training',
  'learning-journeys': 'learning-journeys',
};

/** Every built HTML page, as { path, file, html }. `path` is the URL path. */
export function pages() {
  const out = [];
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) walk(p);
      else if (name === 'index.html') {
        out.push({
          path: p.slice(DIST.length).replace(/index\.html$/, ''),
          file: p,
          html: readFileSync(p, 'utf8'),
        });
      }
    }
  };
  walk(DIST);
  return out;
}

export const attr = (html, re) => (html.match(re) ?? [])[1];

/**
 * The markup without its scripts.
 *
 * A test counting `data-test="entry"` in raw HTML also counts the selector
 * inside the inline filter script that looks for those entries — which makes a
 * refactor look like a missing card. Count elements, not text.
 */
export const markup = (html = '') => html.replace(/<script[\s\S]*?<\/script>/g, '');

/** How many elements carry a `data-test` hook. */
export const countHook = (html, hook) =>
  (markup(html).match(new RegExp(`<[^>]*data-test="${hook}"`, 'g')) ?? []).length;

export const meta = (html, name) =>
  attr(html, new RegExp(`<meta[^>]*(?:name|property)="${name}"[^>]*content="([^"]*)"`)) ??
  attr(html, new RegExp(`<meta[^>]*content="([^"]*)"[^>]*(?:name|property)="${name}"`));

/** The JSON-LD graph of a page. */
export const graph = (html) => {
  const raw = attr(html, /application\/ld\+json[^>]*>([\s\S]*?)<\/script>/);
  return raw ? (JSON.parse(raw)['@graph'] ?? []) : [];
};

export const exists = (p) => existsSync(`${DIST}${p}`);

/**
 * Serve `dist/` the way a static host does, so browser tests hit the real build.
 *
 * Not `astro dev`: the thing being tested is what will be rsynced to Kualo,
 * including the pruning and the Pagefind index, neither of which a dev server
 * has. `trailingSlash: 'always'` is honoured here the same way Apache does it —
 * a directory URL serves its `index.html`.
 */
export function serveDist(port = 4331) {
  const TYPES = {
    '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript',
    '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon',
    '.xml': 'application/xml', '.txt': 'text/plain', '.md': 'text/markdown',
    '.woff2': 'font/woff2', '.woff': 'font/woff', '.json': 'application/json',
  };
  const server = createServer((req, res) => {
    const url = decodeURIComponent((req.url ?? '/').split('?')[0]);
    let file = join(DIST, url);
    if (url.endsWith('/')) file = join(file, 'index.html');
    if (!existsSync(file) || statSync(file).isDirectory()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream' });
    res.end(readFileSync(file));
  });
  return new Promise((resolve) => {
    server.listen(port, () => resolve({ server, base: `http://localhost:${port}` }));
  });
}
