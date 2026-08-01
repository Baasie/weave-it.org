# AGENTS.md, weave-it.org

The working brief for this repository. Written for **anyone changing this site:
a person, a coding agent, or the two together**. `CLAUDE.md` points here, so
point your own tool here too if it looks for a different filename.

**[README.md](./README.md) is the front door**, and
**[MIGRATION.md](./MIGRATION.md) is what is currently happening** — this site is
mid-migration off WordPress, so a good deal of what you find missing is missing
on purpose and has a phase number.

This file is the map. It carries the rules that must not be broken, in full, and
points at the detail.

## Read this much, at minimum

Each rule says **how we know** it is being kept. That line is not decoration. A
rule with a machine behind it is a constraint; a rule with a person behind it is
a habit, and habits drift silently. Assume nothing is checked unless it says so
here.

1. **Notion is the source of truth.** Everything under `src/content/` is
   generated and never hand-edited. CI fails a push that touches it from anyone
   but the sync. See [docs/pipeline.md](docs/pipeline.md).
   *How we know: **machine.** `deploy.yml` rejects the push, CODEOWNERS puts the
   maintainer on the PR, and the sync refetches any body whose digest changed.*
2. **URLs are promises.** Every address the WordPress site answered is served,
   redirected once, or returned as `410 Gone` on purpose. `npm run check:urls`
   is the guard. Never edit `public/.htaccess`; edit its generator.
   See [docs/urls.md](docs/urls.md).
   *How we know: **machine, from phase 5.** Until then `check:urls` reports the
   outstanding count and does not yet block — see MIGRATION.md. That is a
   deliberate, temporary state and it has an end date.*
3. **The brand is the fixed point.** Layout, copy, components and structure are
   open to improvement. The colours, the logo and the feel are not.
   See [docs/brand-and-code.md](docs/brand-and-code.md).
   *How we know: **partly, and not yet.** The contrast test is phase 2. Until it
   exists this rests on you, and the palette is light enough that getting it
   wrong is easy — read the `--on-brand` note in `tokens.css` first.*
4. **Propose options, then ask.** For anything that changes what a visitor sees,
   work out what the page and the Notion data actually do, name the friction,
   offer options with a recommendation, and let the maintainer decide.
   Recommend; do not unilaterally redesign.
   *How we know: **a reader, if one is configured.** No check can see an option
   you did not offer, so `review.yml` asks a reviewer to look for it in the diff.
   Advisory, and silent until an `ANTHROPIC_API_KEY` exists.*
5. **Tests select `[data-test]` hooks and `js-*` classes only**, never a styling
   class and never visible copy, so restyling a section cannot break them.
   See [docs/testing.md](docs/testing.md).
   *How we know: **machine, from phase 6** (`conformance.test.mjs`).*
6. **Small steps, section by section.** Improvement is opt-in per section, never
   a big-bang rebuild. Sections ship independently.
   *How we know: **a reader.** `review.yml` prints lines added against lines
   deleted, which is the shape of a change whether or not anyone reads it.*
7. **Improvements can land on either side.** Sometimes the right fix is in the
   Notion schema or the editing workflow rather than in the code. Changing Notion
   is in scope.
   *How we know: **n/a.** A permission, not a constraint.*
8. **This repository is two things.** A reusable publishing pipeline and one
   site. Know which you are editing: [docs/template.md](docs/template.md) is the
   line, and a hostname hard-coded into a generic script is how the line stops
   being true without anyone noticing.
   *How we know: **weakly.** `site.config.ts` makes the right thing easy. Nothing
   yet fails a build for the wrong one.*

The team is one person and time is short. The constraint behind every decision
here is *low ongoing maintenance*.

## Three tiers, and what each one is for

The same shape as the test suite, and for the same reason: what blocks a deploy
must be about code being wrong, never about somebody's writing.

| Tier | Runs | Fails the deploy? |
|---|---|---|
| **Blocking** — contracts, URLs, browser behaviour, conformance | Every push | Yes |
| **Content report** — what an editor could improve | Every push | No, `continue-on-error` |
| **Review** — the diff, against this file | Every push touching code | No — a separate workflow |

**A test an editor can turn red from Notion must never block a deploy.** That
would make publishing hostage to CI. Assert a relationship ("every published post
has a page"), never a count, and never name a piece of content.

`review.yml` reports and does not block, and that is the design. The reviewer is
a language model; the standing promise in [docs/pipeline.md](docs/pipeline.md) is
that publishing degrades to a script and a commit, never an outage. If it is ever
made blocking, make it a required check — never a step inside `deploy.yml`.

## Where the detail lives

| Read this | Before you |
|---|---|
| [MIGRATION.md](./MIGRATION.md) | Anything. It says what exists yet and what does not |
| [docs/template.md](docs/template.md) | Change a script, a workflow, or anything in `src/lib/` |
| [docs/content-model.md](docs/content-model.md) | Add a field or a collection |
| [docs/urls.md](docs/urls.md) | Rename a slug, retire a page, or touch redirects |
| [docs/pipeline.md](docs/pipeline.md) | Change the sync, debug a missing page, or ask why nothing deployed |
| [docs/testing.md](docs/testing.md) | Add or change a test |
| [docs/brand-and-code.md](docs/brand-and-code.md) | Write CSS or add a component |
| [docs/seo.md](docs/seo.md) | Touch titles, descriptions, structured data or the `llms` files |
| [docs/operations.md](docs/operations.md) | Deploy by hand, roll back, or chase a certificate |
| [data/README.md](data/README.md) | Touch anything in `data/` |

Commands are in the [README](./README.md#commands). What a table has no room for:

- **`npm run build`** also runs `prune-dist.mjs`, which drops the unreferenced
  originals Astro emits alongside its `.webp` — around 22 MB a build on the site
  this came from — then `pagefind --site dist`, which indexes the built HTML for
  `/search/`. Because it indexes the *output* there is no second copy of the
  content to keep in step, but it also means **`astro dev` has no search index**.
- **`npm run redirects`** must be re-run after adding or renaming content.
- **`npm run check:urls`** needs a build first: it checks the rules against the
  pages in `dist/`.

## When something goes wrong

| Symptom | Where to look |
|---|---|
| A page is published in Notion but not on the site | The **sync** run in Actions. A page with no slug is reported there |
| Something in Notion needs a person to decide | `data/sync-alerts.json`, and the notification the sync sends |
| A deploy failed on `Cannot reach the host` | The host's brute-force protection blocked the runner. Re-run; a different runner has a different IP. Kualo calls it cPHulk |
| CI is red on `main` after a content commit | Sync and deploy are separate jobs. Check which failed before assuming the content is wrong |
| The site is stale but the runs are green | Check the deploy built the commit you expect. The `What is being built?` step prints it |

## A note on the Notion ids

Database ids in [docs/content-model.md](docs/content-model.md) and in
`scripts/sync-notion.ts` are published on purpose. They identify a database; they
do not grant access to one. Reading anything needs `NOTION_TOKEN`, which is a
repository secret and is not in this repository.
