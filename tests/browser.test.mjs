/** Behaviour, in a real browser, against the *built* site.
 *
 * These cover what static HTML checks cannot: layout at real viewport widths,
 * the progressive-enhancement scripts, and what a screen reader would be told.
 * Every assertion here has a precedent from this migration — the mobile
 * overflow caused by a bare YouTube URL in an imported body was invisible to
 * every other kind of check, and so was `aria-pressed` on a link.
 *
 * **Selectors are the contract.** Tests here select only `[data-test]` hooks
 * and `js-*` behaviour classes, never a styling class and never visible copy,
 * so restyling a section cannot break them. `conformance.test.mjs` enforces it.
 *
 * **The content tests need content.** A production build has ten pages, because
 * everything in Notion is still `Status = Idea`; a staging build has
 * seventy-nine. Anything that needs an entry page skips loudly rather than
 * passing quietly on an empty site — and the suite gets stronger the moment
 * `SITE_URL` is set in CI, which is already the top of the list in MIGRATION.md.
 *
 * Run after `npm run build`.
 */
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { chromium } from 'playwright';
import { serveDist, pages, isStaging } from './helpers.mjs';

const require = createRequire(import.meta.url);
const axeSource = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');

let server, base, browser, built, staging;

before(async () => {
  ({ server, base } = await serveDist());
  browser = await chromium.launch();
  built = pages().map((p) => p.path);
  staging = isStaging();
});
after(async () => {
  await browser?.close();
  server?.close();
});

/** One built page of each shape, for the sweeps that do not need every page. */
const oneOfEach = () => {
  const first = (re) => built.find((p) => re.test(p));
  return [
    '/', '/blog/', '/talks/', '/training/', '/learning-journeys/',
    '/consultancy/', '/contact/', '/search/', '/410/',
    first(/^\/blog\/[^/]+\/$/), first(/^\/talks\/[^/]+\/$/), first(/^\/training\/[^/]+\/$/),
  ].filter(Boolean);
};

/**
 * How many of a selector the visitor can actually see.
 *
 * Not `:not([hidden])`. The filter hides the featured block by setting `hidden`
 * on the *container*, and its children keep their own `hidden` at false — so an
 * attribute selector counts three cards nobody can see. Ask the layout instead.
 */
const visible = (page, selector) =>
  page.$$eval(selector, (els) =>
    els.filter((e) => e.offsetParent !== null || e.getClientRects().length > 0).length);

const withPage = async (fn, opts = {}) => {
  const ctx = await browser.newContext(opts);
  const page = await ctx.newPage();
  try {
    return await fn(page);
  } finally {
    await ctx.close();
  }
};

describe('layout', () => {
  // 360px is the narrowest phone worth supporting; 390 is a current iPhone.
  for (const width of [360, 390]) {
    test(`no horizontal overflow at ${width}px`, async () => {
      const offenders = [];
      await withPage(async (page) => {
        for (const path of oneOfEach()) {
          await page.goto(`${base}${path}`, { waitUntil: 'networkidle' });
          const over = await page.evaluate(() =>
            document.documentElement.scrollWidth > document.documentElement.clientWidth);
          if (over) offenders.push(path);
        }
      }, { viewport: { width, height: 800 } });
      assert.deepEqual(offenders, [], `pages scroll sideways at ${width}px: ${offenders.join(', ')}`);
    });
  }

  test('the header and the footer are on every page', async () => {
    await withPage(async (page) => {
      for (const path of oneOfEach()) {
        await page.goto(`${base}${path}`, { waitUntil: 'domcontentloaded' });
        assert.equal(await page.locator('header nav').count(), 1, `${path} has no nav`);
        assert.equal(await page.locator('footer').count(), 1, `${path} has no footer`);
      }
    });
  });
});

describe('the tag filter', () => {
  /**
   * This is a URL contract obligation, not a nicety: 57 legacy tag archives
   * 301 onto `/blog/?tag=<x>`, so if that parameter stops selecting the tag,
   * fifty-seven redirects quietly land on an unfiltered list.
   */
  const someTag = async (page) => {
    await page.goto(`${base}/blog/`, { waitUntil: 'networkidle' });
    return page.locator('[data-test="tag"]').first().getAttribute('data-tag');
  };

  test('a legacy tag URL lands pre-filtered', async (t) => {
    if (!staging) return t.skip('no published posts in this build, so there are no tags');
    await withPage(async (page) => {
      const tag = await someTag(page);
      await page.goto(`${base}/blog/?tag=${encodeURIComponent(tag)}`, { waitUntil: 'networkidle' });
      const shown = await visible(page, '[data-test="entry"]');
      const total = await page.locator('[data-test="entry"]').count();
      assert.ok(shown > 0, `?tag=${tag} filtered everything away`);
      assert.ok(shown < total, `?tag=${tag} filtered nothing (${shown} of ${total})`);
      // Every card the visitor can see must actually carry the tag — including
      // the featured block, which is why that block hides when a filter is on.
      const wrong = await page.$$eval('[data-test="entry"]',
        (els, t) => els
          .filter((e) => e.offsetParent !== null || e.getClientRects().length > 0)
          .filter((e) => !(e.dataset.tags ?? '').toLowerCase().split('|').includes(t)).length,
        tag.toLowerCase());
      assert.equal(wrong, 0, `${wrong} cards shown do not carry "${tag}"`);
    });
  });

  test('clicking a tag filters, and the back button undoes it', async (t) => {
    if (!staging) return t.skip('no published posts in this build');
    await withPage(async (page) => {
      await page.goto(`${base}/blog/`, { waitUntil: 'networkidle' });
      const before = await visible(page, '[data-test="entry"]');
      await page.locator('[data-test="tag"]').first().click();
      const after = await visible(page, '[data-test="entry"]');
      assert.ok(after < before, 'clicking a tag filtered nothing');
      assert.match(page.url(), /\?tag=/, 'the filter is not in the URL, so it cannot be shared');

      await page.goBack();
      await page.waitForTimeout(150);
      assert.equal(await visible(page, '[data-test="entry"]'), before,
        'going back did not restore the full list');
    });
  });

  test('an unknown tag says so rather than looking broken', async (t) => {
    if (!staging) return t.skip('no published posts in this build');
    await withPage(async (page) => {
      await page.goto(`${base}/blog/?tag=nothing-carries-this`, { waitUntil: 'networkidle' });
      assert.equal(await visible(page, '[data-test="entry"]'), 0);
      const status = (await page.locator('[data-test="filter-status"]').textContent()).trim();
      assert.ok(status.length > 0, 'an empty result set says nothing at all');
    });
  });
});

describe('progressive enhancement', () => {
  test('every entry is readable with JavaScript disabled', async (t) => {
    if (!staging) return t.skip('no published posts in this build');
    // The filter degrades to "no filtering", never to "no content". That is the
    // honest failure mode, and it is why the entries are in the HTML rather
    // than fetched.
    await withPage(async (page) => {
      await page.goto(`${base}/blog/`, { waitUntil: 'domcontentloaded' });
      const shown = await visible(page, '[data-test="entry"]');
      assert.ok(shown > 0, 'no entries are visible without JavaScript');
    }, { javaScriptEnabled: false });
  });

  test('the whole navigation is reachable without JavaScript', async () => {
    await withPage(async (page) => {
      await page.goto(`${base}/`, { waitUntil: 'domcontentloaded' });
      const links = await page.$$eval('header nav a', (as) => as.map((a) => a.getAttribute('href')));
      assert.ok(links.length >= 5, `only ${links.length} nav links without JavaScript`);
      for (const href of links) {
        assert.ok(built.includes(href), `nav links to ${href}, which is not built`);
      }
    }, { javaScriptEnabled: false });
  });
});

describe('accessibility', () => {
  test('axe finds nothing on a page of each shape', async () => {
    const failures = [];
    await withPage(async (page) => {
      for (const path of oneOfEach()) {
        await page.goto(`${base}${path}`, { waitUntil: 'networkidle' });
        await page.addScriptTag({ content: axeSource });
        const { violations } = await page.evaluate(async () => window.axe.run(document, {
          runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
        }));
        for (const v of violations) {
          failures.push(`${path}  [${v.impact}] ${v.id}: ${v.help} (${v.nodes.length} nodes)`);
        }
      }
    }, { viewport: { width: 1280, height: 900 } });
    assert.deepEqual(failures, [], `axe violations:\n${failures.join('\n')}`);
  });

  test('the first tab stop is the skip link, and it lands inside main', async () => {
    // Both halves: a skip link that is not first is unreachable, and one that
    // lands nowhere sends a keyboard user back to the top.
    await withPage(async (page) => {
      await page.goto(`${base}/blog/`, { waitUntil: 'networkidle' });
      await page.keyboard.press('Tab');
      const href = await page.evaluate(() => document.activeElement?.getAttribute('href'));
      assert.equal(href, '#main', 'the first tab stop is not the skip link');
      const landsInMain = await page.evaluate(() => {
        const target = document.querySelector('#main');
        return Boolean(target && target.closest('main'));
      });
      assert.ok(landsInMain, '#main is not inside <main>');
    });
  });

  test('a focused link is visibly ringed', async () => {
    // The browser default is a thin dark outline, which on a light sage ground
    // with a teal palette is close to invisible. global.css overrides it, and
    // "never remove this" is a comment rather than a guarantee without a test.
    await withPage(async (page) => {
      await page.goto(`${base}/blog/`, { waitUntil: 'networkidle' });
      await page.keyboard.press('Tab');
      const outline = await page.evaluate(() => {
        const el = document.activeElement;
        const s = getComputedStyle(el);
        return { width: s.outlineWidth, style: s.outlineStyle };
      });
      assert.notEqual(outline.style, 'none', 'a focused element has no outline');
      assert.ok(parseFloat(outline.width) >= 2, `the focus ring is only ${outline.width}`);
    });
  });

  test('every image has an alt attribute', async () => {
    const missing = [];
    await withPage(async (page) => {
      for (const path of oneOfEach()) {
        await page.goto(`${base}${path}`, { waitUntil: 'networkidle' });
        const n = await page.$$eval('img:not([alt])', (els) => els.length);
        if (n) missing.push(`${path} has ${n} image(s) with no alt`);
      }
    });
    assert.deepEqual(missing, [], missing.join('\n'));
  });
});

describe('search', () => {
  test('says why it is unavailable rather than looking broken', async () => {
    // Pagefind indexes `dist`, so the index exists here — but the page must
    // also degrade honestly, because `astro dev` never has one.
    await withPage(async (page) => {
      await page.goto(`${base}/search/`, { waitUntil: 'networkidle' });
      const text = await page.locator('[data-test="search"]').innerText();
      assert.ok(text.trim().length > 0, 'the search page is silent');
    });
  });
});
