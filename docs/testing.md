# Testing

What each layer is for, what the tests are protecting, and the difference between
a test that blocks a deploy and one that reports.

Part of the working brief: [AGENTS.md](../AGENTS.md) is the map, and
[README.md](../README.md) is the front door.

> **Phase 6 of [MIGRATION.md](../MIGRATION.md) builds this.** The rules below
> apply from the first test written, which is why they are here before the tests
> are.

---

# Testing

**Test the promises, not the pixels.** A promise is something a third party
depends on and that breaks silently: a URL, a redirect, a feed, a canonical, a
JSON-LD shape, "this page works with JavaScript off". Those get hard tests.
Layout, copy and components are what we are still deliberately changing, so tests
must not pin them down.

## The test surface

Tests select **only** `[data-test]` hooks and `js-*` behaviour classes. Never a
styling class, never an id the CSS also targets, never visible copy. A restyle
then cannot break a behaviour test, which is what makes design work cheap to keep
doing.

`tests/conformance.test.mjs` enforces this in both directions: it fails on a test
selecting a class the stylesheets define, and on a test selecting a `[data-test]`
hook no component emits. It is in the blocking suite, so neither can reach
`main`. On the site this came from the rule went unenforced long enough for a
test to start selecting a styling class and nobody noticed, which is why it is a
machine's job.

There is deliberately **no list of hooks here**. One used to exist on the other
site and drifted to thirteen missing and two that no longer existed, because a
list of things in a document is a second copy of the source. Ask the source:

```sh
grep -rho 'data-test="[a-z-]*"' src/ | sort -u
```

## A test must never be something an editor can turn red

The blocking suite sits on the publish path, so it may not depend on how much
content exists or on what any of it says. Two rules follow:

- **Assert a relationship, not a number.** "Every published post has a page" says
  exactly what we mean and cannot be broken from Notion. `posts.length > 20` says
  the same thing until somebody unpublishes five. Where no relationship exists,
  use a floor low enough that only a broken build reaches it, and say so in a
  comment.
- **Never name a piece of content.** Read the tag off the page and slugify it; do
  not write `?tag=eventstorming` and make a rename a CI failure.

**Count elements, not text.** `html.match(/data-test="card"/g)` also counts the
selector inside an inline script that looks for those cards. Strip scripts first.

**The one place a test may name a styling class** is a test whose subject *is*
the styling: the contrast check reads the chip class because the question it asks
is "what does that class look like". Nothing else.

## Blocking vs reporting

- **Blocking** (`npm test`): unit rules, `astro check`, the build, contract
  assertions over `dist/`, the redirect map, browser behaviour. If one fails the
  site is broken; do not deploy.
- **Reporting** (`npm run test:content`): duplicate titles, missing descriptions,
  glued links, a training page with no outcomes. Real defects, but they belong to
  whoever holds the Notion page. Read them and fix them in Notion; do not gate the
  deploy on them.

`npm run test:all` runs both.

## The five layers, cheapest first

1. **`tests/unit/*`** (`npm run test:unit`) — pure rules, no build, no browser,
   under a second. Run with `--import tsx`, since they import the TypeScript
   directly. This is the layer to add to when you change a rule.
2. **Types and build** — `astro check` (0/0/0) and `npm run build`.
3. **`tests/build.test.mjs`** — assertions over `dist/`: canonicals, OG tags, one
   `<h1>`, internal links, JSON-LD shapes and breadcrumbs, feeds, the sitemap, the
   error pages, the markdown twins, and a size ceiling on the deploy.
4. **`tests/urls.test.mjs`** — replays `public/.htaccess` against the inventory,
   and asserts the committed file is what the generator would write today.
5. **`tests/browser.test.mjs`** — Playwright against the built site: horizontal
   overflow at 360 and 390 px, filtering, rendering with JavaScript off,
   accessible names, focus rings. It also runs **axe-core** over one page of each
   shape, scoped to WCAG 2.1/2.2 A and AA — the audit that catches contrast,
   target-size and heading defects a human review otherwise has to find by hand.

**`npm run verify:live <url>`** is the one that cannot run locally: it requests
real URLs from a deployed host, because only the real server proves the
`.htaccess` is honoured, that a 410 is a 410, and that www comes home in one hop.
Every deploy runs it against `SITE_URL`.

It samples one URL family at a time unless told otherwise, and **`npm run` eats
the flag**. For every address, call the script directly:

```bash
node scripts/verify-live.mjs https://weave-it.org --all
```

Not covered, deliberately: visual regression (no baseline worth maintaining for a
site still being designed), Lighthouse (run by hand before a release), and link
checking of external URLs (they rot for reasons outside this repository).
