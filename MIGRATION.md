# Migrating weave-it.org off WordPress

The plan of approach. WordPress 7.x on Kualo becomes a static Astro site built
in CI from content held in Notion, on the same host and at the same addresses.

The mechanics are ported from [virtualddd.com][v], which made the same move on
28 July 2026. What is *not* ported is anything about Virtual DDD:
[docs/template.md](docs/template.md) is the line between the two, and it is
worth reading before this file — a good deal of what follows is "instantiate the
template", and knowing which files that means saves guessing.

[v]: https://github.com/Virtual-Domain-driven-design/virtualddd.com

> **Status: phase 4 done, phase 5 done, phase 3c is where the work now is.**
> Phases are ordered by dependency, not by importance. Each ends with something
> demonstrable, so the work can stop at any phase boundary without leaving a
> half-migrated site.
>
> The site builds and runs. 69 pages come out of Notion, all four sections have
> routes, and **`check:urls` reports zero problems** against all 244 inherited
> addresses. What is left is not code: every page is still `Status = Idea`, so a
> *production* build emits 10 pages and a *staging* build emits 79. Phase 3c —
> your editorial pass — is the thing standing between those two numbers.

---

## What is actually being moved

Measured against the live site on 2026-07-31, from its sitemaps and its
(publicly open) WordPress REST API. These are counts, not estimates.

| | Count | Where it lands |
|---|---|---|
| Blog posts (`category: Blog`) | 25 | Notion → `posts` collection → `/blog/<slug>/` |
| Talks (`category: Talks`) | 29 | Notion → `talks` collection → `/talks/<slug>/` |
| Training pages | 15 | Notion → `training` collection → `/training/<slug>/` |
| Standalone pages | 6 | Hand-authored `.astro` — home, consultancy, contact, and the three section indexes |
| `project` custom post type | 1 | A duplicate of a talk. Redirected, not rebuilt |
| Tag archives | 57 | 301 → `/blog/?tag=<x>` |
| Category archives | 2 | 301 → `/blog/` and `/talks/` |
| Media items | 97 | Downloaded into Notion, then into `_assets/` by the sync |
| Attachment pages | 97 | 301 → the file, as Yoast does today. Found only in the XML export |
| **Inherited addresses** | **244** | The URL contract. `data/live-urls.txt` |

**Learning journeys are new.** They have no WordPress ancestor, inherit no
addresses, and are therefore the one section free to be designed rather than
migrated. They are also the reason the nav grows by one.

**Blog and talks are one WordPress post type split by category.** That is the
single most useful fact about this migration: they share a permalink base only
by convention, they have completely different useful properties, and they are
two Notion databases rather than one with a type field. A talk has a conference,
a date, a venue and usually a video; a post has none of those.

**Every path survives the move.** `/blog/<slug>/`, `/talks/<slug>/` and
`/training/<slug>/` are all kept, which is why the generated `.htaccess` is 17
rules rather than virtualddd.com's several hundred. Only WordPress *machinery* —
feeds, pagination, tag and category archives, the author page — needs a rule.

---

## Phase 0 — decisions

| # | Decision | Settled |
|---|---|---|
| 0.1 | **Where the Notion content lives** | ✅ The **Website Content** page in the private space. Four databases created there 2026-08-01 |
| 0.2 | **Brand source of truth** | ✅ Extracted from the live Divi CSS, with the olive contrast defect fixed rather than reproduced. The Art of Design files supersede this whenever they arrive |
| 0.3 | **Content licence** | ⬜ Open. All rights reserved stands until decided — [LICENSE-CONTENT](LICENSE-CONTENT). Loosenable later; the reverse is not |
| 0.4 | **Which 2017–2019 posts survive** | ⬜ Open, and answered at phase 5 with the pages in front of you. All 25 by default |
| 0.5 | **Where notifications go** | ⬜ Open. `N8N_DEPLOY_WEBHOOK` exists and is empty; nothing is sent until it is filled |
| 0.6 | **How closely to follow the Divi layouts** | ✅ Same brand, cleaner execution. The palette, logo and fonts are fixed; the Divi-isms are not |
| 0.7 | **What a learning journey is** | ✅ Several named journeys, each its own page, routing into training. Steps live in the page body — see [docs/content-model.md](docs/content-model.md) |

**0.4 is the one worth real thought.** Eight of the 25 posts predate 2019 and
several are about tooling that has moved on (`junit-quickcheck`, an EventStorming
flight case). Keeping them costs nothing but a migration; retiring one costs a
`410` and a line in `GONE_PAGES` in `scripts/build-redirects.ts`. Retiring is a
decision to take deliberately, not by omission during the import.

### What was decided about the brand, and why it is not just "copy the CSS"

Measured against white, the live palette is:

| Colour | Ratio | Verdict |
|---|---|---|
| Teal `#4B7D7D` | 4.64:1 | Passes, barely. A heading colour; small print uses the darker `--color-primary-ink` |
| Brown `#7E5E2C` | 5.96:1 | Safe as text |
| Green `#749B62` | 3.18:1 | Large text, borders and UI only |
| Olive `#B9AA3A` | **2.37:1** | **Fails** — and the live site sets body copy in it |

The olive is the one real accessibility defect inherited from Divi. It is
**fixed rather than reproduced**: `--color-accent` keeps the exact brand value
for fills, borders and chips, and `--color-accent-ink` (`#7A6F1E`, 5.1:1) carries
any text that wants to be olive. Nothing changes colour family, and a browser
test in phase 2 stops it coming back.

---

## Phase 1 — the repository and a provable pipeline

**Done, apart from the deploy.** The point of this phase is that every later
phase inherits a build that is known to work, rather than debugging Astro and
Kualo at the same time as moving 75 pages.

- [x] Astro 7, `trailingSlash: 'always'`, sitemap integration
- [x] `site.config.ts` — the seam. Everything site-specific in one file
- [x] Design tokens extracted from the live brand (`src/styles/tokens.css`)
- [x] `BaseLayout` with canonical, OG, breadcrumbs, JSON-LD, skip link, focus ring
- [x] Holding home page, branded `404` and `410`
- [x] `public/robots.txt` — AI crawlers allowed by name, and why
- [x] The URL inventory: 244 addresses in `data/live-urls.txt`
- [x] The 97 attachment pages handled, and the 103 media files they need committed
- [x] `scripts/build-redirects.ts` → `public/.htaccess`, and `check-redirects.mjs` to prove it
- [x] `scripts/verify-live.mjs` — the check only a real host can answer
- [x] Workflows: deploy, sync, watch, review, dependabot + automerge
- [x] `astro check` at 0 errors / 0 warnings / 0 hints
- [x] Repository secrets created, empty, ready to fill in
- [ ] **Fill in the five `KUALO_*` secrets and `SITE_URL`** — see below
- [ ] **Deploy to `staging.weave-it.org`** and watch it go green

`npm run check:urls` currently reports **143 problems**, and that is the
migration scoreboard rather than a fault. It counts down as content lands; phase
5 takes it to zero and a test keeps it there.

### Filling in the secrets

Every secret exists in the repository with an **empty value**, which is
deliberate and load-bearing: the workflows guard on `[ -z "$HOST" ]`, so an
empty secret makes the deploy *skip cleanly and say so*, while a placeholder
like `REPLACE_ME` would make it try and fail. Fill them at
**Settings → Secrets and variables → Actions**.

| Secret | Value |
|---|---|
| `KUALO_HOST` | The SSH hostname |
| `KUALO_USER` | The cPanel user — often not what the domain suggests |
| `KUALO_SSH_KEY` | The **private** half of a key whose public half is in `~/.ssh/authorized_keys` on the host |
| `KUALO_SSH_PORT` | Kualo is usually not 22 |
| `KUALO_PATH` | **Absolute** path to the staging docroot, e.g. `/home/<user>/staging.weave-it.org`. A value starting with `~` fails at the very last step, after a successful build and upload |
| `SITE_URL` | `https://staging.weave-it.org` |

**This repository is public.** A fork's pull request gets no secrets and nothing
here uses `pull_request_target`, so the secrets are not exposed by that — but
anyone with *write* access can print them, so restrict the key where it lands:
`restrict,command="…"` in `authorized_keys` turns a stolen key from a shell into
one rsync.

`NOTION_TOKEN`, `N8N_DEPLOY_WEBHOOK`, `N8N_WEBHOOK_TOKEN` and
`ANTHROPIC_API_KEY` also exist and are empty. Each degrades to "skip and say so"
rather than failing, so fill them when they are wanted, not before.

The two analytics **variables** are deliberately *not* created: unset means no
analytics tag at all, and an empty value would inject a broken script tag.

### The one manual step at cutover

CI deliberately refuses to touch a document root that is a real directory —
that might be somebody's live site, and a deploy job is not the place to find
out. So pointing the *production* domain at the build stays a human step:

```bash
# on the host, at cutover (phase 7 — not now):
mv ~/weave-it.org ~/weave-it.org.wordpress    # keep the old site, parked
ln -sfn ~/releases/<sha> ~/weave-it.org       # point at the newest release
```

Staging needs none of that: `staging.weave-it.org` is a fresh docroot, so the
first deploy creates the release and swaps the symlink on its own.

---

## Phase 2 — brand

**Done.** The one part with no equivalent in the source repository, because it
is the part that is entirely different. virtualddd.com is a near-black canvas
with two neons; Weave IT is a **sage ground** with teal display headings, earthy
secondaries, and a stack of full-bleed colour bands.

- [x] Tokens extracted, with the olive contrast defect fixed (see phase 0)
- [x] Tokens **re-measured against the live site** after the first build came
      out looking nothing like it — see below
- [x] Logo into `public/logo-weaveit.png` and `logo-weaveit-white.png`.
      **An SVG from the Art of Design source would still be better**; these are
      400×298 and will not scale up
- [x] `src/styles/patterns.css`: the shared vocabulary
- [x] **A contrast test over every brand fill** — `tests/unit/contrast.test.mjs`
- [x] Every page migrated against its live original, band for band

### What the first attempt got wrong, and how

Worth recording, because none of it was visible from the CSS and all of it was
obvious the moment the two pages were put side by side.

| | Wrong | Actually |
|---|---|---|
| The ground | white | **sage `#d1d4c6`** — on every page, not just the home page |
| Heading weight | 700 | **500** for `h1`, **300** for section headings |
| Heading face | Share everywhere | Share for *display*; **Poppins** for subheadings inside prose |
| Display size | 31px | **60px** for a band heading, **72px** for a page title |
| Content width | 72rem | **67.5rem** (1080px) |

The root error is the first one, and it is recorded in `tokens.css`: `#d1d4c6`
was stored as `--color-primary-soft`, "the sage the site uses as a quiet panel".
It is not a panel. White is the *card* colour on this site and the sage is the
page. Everything else followed from having that inverted.

### The live site's contrast defects, and what was done about them

Decision 0.2 says these are fixed rather than reproduced. Measured:

| Where | Live | Now |
|---|---|---|
| "Book me for a training", white on sage | **1.40:1** | teal ink, 4.55:1 |
| Green eyebrow on sage | 2.11:1 | `--color-moss-ink`, 4.62:1 |
| Blog card title, teal on soft green | 2.17:1 | ink, 5.49:1 |
| White on the olive block | 2.37:1 | ink, 6.80:1 |
| Gold "MORE INFO ›" on teal | 1.95:1 | white, 4.64:1 |
| Workshop tiles, white on green/olive | 3.18 / 2.37:1 | ink, 5.07 / 6.80:1 |
| Brown "AREA" label on green | 1.87:1 | ink, 5.07:1 |

No colour changed family; only the ink on top of it did. **The teal band turned
out to have a hard ceiling of 4.64:1 against pure white**, which means nothing
tinted can ever pass on it — that is now stated in `tokens.css`, because it
constrains the design rather than merely guiding it.

**The trap, stated once.** Fills on this palette are light, so text on them must
be ink and not white. `--on-brand` and `--on-colour` in `tokens.css` are two
tokens for that reason and are not interchangeable. virtualddd.com shipped
white-on-brand at 2.22:1, found it by hand, and only then wrote a browser test
so it could not recur. Write that test here *before* there are twenty
components, not after — it is four lines and it is the cheapest thing on this
list.

---

## Phase 3 — Notion, and getting the content into it

### 3a. Databases — done

**Four, created 2026-08-01 under the Website Content page.** Ids and full
property lists are in [docs/content-model.md](docs/content-model.md). Every
property carries its own description *in Notion*, so the database explains
itself to whoever is editing rather than needing this file open beside it.

| Database | Adds beyond the shared eight |
|---|---|
| **Posts** | `Published`, `Canonical URL` |
| **Talks** | `Date`, `Event`, `Location`, `Video URL`, `Slides URL` |
| **Training** | `Order`, `Format`, `Duration`, `Audience`, `Outcomes` |
| **Learning Journeys** | `Order`, `Summary`, `Starting point`, `Outcome`, relations to the other three |

The shared eight are Title, Slug, Status, Tags, SEO Title, SEO Description,
Cover and Retire URL.

**Derive state; do not store it.** A talk is upcoming because its `Date` is in
the future, not because somebody ticked a box — otherwise every talk page is
wrong the morning after, on a day nobody deployed. There is deliberately no
"upcoming" property to get out of step.

**Pictures must be Notion files, not links.** A linked image is somebody else's
uptime, and in this case the somebody is the WordPress site we are about to
switch off. Eight organiser photos on virtualddd.com pointed at the old media
library and vanished the moment the docroot moved. Every `Cover` property says
so in its own description.

> **Content already in Notion elsewhere.** There is existing Weave IT material
> scattered around the workspace that is not in these four databases and is not
> synced to anything. Merging it in is a real task and it is **not** part of this
> plan — it wants its own pass, with you deciding what supersedes what. Flag it
> when you want to do it; the databases are ready to receive it.

### 3b. The import

`scripts/import-wordpress.ts` — a **one-shot migration tool**, deleted once it
has run. It is not a sync: nothing ever reads WordPress again after cutover.

**`extract` is done and has been run.** `npx tsx scripts/import-wordpress.ts
extract` reads the open REST API, converts to markdown and writes
`wordpress-export/` (gitignored — it is a snapshot of a source of truth we are
retiring, and committing it would invite someone to treat it as one).

**It confirmed the Divi problem exactly, and the split is clean:**

| | Result |
|---|---|
| 25 posts | ✅ Clean markdown — headings, links and prose intact |
| 29 talks | ✅ Clean |
| 15 training pages | ⚠️ Divi markup survives the strip. A rewrite that starts from an import |
| 6 standalone pages | ⚠️ Same |

So the two halves of this phase have very different costs. The 54 posts and
talks are a load; the 21 Divi pages are writing. The extractor names every
suspect file at the end of its run rather than leaving them to be discovered one
at a time.

### Two drafts the REST API never showed

The export carries unpublished work. Both of these are substantial, and neither
was visible to anything built on the REST API:

| | Words | Note |
|---|---|---|
| **Page: "Book Collaborative Software Design"** | ~16 kB of HTML | A landing page for the book, slug `book-collaborative-software-design`, drafted 2023-10-11 and never published |
| **Post: "Identifying the Key Stakeholders for Collaborative Modeling in Domain-Driven Design"** | ~9.5 kB of HTML | Drafted 2023-11-01, **no slug** — so it never had an address and owes nothing to the URL contract |

Neither is in `data/live-urls.txt`, correctly: an unpublished page has no
address to keep. They are a **content decision, not a migration one** — read
them and decide whether they are worth finishing. The book page in particular
looks like it wants to exist.

**Done. 69 pages are in Notion**, all as `Status = Idea`.

```
posts     25 pages
talks     29 pages
training  15 pages
          2,225 blocks total
```

- [x] `load` — markdown → Notion blocks, properties from the front matter
- [x] Integration created, four databases shared, load run
- [x] Two conversion defects found by running it, fixed, and the pages replaced

Everything lands as **`Status = Idea`**. Nothing publishes itself; that is what
3c is for.

The six standalone pages are deliberately *not* loaded. Home, consultancy and
contact become hand-authored `.astro`: a page with one-off layout is code, and
putting it in Notion gives an editor a body they cannot safely change.

### Two limits and one bug, found by running it

Worth recording, because none was visible from the documentation and all three
are the sort of thing that fails quietly.

- **Notion caps a block's `rich_text` array at 100 elements**, separately from
  the 2000 characters per element. One training page produced 113 runs and
  Notion rejected the *whole request*, not the block. Adjacent runs with
  matching formatting are now merged — which is more faithful anyway, since the
  tokeniser emitted a run per boundary — and `splitRuns` is the backstop.
- **Blockquotes were being dismantled.** A WordPress quote is
  `<blockquote><p>…</p><cite>…</cite></blockquote>`, and the converter handled
  the blockquote *before* the generic `<p>` rule, so those inner paragraphs
  later became blank lines and split the quote into a lone `>` and an orphaned
  paragraph. 23 quotes across 10 pages. The attribution is now a second quoted
  line instead of a literal `<cite>` tag.
- **A dry run that could not see existing rows** reported everything as new —
  the one question it exists to answer. It queries with the token now.

The first was caught by the load failing on page 69 of 69; the other two only by
reading what actually landed. **Read a sample after an import**, not just the
exit code.

### Re-running it

```bash
npx tsx scripts/import-wordpress.ts load --dry-run   # says what it would do
npx tsx scripts/import-wordpress.ts load             # skips what is already there
npx tsx scripts/import-wordpress.ts load --replace   # archives and re-creates
```

`load` is re-runnable: it reads the slugs already in each database and skips
them, so a run that dies half way is fixed by running it again rather than by
deleting rows. That earned its keep immediately — the `rich_text` failure left
68 of 69 landed, and the re-run created exactly the one that had failed.

**`--replace` discards anything edited in Notion.** It archives the row (to
Notion's trash, recoverable for 30 days) and creates it fresh, because a page is
properties *and* an arbitrary number of blocks and reconciling those is far more
code than re-creating. Safe while the import is still landing; once the
editorial pass has started, fix the page by hand instead.

### 3c. Your pass through it

Flip `Status = Published` per page as you are happy with it. This is the phase
that takes calendar time rather than compute, and it is the phase that decides
whether the new site reads better than the old one or merely differently.

---

## Phase 4 — the sync, the collections, the routes

**Done.**

- [x] `src/content.config.ts` — a Zod schema per collection mirroring the Notion
      properties
- [x] `scripts/sync-notion.ts` — ported from virtualddd.com. Incremental against
      `data/sync-state.json`, downloads images into `_assets/`, records a slug
      change as a 301 in `data/retired-urls.csv`, writes `data/sync-alerts.json`
      for what only a person can decide
- [x] Routes: `index.astro` and `[slug].astro` for each of the four sections
- [x] `[slug]/index.md.ts` — the markdown twin of every content page
- [x] `rss.xml.ts`, `llms.txt.ts`, `llms-full.txt.ts`
- [x] `/search/` via Pagefind, which indexes the built HTML
- [x] `src/styles/patterns.css` and the three shared components (phase 2's
      shared vocabulary, built when the second page needed each thing)
- [x] `/consultancy/` and `/contact/`, hand-authored, copy carried across from
      the WordPress export

`sync-notion.ts` is genuinely generic apart from its `CONTENT_SPECS` table,
which is the per-site part — see [docs/template.md](docs/template.md).

### Staging serves drafts, and how that is kept safe

Everything in Notion is `Status = Idea`, so a production build would show
nothing. Rather than publish 69 pages unreviewed, **a staging build shows
drafts and a production build cannot**:

```
npm run build                                     # production: 10 pages
SITE_URL=https://staging.weave-it.org npm run build   # staging: 79 pages
```

The switch is `site.isStaging`, and the thing worth understanding is that it is
**defined by what it is not**: any build whose origin is not `PRODUCTION_URL`.
There is no `STAGING=true` to set, because a variable somebody can set is a
variable somebody can set in the wrong workflow. The failure mode of a mistake
is "staging looks like production", never "the drafts shipped".

Three things follow from it, and all three are wired:

| | Production | Staging |
|---|---|---|
| Drafts | Hidden | Shown, and badged with their status |
| `robots.txt` | Allows everyone, names the AI crawlers | `Disallow: /` |
| Every page | Indexable | `noindex`, plus a banner saying what this is |

The `robots.txt` had to stop being a static file in `public/` for this, because
a staging site carrying production's `Allow: /` is a crawlable duplicate of
weave-it.org full of unpublished work. `noindex` is belt *and* braces on
purpose: `robots.txt` asks a crawler not to fetch a URL and says nothing about
whether a URL it already knows may be listed.

### Two conversion defects, found by looking at the pages

Same lesson as the import (3b): **read a sample, not the exit code.**

- **HTML entities survived the WordPress import.** `&amp;`, `&#215;` and
  `&#8211;` reached Notion as literal text, and Notion faithfully kept them —
  so a talk was titled "Domain Driven Design &amp; Data Mesh" on the page.
  Decoded in the sync now, in the same spirit and for the same reasons as tag
  spelling: one rule, one place, testable, and it applies to an entity pasted in
  tomorrow. Skipped inside inline code, where an entity may be the point.
  **The Notion pages still contain them** — the site is right, the source is not
  yet. Fixing five titles by hand is a five-minute job worth doing.
- **`aria-pressed` on the tag filter's chips.** They are links, because each
  filter is a real URL and that is what the 57 redirected tag archives land on —
  and `aria-pressed` is only valid on a button. axe-core called it critical, and
  it was right: a screen reader was told about a toggle that did not exist. It
  is `aria-current="page"` now.

axe-core over one page of each shape is at **0 violations**, and there is no
horizontal overflow at 390px.

---

## Phase 5 — take the URL contract to zero

The scoreboard: `SITE_URL=https://staging.weave-it.org npm run build && npm run
check:urls`. **It reads zero.**

```
checked 244 indexed URLs against 113 rules
  served by a page : 75
  redirected (301) : 168
  gone (410)       : 1
all indexed URLs are handled.
```

It counted down 143 → 72 → 2 → 0: the routes existing took most of it, the two
hand-authored pages took the rest. **Note which build it is measured against** —
a production build has no content pages yet, so the scoreboard reads 72 there,
and that is the drafts, not a regression.

- [x] Every one of the 244 addresses served, redirected once, or `410 Gone`
- [ ] Decision 0.4 applied: anything retired gets a `GONE_PAGES` line, never
      silence
- [ ] `data/live-urls.txt` topped up from **Google Search Console** and the
      **Kualo access logs** — the sitemap knows what WordPress currently
      publishes, not what people have linked to. Old attachment pages, `?p=`
      permalinks and pre-2020 slugs are exactly what the sitemap cannot tell us
- [ ] A test asserting the committed `.htaccess` is what the generator writes today

---

## Phase 6 — tests

Ported in shape, not verbatim: they assert things about *this* site.

**The blocking tier is real now.** It was not: `deploy.yml` ran
`node --test "tests/*.test.mjs"`, no file matched, and `node --test` prints
"pass 0" and exits 0 — so the step reported success on every push while running
nothing, and this table went on claiming it failed the deploy. The step now
refuses an empty glob.

- [x] `tests/unit/` — **38 tests, 0.2s, no build.** Contrast over the whole
      palette, the entry-ordering rules, excerpt and date formatting, entity
      decoding and tag spelling. `contrast.test.mjs` asserts *relationships*
      between tokens and never a particular hex, so the brand can still be
      adjusted — what it forbids is an adjustment that makes something
      unreadable
- [x] `tests/build.test.mjs` — **34 contract tests** over `dist`: canonicals and
      the origin they point at, one `<h1>`, OG tags, JSON-LD shapes and
      breadcrumbs, every internal link and image, the sitemap, error pages, the
      markdown twins, the feeds, a size ceiling, and the documentation's own
      links. **Mode-aware**: it applies the site's own visibility rule, so it
      holds on a 10-page production build and a 79-page staging one
- [x] `tests/conformance.test.mjs` — **7 tests** making rules 3, 5 and 8
      executable, including the template seam
- [x] `tests/urls.test.mjs` — the URL contract, the single `www` hop, and **the
      committed `.htaccess` is what the generator writes today**. On a
      production build the shortfall has to be *exactly* the editorial backlog,
      so a rule that stopped matching still fails
- [x] `tests/browser.test.mjs` — Playwright: overflow at 360/390px, the tag
      filter, JavaScript off, the focus ring, and **axe-core** over one page of
      each shape. It found that `hidden` never hid anything — see below
- [x] `tests/content/` — the reporting tier, 10 checks. **Expect it red**: it is
      the phase 3c backlog written down. Today it names 23 posts and 11 talks
      with no cover, all 15 courses missing a duration and outcomes, 29 talks
      with no event, 17 bodies linking to weave-it.org absolutely, 15 with a
      Divi back-link still in them, and two pairs of pages sharing a title
- [ ] `tests/build.test.mjs` — canonicals, one `<h1>`, OG tags, JSON-LD shapes,
      breadcrumbs, internal links, the sitemap, the error pages, a size ceiling
- [ ] `tests/urls.test.mjs` — replays `.htaccess` against the inventory
- [ ] `tests/browser.test.mjs` — Playwright: overflow at 360/390px, filtering,
      JavaScript off, focus rings, and **axe-core** over one page of each shape
- [ ] `tests/conformance.test.mjs` — makes the rules in AGENTS.md executable
- [ ] `tests/content/` — the reporting tier, which never blocks a deploy

**The rule that makes the rest work:** a test an editor can turn red from Notion
must never block a deploy. Assert a relationship ("every published post has a
page"), never a count, and never name a piece of content.

---

## Phase 7 — cutover

- [ ] Full `verify:live` against staging, all 244 addresses
- [ ] `mv` the WordPress docroot aside, `ln -sfn` the release in
- [ ] Point `KUALO_PATH` and `SITE_URL` at production
- [ ] `node scripts/verify-live.mjs https://weave-it.org --all` within the hour
- [ ] Confirm the Search Console **domain property** is verified by DNS, not by
      an HTML file WordPress was serving. A DNS property survives the cutover; a
      file-verified one does not, and you lose the history
- [ ] Leave `~/weave-it.org.wordpress` in place. Its `wp-content/uploads` is
      what old media URLs point at, and things outside this repository still
      reference them

**Expect coverage churn afterwards, and do not panic at it.** Retired addresses
returning `410` look exactly like a botched migration in a coverage report, and
they surface weeks late. `watch.yml` proves weekly that the map is still right.

---

## Phase 8 — extract the template

Once the generic/specific split has been proven by a second real site rather
than asserted by a document, lift the generic half into its own repository.
[docs/template.md](docs/template.md) is the manifest, kept current as we go so
this phase is a copy rather than an archaeology.

---

## What I need from you

Most of the original list is now answered. What is left, in the order it blocks
something:

**Now — it is the only thing left between here and a staging site**

1. **Fill in the six deploy secrets.** The table is under phase 1, and
   `SITE_URL` is the one that matters most: it is what makes a build a *staging*
   build, and therefore what makes the 69 drafts visible and the site
   uncrawlable. Set it to `https://staging.weave-it.org`. Everything else is
   ready; nothing can prove itself against a real host until these exist.

**Now — it is what decides whether the new site reads better than the old one**

2. **Phase 3c: your pass through the 69 pages.** This is the only thing
   standing between a 10-page production build and a 79-page one. Nothing is
   blocked on it — staging shows every page as a draft, so you can read them in
   their real layout first and flip `Status` as you go.

   The 15 training pages want the most work: they still carry Divi leftovers
   (absolute `https://weave-it.org/` links, stray `<< Back to all workshops`
   lines, long strips of body images), and several have no `SEO Description`, so
   their cards on `/training/` currently show no summary at all. The 25 posts
   and 29 talks came across clean.

**Before phase 2 finishes, whenever they turn up**

3. **The Art of Design brand files.** Not blocking any more — the extracted
   tokens are good enough to build against — but a logo SVG would replace a
   300×224 PNG, and a real type scale would replace one I inferred.

**Before phase 5**

4. **Google Search Console** access or a Pages export. You said you would add
   this later; phase 5 is when it is actually wanted, so there is no hurry.

**Whenever you have a moment**

5. **Decision 0.3** — the content licence.
6. **Decision 0.4** — which of the eight pre-2019 posts are worth carrying.
7. **The two drafts** in the export (phase 3b) — worth finishing, or let go?
8. **Five Notion pages still contain HTML entities** in their titles or bodies.
   The sync decodes them, so the site is correct either way; this is only about
   what you see when editing.
9. **Learning journeys: still none.** The section, its routes, its schema and
   its `HowTo` structured data all exist and the index renders an honest empty
   state. It needs the first journey written in Notion — decision 0.7 says what
   one is. Until then the build logs a harmless "collection is empty" warning.

**Not in this plan, and worth naming**

8. **The Weave IT content already scattered around Notion.** It is not in the
   four databases and is not synced to anything. Merging it wants its own pass
   with you deciding what supersedes what — say when, and it becomes a phase.

---

## What I am not doing unless you ask

- Touching the live WordPress site. Everything until phase 7 is additive, on a
  staging path.
- Rewriting your copy. The import carries it across; the editing is yours, and
  phase 3c is where it happens.
- Changing any published address. Every one of the 244 is kept, redirected once,
  or retired by an explicit decision of yours.
