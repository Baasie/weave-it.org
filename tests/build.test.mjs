/** Contract assertions over the built site — no browser, about a second.
 *
 * Everything here is a promise to somebody outside this repository: a search
 * engine, a feed reader, a person with a bookmark. Breaking one is invisible
 * locally and expensive months later, so these block the deploy.
 *
 * **These assert relationships, never counts.** This site builds two ways —
 * ten pages for production, seventy-nine for staging, because everything in
 * Notion is still `Status = Idea` — and a suite that assumed either number
 * would be wrong half the time and useless the rest. `expected()` in
 * helpers.mjs applies the same visibility rule the site does, so publishing a
 * post can never turn a test red. That is rule 5 of the tiering in AGENTS.md.
 *
 * Content quality — anything an editor can break from Notion — is deliberately
 * not here. See docs/testing.md.
 *
 * Run after `npm run build`.
 */
import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import {
  DIST, COLLECTIONS, SECTION, pages, meta, attr, markup, graph, expected, entries,
  isStaging, exists,
} from './helpers.mjs';

let all;
let staging;

before(() => {
  assert.ok(existsSync(DIST), 'dist/ missing — run `npm run build` first');
  all = pages();
  staging = isStaging();
  // The floor is the pages that exist whatever is published: home, the four
  // section indexes, consultancy, contact, search, 410. It catches a build that
  // produced almost nothing, and says nothing about how big the site is.
  assert.ok(all.length >= 9, `the build produced only ${all.length} pages`);
});

describe('every page', () => {
  test('has a non-empty <title>', () => {
    for (const p of all) {
      const title = attr(p.html, /<title>([^<]*)<\/title>/);
      assert.ok(title && title.trim(), `${p.path} has no <title>`);
    }
  });

  test('has an absolute canonical matching its own path', () => {
    for (const p of all) {
      const c = attr(p.html, /<link rel="canonical" href="([^"]*)"/);
      assert.ok(c, `${p.path} has no canonical`);
      assert.ok(c.startsWith('https://'), `${p.path} canonical is not absolute: ${c}`);
      assert.equal(new URL(c).pathname, p.path, `${p.path} canonical points elsewhere: ${c}`);
    }
  });

  test('canonicalises to the origin it was built for', () => {
    // A staging build that canonicalises to production asks Google to treat the
    // real site's URLs as duplicates of a half-finished one. That is the exact
    // failure a migration cannot afford, and it is why `site.url` reads
    // `SITE_URL` rather than being a constant.
    const origins = new Set(all.map((p) =>
      new URL(attr(p.html, /<link rel="canonical" href="([^"]*)"/)).origin));
    assert.equal(origins.size, 1, `pages canonicalise to more than one origin: ${[...origins]}`);
    const origin = [...origins][0];
    if (staging) assert.notEqual(origin, 'https://weave-it.org', 'a staging build canonicalises to production');
    else assert.equal(origin, 'https://weave-it.org');
  });

  test('has Open Graph and Twitter card tags', () => {
    for (const p of all) {
      for (const tag of ['og:title', 'og:type', 'og:url', 'og:site_name']) {
        assert.ok(meta(p.html, tag), `${p.path} missing ${tag}`);
      }
      assert.equal(meta(p.html, 'twitter:card'), 'summary_large_image', `${p.path} twitter:card`);
      assert.equal(meta(p.html, 'og:url'), attr(p.html, /<link rel="canonical" href="([^"]*)"/),
        `${p.path} og:url disagrees with its canonical`);
    }
  });

  test('has exactly one <h1>', () => {
    for (const p of all) {
      const n = (p.html.match(/<h1[\s>]/g) ?? []).length;
      assert.equal(n, 1, `${p.path} has ${n} h1 elements`);
    }
  });

  test('never renders undefined, NaN or [object Object]', () => {
    const bad = all
      .filter((p) => /\b(undefined|NaN|\[object Object\])\b/.test(markup(p.html)))
      .map((p) => p.path);
    assert.deepEqual(bad, [], `placeholder values leaked into: ${bad.join(', ')}`);
  });

  test('offers a skip link that lands inside main', () => {
    // Both halves, because half of this is worse than neither: a skip link
    // pointing at nothing sends a keyboard user to the top of the page again.
    for (const p of all) {
      assert.match(p.html, /class="skip-link" href="#main"/, `${p.path} has no skip link`);
      assert.match(p.html, /id="main"/, `${p.path} has no #main for the skip link to reach`);
    }
  });
});

describe('the staging build', () => {
  test('is uncrawlable, in both of the two ways that matter', () => {
    if (!staging) return; // a production build has nothing to prove here
    // robots.txt asks a crawler not to *fetch* a URL and says nothing about
    // whether a URL it already knows may be listed. The two do different jobs
    // and staging wants both.
    assert.match(readFileSync(`${DIST}/robots.txt`, 'utf8'), /^Disallow: \/$/m);
    const indexable = all.filter((p) => !/content="noindex/.test(p.html)).map((p) => p.path);
    assert.deepEqual(indexable, [], `staging pages missing noindex: ${indexable.join(', ')}`);
  });

  test('says out loud that it is not the site', () => {
    if (!staging) return;
    const missing = all.filter((p) => !p.html.includes('data-test="staging-banner"')).map((p) => p.path);
    assert.deepEqual(missing, [], `staging pages with no banner: ${missing.join(', ')}`);
  });

  test('a production build carries none of that', () => {
    if (staging) return;
    for (const p of all) {
      assert.ok(!p.html.includes('data-test="staging-banner"'), `${p.path} shows the staging banner in production`);
    }
    assert.doesNotMatch(readFileSync(`${DIST}/robots.txt`, 'utf8'), /^Disallow: \/$/m);
  });
});

describe('drafts', () => {
  test('never reach a production build', () => {
    // The one guarantee the whole staging design rests on. `isVisible` is the
    // code; this is the proof, measured on what was actually emitted.
    if (staging) return;
    const drafted = all.filter((p) => p.html.includes('data-test="draft"')).map((p) => p.path);
    assert.deepEqual(drafted, [], `draft content in a production build: ${drafted.join(', ')}`);
  });

  test('are marked and kept out of search when staging shows them', () => {
    if (!staging) return;
    const entryPages = all.filter((p) => /^\/(blog|talks|training|learning-journeys)\/[^/]+\/$/.test(p.path));
    assert.ok(entryPages.length > 0, 'staging built no entry pages at all');
    for (const p of entryPages) {
      assert.match(p.html, /content="noindex/, `${p.path} is a draft and indexable`);
    }
  });
});

describe('every collection entry becomes a page', () => {
  for (const c of COLLECTIONS) {
    test(`${c}`, () => {
      // The relationship, not the number: however many entries this build was
      // supposed to show, that is how many pages there are.
      const built = all.filter((p) => new RegExp(`^/${SECTION[c]}/[^/]+/$`).test(p.path));
      assert.equal(built.length, expected(c),
        `${c}: ${built.length} pages for ${expected(c)} visible entries`);
    });
  }
});

describe('internal links', () => {
  test('all resolve to a page or a file that exists', () => {
    const paths = new Set(all.map((p) => p.path));
    const broken = new Set();
    for (const p of all) {
      for (const m of p.html.matchAll(/href="(\/[^"#?]*)"/g)) {
        const href = m[1];
        // Anything with an extension is a file and must exist on disk; anything
        // without is a page and must be one we built.
        if (/\.[a-z0-9]{2,5}$/i.test(href)) {
          if (!exists(href)) broken.add(`${href} (from ${p.path})`);
          continue;
        }
        if (!paths.has(href)) broken.add(`${href} (from ${p.path})`);
      }
    }
    assert.deepEqual([...broken], [], `broken internal links:\n${[...broken].join('\n')}`);
  });

  test('all end in a trailing slash, matching trailingSlash: always', () => {
    const bad = new Set();
    for (const p of all) {
      for (const m of p.html.matchAll(/href="(\/[^"#?]*)"/g)) {
        const href = m[1];
        if (href === '/' || /\.[a-z0-9]{2,5}$/i.test(href)) continue;
        if (!href.endsWith('/')) bad.add(`${href} (from ${p.path})`);
      }
    }
    assert.deepEqual([...bad], [], `links that would cost a 301:\n${[...bad].join('\n')}`);
  });

  test('every image the pages reference was actually built', () => {
    // prune-dist.mjs deletes the originals Astro emits beside its `.webp`. When
    // it takes one that is still referenced, the page renders a broken image
    // and nothing else notices.
    const missing = new Set();
    for (const p of all) {
      for (const m of p.html.matchAll(/(?:src|href)="(\/(?:_astro|wp-content)\/[^"]+)"/g)) {
        if (!exists(m[1])) missing.add(`${m[1]} (from ${p.path})`);
      }
    }
    assert.deepEqual([...missing], [], `referenced but not built:\n${[...missing].join('\n')}`);
  });
});

describe('structured data', () => {
  test('every JSON-LD block parses and every node is typed', () => {
    for (const p of all) {
      for (const m of p.html.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/g)) {
        let data;
        assert.doesNotThrow(() => { data = JSON.parse(m[1]); }, `${p.path} has invalid JSON-LD`);
        assert.equal(data['@context'], 'https://schema.org', `${p.path} JSON-LD @context`);
        for (const node of data['@graph'] ?? [data]) {
          assert.ok(node['@type'], `${p.path} has a JSON-LD node with no @type`);
        }
      }
    }
  });

  test('every page says where it sits, and the trail is real', () => {
    // A breadcrumb naming a section the site does not have, or ending somewhere
    // other than the page it is on, is worse than none: it is what a search
    // result shows instead of the URL.
    // A breadcrumb is what a search result shows instead of the URL, so the
    // three pages that are never a search result are exempt: the home page is
    // the root of the trail, `/410/` is the body of an error response, and
    // `/search/` is a tool rather than a place in the hierarchy. All three are
    // out of the sitemap for the same reason.
    const EXEMPT = new Set(['/', '/410/', '/search/']);
    const built = new Set(all.map((p) => p.path));
    for (const p of all.filter((x) => !EXEMPT.has(x.path))) {
      const crumbs = graph(p.html).find((n) => n['@type'] === 'BreadcrumbList');
      assert.ok(crumbs, `${p.path} has no BreadcrumbList`);
      const items = crumbs.itemListElement;
      assert.equal(items[0].name, 'Home', `${p.path} breadcrumb does not start at Home`);
      items.forEach((it, i) => assert.equal(it.position, i + 1, `${p.path} breadcrumb positions`));
      for (const it of items) {
        assert.ok(built.has(new URL(it.item).pathname),
          `${p.path} breadcrumb points at ${it.item}, which is not built`);
      }
    }
  });

  test('the graph has one root, and every page declares the publisher', () => {
    for (const p of all) {
      const nodes = graph(p.html);
      for (const type of ['WebSite', 'Organization', 'Person']) {
        assert.ok(nodes.find((n) => n['@type'] === type), `${p.path} has no ${type} node`);
      }
    }
  });

  test('each kind of page carries the type search engines want for it', () => {
    // The shape, not the contents — whether an editor filled a field in is an
    // editorial question, and belongs in the reporting tier.
    const cases = [
      [/^\/blog\/[^/]+\/$/, 'BlogPosting'],
      [/^\/talks\/[^/]+\/$/, 'Event'],
      [/^\/training\/[^/]+\/$/, 'Course'],
      [/^\/learning-journeys\/[^/]+\/$/, 'HowTo'],
    ];
    for (const [pattern, type] of cases) {
      for (const p of all.filter((x) => pattern.test(x.path))) {
        assert.ok(graph(p.html).find((n) => n['@type'] === type), `${p.path} has no ${type} node`);
      }
    }
  });
});

describe('the sitemap', () => {
  test('lists only pages that are built, indexable and served directly', () => {
    const xml = readFileSync(`${DIST}/sitemap-0.xml`, 'utf8');
    const paths = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname);

    const built = new Set(all.map((p) => p.path));
    const ghosts = paths.filter((p) => !built.has(p));
    assert.deepEqual(ghosts, [], `sitemap lists URLs with no page: ${ghosts.join(', ')}`);

    // `/search/` is a tool for people already here and `/410/` is the body of
    // an error response. Both are `noindex`, and astro.config filters them out;
    // the two must agree or one of them is lying.
    for (const p of ['/search/', '/410/']) {
      assert.ok(!paths.includes(p), `${p} should not be in the sitemap`);
    }
    const noindex = new Set(all.filter((p) => /content="noindex/.test(p.html)).map((p) => p.path));
    if (!staging) {
      const listed = paths.filter((p) => noindex.has(p));
      assert.deepEqual(listed, [], `noindex pages are in the sitemap: ${listed.join(', ')}`);
    }
  });
});

describe('error pages', () => {
  test('404 and 410 are built, noindex, and offer a way back', () => {
    for (const f of ['404.html', '410/index.html']) {
      assert.ok(existsSync(`${DIST}/${f}`), `${f} missing — the host would serve its own`);
      const html = readFileSync(`${DIST}/${f}`, 'utf8');
      assert.match(html, /content="noindex/, `${f} should be noindex`);
      assert.match(html, /href="\/(blog|talks|training)\//, `${f} offers no way back into the site`);
    }
  });

  test('.htaccess points at them', () => {
    const ht = readFileSync(`${DIST}/.htaccess`, 'utf8');
    assert.match(ht, /^ErrorDocument 404 \/404\.html$/m);
    assert.match(ht, /^ErrorDocument 410 \/410\/$/m);
  });
});

describe('feeds and machine-readable files', () => {
  test('the files a machine looks for all exist', () => {
    for (const f of ['sitemap-index.xml', 'rss.xml', 'robots.txt', 'llms.txt', 'llms-full.txt', '.htaccess']) {
      assert.ok(existsSync(`${DIST}/${f}`), `${f} missing from the build`);
    }
  });

  test('a page offering markdown has it, and it points back', () => {
    // The promise is the pair: a page that advertises a twin must have one, and
    // the twin must name the page it came from. A markdown file that has
    // drifted from its page is worse than none.
    const offered = all.filter((p) => /type="text\/markdown"/.test(p.html));
    const entries = COLLECTIONS.reduce((n, c) => n + expected(c), 0);
    assert.equal(offered.length, entries, 'every visible entry should offer its markdown');
    for (const p of offered) {
      const href = attr(p.html, /<link rel="alternate" type="text\/markdown"[^>]*href="([^"]+)"/);
      assert.equal(href, `${p.path}index.md`, `${p.path} advertises ${href}`);
      const md = readFileSync(`${DIST}${href}`, 'utf8');
      assert.ok(md.startsWith('# '), `${href} does not open with its title`);
      const canonical = attr(p.html, /<link rel="canonical" href="([^"]*)"/);
      assert.ok(md.includes(`**Source:** ${canonical}`), `${href} does not name its page`);
      assert.ok(md.split('---\n')[1]?.trim(), `${href} has a header but no body`);
    }
  });

  test('llms.txt indexes the site and points at the full corpus', () => {
    const txt = readFileSync(`${DIST}/llms.txt`, 'utf8');
    assert.ok(txt.startsWith('# '), 'llms.txt does not open with the site name');
    assert.ok(txt.includes('/llms-full.txt'), 'llms.txt does not point at llms-full.txt');
    // A section per collection that has anything visible in it — and none for
    // one that does not, because an empty heading reads as a broken build.
    for (const c of COLLECTIONS) {
      const heading = { posts: 'Blog', talks: 'Talks', training: 'Training', 'learning-journeys': 'Learning journeys' }[c];
      assert.equal(txt.includes(`## ${heading}`), expected(c) > 0,
        `llms.txt ${expected(c) > 0 ? 'is missing' : 'should not have'} a "${heading}" section`);
    }
  });

  test('llms-full.txt carries one entry for every page', () => {
    const full = readFileSync(`${DIST}/llms-full.txt`, 'utf8');
    const sources = (full.match(/^\*\*Source:\*\* /gm) ?? []).length;
    const entries = COLLECTIONS.reduce((n, c) => n + expected(c), 0);
    assert.equal(sources, entries, 'llms-full.txt should carry every visible entry, once');
  });

  test('RSS is well formed and newest first', () => {
    const xml = readFileSync(`${DIST}/rss.xml`, 'utf8');
    assert.match(xml, /<rss[^>]*version="2.0"/);
    const dates = [...xml.matchAll(/<pubDate>([^<]+)<\/pubDate>/g)].map((m) => +new Date(m[1]));
    for (let i = 1; i < dates.length; i++) {
      assert.ok(dates[i] <= dates[i - 1], 'feed items are not newest-first');
    }
    // Published only, whichever build this is: the feed is the one surface
    // where "visible on staging" and "sent to subscribers" must not be conflated.
    const published = entries('posts').filter((e) => e.status === 'Published').length;
    assert.equal((xml.match(/<item>/g) ?? []).length, published,
      'the feed should carry exactly the published posts, on any build');
  });

  test('robots.txt names the sitemap on the origin it was built for', () => {
    const txt = readFileSync(`${DIST}/robots.txt`, 'utf8');
    if (staging) return; // staging disallows everything and offers no sitemap
    for (const bot of ['GPTBot', 'ClaudeBot', 'PerplexityBot', 'Google-Extended']) {
      assert.match(txt, new RegExp(`User-agent: ${bot}\\s*\\nAllow: /`), `${bot} not allowed`);
    }
    assert.match(txt, /^Sitemap: https:\/\/[^\s]+\/sitemap-index\.xml$/m);
    // Blocking these would strand the 57 legacy tag redirects.
    assert.doesNotMatch(txt, /^Disallow: \/\*\?tag=/m);
  });
});

describe('the deploy', () => {
  test('stays under the size we agreed to ship', () => {
    // prune-dist.mjs runs as part of the build and drops the unreferenced
    // originals Astro emits beside its .webp. When it silently stops working
    // the deploy nearly doubles, and rsync over SSH to shared hosting is the
    // one place that hurts. A ceiling, not an exact figure — content grows.
    const CEILING_MB = 100;
    const bytes = (dir) => readdirSync(dir, { withFileTypes: true }).reduce((sum, e) => {
      const p = join(dir, e.name);
      return sum + (e.isDirectory() ? bytes(p) : statSync(p).size);
    }, 0);
    const mb = bytes(DIST) / 1024 / 1024;
    assert.ok(mb < CEILING_MB,
      `dist is ${mb.toFixed(1)} MB, over the ${CEILING_MB} MB ceiling — has prune-dist stopped working?`);
  });
});

describe('the documentation', () => {
  test('every internal link in the docs resolves', () => {
    // The brief is ten files that point at each other. A link that rots is the
    // failure mode of splitting one file into several, so it is worth a test
    // rather than a promise.
    const docs = ['README.md', 'AGENTS.md', 'CLAUDE.md', 'MIGRATION.md', 'data/README.md',
      ...readdirSync('docs').filter((f) => f.endsWith('.md')).map((f) => `docs/${f}`)];
    const bad = [];
    for (const doc of docs) {
      if (!existsSync(doc)) continue;
      const dir = doc.includes('/') ? doc.slice(0, doc.lastIndexOf('/')) : '.';
      for (const [, target] of readFileSync(doc, 'utf8').matchAll(/\]\((?!https?:|#|mailto:)([^)]+)\)/g)) {
        const [path, anchor] = target.split('#');
        if (!path) continue;
        const resolved = join(dir, path);
        if (!existsSync(resolved)) { bad.push(`${doc} → ${target} (no ${resolved})`); continue; }
        if (anchor && resolved.endsWith('.md')) {
          const slugs = [...readFileSync(resolved, 'utf8').matchAll(/^#+ (.+)$/gm)]
            .map(([, h]) => h.toLowerCase().replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-'));
          if (!slugs.includes(anchor)) bad.push(`${doc} → ${target} (no such heading)`);
        }
      }
    }
    assert.deepEqual(bad, [], `broken documentation links:\n${bad.join('\n')}`);
  });
});
