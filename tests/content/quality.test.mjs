/** Content quality — things an *editor* can break from Notion.
 *
 * Kept apart from the blocking suite on purpose. These fail because of what
 * someone wrote, not because of what someone coded, and `npm test` must not
 * turn a typo into a failed deploy: the standing invariant in docs/pipeline.md
 * is that publishing degrades to a script and a commit, never an outage.
 *
 * So this suite **reports**. Run it, read it, fix it in Notion, re-sync. CI runs
 * it for the record with `continue-on-error` and does not gate the deploy on it.
 *
 * That is also why these name the page. The blocking tier must never name a
 * piece of content — an editor could turn it red — and this tier must, because
 * "some page is missing a description" is not an instruction anyone can act on.
 *
 * **Expect this to be red during the migration**, and that is the point: 69
 * pages arrived from WordPress as `Status = Idea` and phase 3c is the pass that
 * makes them publishable. This is the list of what that pass is for.
 *
 * Run after `npm run build`. On a production build it sees only what is
 * published, which today is nothing — build with `SITE_URL` set to see the
 * whole backlog.
 */
import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { pages, meta, attr, graph, markup, DIST } from '../helpers.mjs';

let all;
let entryPages;

const ENTRY = /^\/(blog|talks|training|learning-journeys)\/[^/]+\/$/;

before(() => {
  assert.ok(existsSync(DIST), 'dist/ missing — run `npm run build` first');
  all = pages();
  entryPages = all.filter((p) => ENTRY.test(p.path));
});

describe('what the editors control', () => {
  test('no two pages claim the same title', () => {
    // Two pages competing for one phrase split their own search results. The
    // fix is in Notion: retitle one, or accept that a talk and the post about
    // it are different things and say so in the title.
    const seen = new Map();
    const clashes = [];
    for (const p of all) {
      const title = attr(p.html, /<title>([^<]*)<\/title>/);
      if (!title) continue;
      const first = seen.get(title);
      if (first) clashes.push(`${p.path} and ${first} share "${title}"`);
      else seen.set(title, p.path);
    }
    assert.deepEqual(clashes, [], `duplicate titles:\n${clashes.join('\n')}`);
  });

  test('every page has a meta description', () => {
    // The layout falls back to an excerpt of the body, so this is only empty
    // when the body opens with something an excerpt cannot use — a heading, an
    // image, a bare video URL. Both fixes are in Notion: write an SEO
    // Description, or open the page with a sentence.
    const missing = all.filter((p) => !meta(p.html, 'description')?.trim()).map((p) => p.path);
    assert.deepEqual(missing, [], `pages with no description:\n${missing.join('\n')}`);
  });

  test('a card has a picture to show', () => {
    // A featured image is what a card, a search result and a social share all
    // lean on. Missing one is not broken, it is unfinished — and the fix is one
    // upload into the Cover property.
    const missing = entryPages.filter((p) => !meta(p.html, 'og:image')).map((p) => p.path);
    assert.deepEqual(missing, [], `entries with no cover image:\n${missing.join('\n')}`);
  });

  test('a talk says where it was given', () => {
    // A talk with no Event is an `Event` node with no `superEvent`, and a card
    // that reads as a date and a title with nothing between them. The date is
    // always there; the venue is the one an editor has to type.
    const bare = [];
    for (const p of entryPages.filter((x) => x.path.startsWith('/talks/'))) {
      const event = graph(p.html).find((n) => n['@type'] === 'Event');
      if (!event?.superEvent && !event?.location) bare.push(p.path);
    }
    assert.deepEqual(bare, [], `talks with no event or location in Notion:\n${bare.join('\n')}`);
  });

  test('a course says how long it is and who it is for', () => {
    // The three properties a person deciding whether to book needs, and the
    // ones `Course` structured data carries into a search result. All three are
    // empty on every imported course: the WordPress pages said it in prose.
    const thin = [];
    for (const p of entryPages.filter((x) => x.path.startsWith('/training/'))) {
      const course = graph(p.html).find((n) => n['@type'] === 'Course');
      const missing = [];
      if (!course?.hasCourseInstance?.courseWorkload) missing.push('Duration');
      if (!markup(p.html).includes('data-test="outcomes"')) missing.push('Outcomes');
      if (missing.length) thin.push(`${p.path}: no ${missing.join(', no ')}`);
    }
    assert.deepEqual(thin, [], `courses missing what a buyer needs:\n${thin.join('\n')}`);
  });

  test('a body does not skip a heading level', () => {
    // Someone navigating by heading hears a level that is not there. The cause
    // is nearly always a Notion page that opens with a heading_3, so the fix is
    // in Notion — which is why this reports rather than blocks.
    const skipped = [];
    for (const p of all) {
      const levels = [...markup(p.html).matchAll(/<h([1-6])[\s>]/g)].map((m) => +m[1]);
      const jumps = levels
        .map((l, i) => (i && l > levels[i - 1] + 1 ? `h${levels[i - 1]}→h${l}` : null))
        .filter(Boolean);
      if (jumps.length) skipped.push(`${p.path}: ${[...new Set(jumps)].join(', ')}`);
    }
    assert.deepEqual(skipped, [], `heading levels skipped:\n${skipped.join('\n')}`);
  });

  test('no word is glued to a link', () => {
    // Usually Astro's whitespace handling, which is a code fix — but it also
    // catches a missing space in the Notion source, which is an editorial one.
    const bad = [];
    for (const p of all) {
      for (const m of p.html.matchAll(/[a-z,]<a\s+href="[^"]*"[^>]*>[A-Za-z]/g)) {
        bad.push(`${p.path}: …${p.html.slice(Math.max(0, m.index - 25), m.index + 45)}…`);
      }
    }
    assert.deepEqual(bad, [], `glued links:\n${bad.join('\n')}`);
  });
});

describe('what the WordPress import left behind', () => {
  /**
   * These are migration debris rather than ordinary editorial slips, and they
   * will go to zero and stay there. They are here rather than in the blocking
   * tier because every one of them is fixed by editing a Notion page — and
   * because a deploy that refuses to ship a page over a stray back-link is
   * exactly the outage this tier exists to avoid.
   */
  test('no page links to this site by its full address', () => {
    // A body that says `https://weave-it.org/training/` instead of `/training/`
    // sends a staging visitor to production mid-journey, and costs a redirect
    // even in production. Relative links follow the reader.
    const absolute = [];
    for (const p of entryPages) {
      const hits = [...markup(p.html).matchAll(/href="https:\/\/(?:www\.)?weave-it\.org(\/[^"]*)"/g)];
      if (hits.length) absolute.push(`${p.path}: ${hits.length} → ${hits[0][1]}`);
    }
    assert.deepEqual(absolute, [], `bodies linking to this site absolutely:\n${absolute.join('\n')}`);
  });

  test('no Divi furniture survived the import', () => {
    // "<< Back to all workshops" was a link the old theme drew on every course
    // page. The template draws its own now, so the one in the body is a second
    // one pointing at the same place.
    const debris = [];
    for (const p of entryPages) {
      if (/&lt;&lt;\s*Back to all|<<\s*Back to all/i.test(p.html)) {
        debris.push(`${p.path}: a "<< Back to all …" link left in the body`);
      }
    }
    assert.deepEqual(debris, [], `Divi furniture still in Notion:\n${debris.join('\n')}`);
  });

  test('a bare video URL is a link, not a paragraph of URL', () => {
    // The importer carried oEmbed URLs across as plain text. They render as a
    // very long link and read as nothing. A talk's recording belongs in the
    // Video URL property, where the page turns it into a button.
    const bare = [];
    for (const p of entryPages) {
      const hits = [...markup(p.html).matchAll(
        />(https:\/\/(?:www\.youtube\.com\/embed|speakerdeck\.com\/player)\/[^<]+)</g)];
      if (hits.length) bare.push(`${p.path}: ${hits[0][1].slice(0, 60)}…`);
    }
    assert.deepEqual(bare, [], `embed URLs sitting in the body as text:\n${bare.join('\n')}`);
  });
});
