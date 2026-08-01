# The URL contract

The part to be most careful with. Read this before renaming a slug, deleting a
page, or touching redirects.

Part of the working brief: [AGENTS.md](../AGENTS.md) is the map, and
[README.md](../README.md) is the front door.

---

# The URL contract

**The site answers every address the WordPress site answered.** Many of them are
linked from conference programmes, other people's posts, newsletters and search
results, and none of that is under our control. That contract is worth more than
any code in this repository.

`data/live-urls.txt` is the list. It was taken from the Yoast sitemaps and the
WordPress REST API on 2026-07-31, and it is **not yet complete** — see "Topping
up the inventory" below.

| Handling | Count | Meaning |
|---|---|---|
| Served | 75 | The page exists at that address — 54 posts and 21 pages |
| Redirected | 71 | One hop, to a page that exists — 57 tags, 2 categories, 2 project, 4 feeds, 6 pagination |
| Gone | 1 | `/author/admin-2/`, a default-username artefact nobody meant to publish |
| **Total** | **147** | |

Those are the *intended* numbers. `npm run check:urls` prints the real ones, and
during the migration the gap between them is the to-do list. It reported 143
problems on the day the repository was scaffolded, which is correct: no content
had moved yet.

## This migration is the easy case, and it is worth knowing why

WordPress served posts at `/blog/<slug>/` and `/talks/<slug>/`, and training at
`/training/<slug>/`. **The rebuild keeps all three.** So the great majority of
the inventory needs no rule at all — it is served by a page at the same address.

Only WordPress *machinery* needs redirecting:

- **Feeds.** Yoast published one per archive. Every subscriber wants the same
  thing now, so they all go to `/rss.xml`.
- **Pagination.** `/blog/page/2/` and friends. The rebuilt indexes are one page
  with a filter, so page 2 of anything is the index.
- **Category archives.** There are two categories and they *are* the two
  sections: `/category/blog/` and `/blog/` listed the same posts. It was
  duplicate content on WordPress too.
- **Tag archives.** 57 of them, each 301 to `/blog/?tag=<x>`.
- **The author archive.** One author, so it was the whole blog with a different
  address.
- **The `project` custom post type.** Used once in 2023 and abandoned. Its one
  entry duplicates a talk, so it points at the talk.

Compare virtualddd.com, which inherited 967 addresses across a renamed section, a
retired video library and eight team pages, and needed several hundred rules. If
this file ever grows to that size, something has gone wrong with a slug.

## Generated, never edited

`public/.htaccess` is **generated**. Edit `scripts/build-redirects.ts`, never the
output. A test fails if the committed file is not what the generator would write
today.

The decisions live in four tables at the top of that script:

- `MOVED` — a page that genuinely changed address. Empty, deliberately.
- `PROJECTS` — the one custom-post-type entry.
- `GONE_PAGES` — content deliberately not carried over. Empty until the phase 5
  content review fills it.
- `RETIRED` — editorial merges and renames after the inventory was taken.

Plus `data/retired-urls.csv`, which the **sync writes itself**: the run that
breaks a URL is the run that keeps the promise.

## Topping up the inventory

The sitemap knows what WordPress *currently publishes*. It does not know what
people have *linked to*. Three sources fill that gap, and phase 5 of
[MIGRATION.md](../MIGRATION.md) is where they get read:

1. **Google Search Console**, Pages report, 16 months. The single best source.
2. **The Kualo access logs**, which also catch feed readers and anything that
   only bots follow.
3. **Old attachment pages and `?p=<id>` permalinks**, which WordPress serves and
   never lists.

Never resolve a problem by deleting a URL from `data/live-urls.txt`. That file is
the promise, not a record of what happens to be built.

## Standing rules

- **`trailingSlash: 'always'`.** Every WordPress address ends in a slash, so
  matching it costs nothing and mismatching it costs a 301 on every click. A test
  enforces that internal links carry one.
- **A slug is a promise.** Changing one changes a public address. Rename anyway
  when it is right — the sync writes the redirect itself — but know that it
  happened.
- **Never remove a page without deciding** whether its address should redirect or
  return Gone. Silence is the one option that is always wrong.
- **`410`, not a redirect to the home page**, for content deliberately dropped. A
  redirect to `/` tells a crawler the home page *is* that content, and it shows
  as a soft 404 for years.
- **One hostname.** `www.weave-it.org` redirects to the bare domain, and the rule
  is first in the generated file so it costs a single hop. WordPress did this and
  a static site does not, so without it both hostnames answer 200 with the same
  pages after cutover.

## `wp-content/uploads` is deliberately not redirected

The parked WordPress directory keeps serving the media those addresses point at,
and things outside this repository still reference them — old posts on other
sites, slide decks, Notion pages. virtualddd.com switched its docroot and 404'd
eight images that were linked from Notion. Do not delete the parked directory on
the strength of the new site looking fine. See
[operations.md](operations.md).
