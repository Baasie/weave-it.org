# SEO, structured data and AI legibility

How the site describes itself to search engines and to answer engines. Read this
before touching titles, descriptions, JSON-LD or the `llms` files.

Part of the working brief: [AGENTS.md](../AGENTS.md) is the map, and
[README.md](../README.md) is the front door.

---

# Structured data

Generated from properties we already hold, **never hand-authored in Notion**. It
lives in `src/lib/seo.ts`, one helper per kind, so a type is described the same
way wherever it appears, and `BaseLayout` emits the single `@graph` it is handed.

**One `Person` is the root of the graph.** This is the structural decision that
reaches everything else, and it is where this site differs most from the
community site the pipeline came from. Weave IT is one practitioner, so the same
`Person` node is author, publisher and the subject of the site — declared once at
`/#person` and referenced by `@id` from every other node, rather than repeated
per page with slightly different fields each time.

| Content | Type | Why |
|---|---|---|
| Blog post | `BlogPosting` | Ordinary writing with a date and an author |
| Talk | `Event` | A talk happened at a place on a date. That is what makes "has Kenny spoken about X" answerable |
| Training | `Course` | The type search engines actually surface for this, and the one page type with a commercial job |
| Learning journey | `HowTo` | A route you follow, not a thing you buy. Typing it `Course` would claim we are selling the reading list |
| Index | `CollectionPage` + `ItemList` | What the page lists |
| Standalone | `WebPage` | — |

**A talk stays an `Event` after it happens.** It does not become an `Article` the
day after — a page that changes type on a day nobody deployed is a page whose
markup nobody can reason about. Past and upcoming differ in `eventStatus` and in
what the page shows, not in what it *is*.

**Coverage is every page but `/410/`**, which is an error body. Every page except
the home page carries a `BreadcrumbList`, built from `site.sections` so a crumb
cannot call a section something the navigation does not.

# Titles and descriptions

**Detail pages carry no brand suffix.** The budget is ~60 characters for a title
and 150–160 for a description, because search results truncate around there, and
a suffix spends 15 characters of actual topic on every page. Indexes keep the
suffix, because "Talks" alone says nothing about whose.

Write an `SEO Title` only where the natural title runs long or is opaque; a field
that duplicates its own fallback is a second copy to maintain. Descriptions are
en-GB, lead with the concrete situation, and never open with "Learn how to…". A
blank field is a legitimate choice when the fallback is good.

**Yoast already holds good copy for most of this.** The WordPress import carries
`yoast_head_json.title` and `.description` across, so this is a review job rather
than a writing job — but review it, because Yoast defaults are often just the
title again.

# The sitemap

`@astrojs/sitemap` writes `/sitemap-index.xml` at build time, and `robots.txt`
points at it. Two things are kept out: `/410/`, which is an error body, and
`/search/`, which is a tool for people already here — an empty results page is
the last thing worth offering someone as an answer. It is `noindex` for the same
reason, and a test checks the two agree.

**There is no `lastmod`, on purpose.** A date that is not demonstrably accurate is
worse than no date.

## Search Console, at cutover

**Verify the domain property by DNS before switching anything.** A domain
property is verified against DNS, not against whatever is serving the site that
week — which is exactly what makes it survive a migration. A property verified by
an HTML file WordPress was serving does not, and you lose the history.
virtualddd.com kept its Search Console history through the same cutover for
precisely this reason.

**Expect coverage churn afterwards, and do not panic at it.** Addresses returning
`410 Gone` on purpose are indistinguishable from a migration gone wrong in a
coverage report, and they surface weeks after the fact. The intended split is in
[urls.md](urls.md), and `watch.yml` proves weekly that it is still true.

**Bing is deliberately not claimed.** It would mean another login to hold and
another account to keep in someone's hands, which is a real cost for a team of
one. If it ever is worth doing, import the property from Search Console — that
needs nothing in this repository, and no second token to rotate. Prefer it over
the `msvalidate.01` meta tag and the `BingSiteAuth.xml` file, both of which put a
credential in the build output the site has no reason to carry.

# AI legibility

The site is meant to be read, cited and quoted by answer engines as well as by
people, and `public/robots.txt` allows `GPTBot`, `ClaudeBot`, `PerplexityBot`,
`Google-Extended` and `CCBot` by name.

That is not in tension with the content being "all rights reserved" — see
[LICENSE-CONTENT](../LICENSE-CONTENT). Reserving the right to republish is a
different thing from wanting to be found, and for a consultancy the second is the
point. Someone asking an assistant how to facilitate a domain modelling decision
should be told, and told whose answer it is.

Three surfaces, in ascending order of appetite *(phase 4)*:

- **`/llms.txt`** — the table of contents: every post, talk and course, one line
  each.
- **`<page>/index.md`** — the markdown behind any content page, advertised with
  `<link rel="alternate" type="text/markdown">`. Front matter names the source
  URL, the author and the date; then the words, with no nav to strip.
  `.htaccess` carries the `AddType` so the host serves it as markdown rather than
  as a download.
- **`/llms-full.txt`** — the whole corpus in one request.

None of this is a separate artefact to maintain. It is all generated from the
markdown the sync already writes, which is why it is nearly free.
