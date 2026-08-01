# The template: what is generic, and what is this site

This repository is two things wearing one coat. Underneath is a **reusable way
of publishing a static site from Notion onto shared hosting**, lifted from
[virtualddd.com][v]. On top is **Weave IT**: a brand, a content model, and
copy.

This file is the line between them. It exists so that extracting the generic
half into its own repository (MIGRATION.md, phase 8) is a copy rather than an
archaeology — and, more usefully day to day, so that anyone changing a file
knows which of the two they are changing.

[v]: https://github.com/Virtual-Domain-driven-design/virtualddd.com

Part of the working brief: [AGENTS.md](../AGENTS.md) is the map, and
[README.md](../README.md) is the front door.

---

## The rule

> **A file is generic if a completely different site would want it byte for
> byte.** Anything with a value a second site would change is either
> site-specific, or generic with its values read from `site.config.ts`.

`site.config.ts` is the seam. It is the file a second site rewrites, and it is
very nearly the only one.

The rule has a corollary worth stating, because it is the one that gets broken:
**a generic file may not import a site-specific one, and may not hard-code a
value that belongs in `site.config.ts`.** A hostname written into a script is
not a small shortcut — it is the thing that makes the file stop being generic,
silently, months before anybody tries to reuse it.

---

## Generic — copy as-is

| File | What it does | Configured by |
|---|---|---|
| `.github/workflows/deploy.yml` | Build, test, atomic rsync release, verify, notify | Secrets only |
| `.github/workflows/sync.yml` | Pull Notion, commit a diff, call the deploy | The collection list in one `for` loop |
| `.github/workflows/watch.yml` | Weekly: every address, and the certificate | Secrets only |
| `.github/workflows/review.yml` | Read the diff against the brief | `.claude/skills/review-change/` |
| `.github/workflows/dependabot-automerge.yml` | Merge a green routine bump | — |
| `.github/dependabot.yml` | One grouped PR most Mondays | — |
| `scripts/check-redirects.mjs` | Replay `.htaccess` against the inventory | Reads `data/` |
| `scripts/verify-live.mjs` | Ask a deployed host about every address | Argument + `data/` |
| `scripts/prune-dist.mjs` | Drop the originals Astro emits beside its `.webp` | — |
| `tsconfig.json`, `.gitignore` | — | — |
| `src/styles/global.css` | Reset, base type, focus ring, skip link | Entirely via tokens |
| `src/lib/markdown-page.ts` | The `.md` twin of every content page | *(phase 4)* |
| `src/lib/dates.ts`, `excerpt.ts`, `tags.ts`, `filter-url.ts` | Small pure helpers | *(phase 4)* |

**Nearly generic**, and worth understanding rather than copying blindly:

- **`scripts/build-redirects.ts`** — the machinery is generic; the constants at
  the top (`MOVED`, `GONE_PAGES`, `PROJECTS`, `RETIRED`) are the URL history of
  one site and never transfer. Extracting this means extracting the shape and
  leaving the tables empty.
- **`scripts/sync-notion.ts`** *(phase 4)* — generic except `CONTENT_SPECS` and
  `ROW_SPECS`, the tables that say what each collection *is*. Those are the
  per-site part and are meant to be.
- **`src/lib/seo.ts`** — the assembly, the breadcrumbs and the title rules are
  generic. The per-type helpers are not: this site has `postJsonLd`,
  `talkJsonLd`, `trainingJsonLd` and `journeyJsonLd`; virtualddd.com has five
  entirely different ones. **The publisher differs at the root**: a one-practitioner site makes a
  `Person` the author and publisher of everything, a community site makes it an
  `Organization` with per-page authorship. That choice reaches every node.

---

## Site-specific — expect to rewrite

| File | Why it never transfers |
|---|---|
| `site.config.ts` | It *is* the site |
| `src/styles/tokens.css` | The brand |
| `src/styles/patterns.css` | The visual vocabulary built on the brand |
| `src/layouts/BaseLayout.astro` | Header, footer, nav — generic in shape, specific in every detail |
| `src/pages/**` | The pages |
| `src/content.config.ts` | The content model |
| `data/live-urls.txt` | The URL history of one domain |
| `public/robots.txt` | Names the sitemap host; the AI-crawler stance is a per-site decision |
| `public/.htaccess` | **Generated.** Never edited; edit its generator |
| `AGENTS.md`, `README.md`, `docs/*` | The brief for one project |
| `LICENSE-CONTENT` | virtualddd.com is CC BY-SA community content; this is a consultancy's own work |

---

## The seam in practice

Four things read `site.config.ts`, and between them they are most of what
"instantiate the template" means:

1. **`astro.config.mjs`** takes `site.url` for the canonical origin. Written
   once, in one place, because two copies of an origin is one copy that will be
   wrong.
2. **`BaseLayout.astro`** generates the navigation from `site.sections`, so
   adding a section is one edit rather than four.
3. **`src/lib/seo.ts`** builds breadcrumbs from the same `sections`, so a crumb
   cannot call a section something the navigation does not.
4. **`scripts/build-redirects.ts`** takes the host for the www rule and the
   sections for its report.

**`verify-live.mjs` deliberately does not.** `watch.yml` runs it weekly with no
`npm ci`, which is what keeps the weekly check cheap and independent of whether
the tree currently installs. Importing `site.config.ts` would drag in a
TypeScript loader and end that. It reads `data/live-urls.txt`, calls `fetch`,
and needs nothing else — treat that as a constraint, not an oversight.

---

## What did **not** come across, and why

Worth recording, because the absence of a file is invisible and someone will
eventually wonder.

- **`refresh-feed.yml`** — virtualddd.com rebuilds when its Bluesky feed has
  something the home page does not. That is a solution to *its* home page having
  a live panel on it. If Weave IT grows one, port it; until then it would be a
  daily rebuild spending the five-release rollback history on nothing.
- **`sync-ddd-crew.ts`** — republishes another organisation's repositories.
  Nothing here does that.
- **`enrich-books.ts`, `import-videos.ts`** — one-shot tools for content types
  this site does not have.
- **The heuristics machinery** — `heuristics.ts`, `HeuristicBrowser`,
  `DefinedTerm` structured data. A whole content type, and specific to that
  community.
- **Two people databases** — virtualddd.com keeps organisers and guests apart
  because it has sixty external speakers. This site has one author, and one
  author is a field in `site.config.ts`, not a database.

---

## Adding a content type

There is no single seam for this, on either site. A new collection touches about
a dozen places and forgetting one usually fails *quietly*. In order, each step
small:

1. `src/content.config.ts` — a `defineCollection` with a Zod schema mirroring
   the Notion properties. Relations become `reference()`.
2. `scripts/sync-notion.ts` — a `CONTENT_SPECS` entry. Say what is *different*
   about the new collection, not how to fetch it.
3. `package.json` — a `sync:<name>` script, added to `sync:notion`. If another
   collection references it, sync it **first**.
4. `.github/workflows/sync.yml` — the same name in the `for` loop. Adding it in
   one place and not the other is a collection that silently never updates.
5. `site.config.ts` — a `sections` entry, which gives it navigation and
   breadcrumbs at once.
6. **Routes**: `src/pages/<section>/index.astro` and `[slug].astro`.
7. `src/pages/<section>/[slug]/index.md.ts` — the markdown twin.
8. `src/lib/seo.ts` — a JSON-LD helper for the type, and `collectionPage(…)` on
   the index.
9. `src/pages/llms.txt.ts` and `llms-full.txt.ts` — a section in each.
10. `src/pages/rss.xml.ts` — only if the type belongs in the feed.
11. **Tests**: a `data-test` hook if it has behaviour, a contract assertion in
    `tests/build.test.mjs`, and this file updated.

If you find yourself doing this a third time, that is the moment to build the
abstraction — not before. With four collections the list is still cheaper than
the framework, but it is close; the next one is worth pausing over.
