# How the content is modelled

Collections, what makes a page publish, and why the split is the way it is. Read
this before adding a field or a collection.

Part of the working brief: [AGENTS.md](../AGENTS.md) is the map, and
[README.md](../README.md) is the front door.

> **The databases exist** (created 2026-08-01, in the **Website Content** page).
> The sync that reads them is phase 4 of [MIGRATION.md](../MIGRATION.md), so
> nothing under `src/content/` is generated yet.

---

# Content model

**Notion is the source of truth.** Everything under `src/content/` is
**generated** by the sync and **never hand-edited**. It is committed on purpose:
content history in git, offline builds, and diffs you can review.

| Collection | Route | Notion data source |
|---|---|---|
| `posts` | `/blog/<slug>/` | `collection://3b6001d5-d680-497c-bf95-c51e1f5990a2` |
| `talks` | `/talks/<slug>/` | `collection://7e42a0a2-5318-481b-8519-15c00392428c` |
| `training` | `/training/<slug>/` | `collection://d3778874-6b92-43e2-8e8e-e362e57e337c` |
| `learningJourneys` | `/learning-journeys/<slug>/` | `collection://d8dc5950-4492-4e58-a71a-b43f035fa88d` |

These ids are published on purpose. They identify a database; they do not grant
access to one. Reading anything needs `NOTION_TOKEN`.

## The properties

Every database carries the same six: **Title**, **Slug**, **Status**
(Idea / Drafting / Published), **Tags**, **SEO Title**, **SEO Description**,
**Cover** and **Retire URL**. Each property in Notion carries its own
description explaining what to put in it, so the database is self-documenting
for whoever is editing — this table is the summary, not the source.

What each adds on top:

| Database | Also has |
|---|---|
| **Posts** | `Published` (date), `Canonical URL` (for anything first published elsewhere) |
| **Talks** | `Date`, `Event`, `Location`, `Video URL`, `Slides URL` |
| **Training** | `Order`, `Format` (multi: On-site / Online / Blended), `Duration`, `Audience`, `Outcomes` |
| **Learning Journeys** | `Order`, `Summary`, `Starting point`, `Outcome`, and relations to Training, Talks and Posts |

`Format` on Training is a **multi**-select rather than a single, because most
courses genuinely run either way and forcing a choice would make the property a
lie on most rows.

## Learning journeys: the steps live in the body

A journey is a named path through a topic — who it is for, where it gets them,
and the ordered steps between. **The steps are the page body**, a numbered list
of headings, rather than a fifth database of step rows.

That is a deliberate trade. A steps database would give structured ordering and
a step template; the body gives free ordering, inline links, and an editor who
can write a journey in one screen instead of two. With a handful of journeys the
second is plainly better, and the first is always available later — the moment a
step needs to be *queried* rather than read, it wants its own row.

**The relations are not the steps.** `Training`, `Talks` and `Posts` say what a
journey draws on, and they are two-way: each course, talk and post gains a
`Learning Journeys` back-link, so a training page can show which journeys route
people to it without anything being typed twice.

## Four databases, not one

WordPress held blog posts and talks as **one post type split by a category**,
sharing a permalink base by convention. That is a WordPress limitation showing
through, not a model, and it does not survive the move.

They have almost no properties in common beyond a title and a date:

- A **talk** has a conference, a venue, a date it was given, usually a video and
  sometimes slides. Its most-asked question is "has Kenny spoken about X, and can
  I watch it".
- A **post** has none of those. Its question is "what does he think about X".
- A **training course** has a format, a duration, an audience and a set of
  outcomes, and it exists to be booked. It is the commercial half of the site and
  deserves the most property design of the four.
- A **learning journey** has none of those either. It is a route *between* the
  other three, and its properties are about a reader's starting point rather
  than about an artefact.

One database with a type field and thirty properties, two thirds of them blank on
any given row, is the thing to avoid. An editor filling in a form should not have
to know which fields do not apply to them.

## Derive state; never store it

**A talk is upcoming because its date is in the future**, not because somebody
ticked a box. Storing it means every talk page is wrong the morning after one
happens — on a day nobody edited anything and nothing deployed.

The rule lives in one module and runs twice: at build time to order the list, and
in the browser to re-check against the clock. The two must not disagree, which is
why it is one module and not two functions. virtualddd.com learned this on
sessions and then again on conferences.

The same applies to anything else time decides. If a property could be computed
from a date, compute it.

## Publish gates, per database

- **Posts, training**: `Status = Published`.
- **Talks**: `Status = Published`. Upcoming versus past is derived from the date,
  as above — there is no second switch.
- Only rows passing their gate produce files.

## Pictures must be Notion files, not links

A linked image is somebody else's uptime, and during this migration the somebody
is the WordPress site we are about to switch off.

virtualddd.com had eight organiser photos pointing at its old WordPress media
library. Swapping the document root 404'd all eight, and the next sync rewrote
every row without a photo and reported success. Upload into Notion; do not paste
a URL.

The sync **downloads** every picture into the entry's `_assets/` and references
it relatively, because a Notion file URL is signed and expires within the hour.
A download that fails never removes a picture the site already has: the copy from
the last good sync stands, and an `image-source-gone` alert names the URL that
died.

## One author, and what follows from it

Weave IT is one practitioner. There is no people database and there should not
be one — the author is three fields in `site.config.ts`.

This reaches further than it looks. In the structured data a `Person` is the
author *and* publisher of everything, referenced by `@id` from every node, rather
than an `Organization` with per-page authorship. See [seo.md](seo.md). It is the
single biggest structural difference from the site this pipeline came from, which
keeps two separate people databases for sixty external speakers.

If Weave IT ever publishes a guest post, that is the moment to add an author
field — not before.

## Adding a field

A field is cheap; a field nobody fills in is not. Two questions before adding
one:

1. **Would an editor know what to put in it without being told?** If it needs
   explaining, it probably wants to be a sentence in the body instead. "What
   someone does" belongs in their bio, not in a `Role` field beside it.
2. **Does it duplicate its own fallback?** An `SEO Title` that says the same
   thing as the title is a second copy to maintain. Write one only where the
   natural title runs long or is opaque; a blank field is a legitimate choice
   when the fallback is good.

Adding a whole collection is a dozen places, listed in
[template.md](template.md).
