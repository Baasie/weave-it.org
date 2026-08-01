# weave-it.org

The website of **[Weave IT](https://weave-it.org)** — collaborative software
design, Domain-Driven Design and architecture decision-making. Consultancy,
training and talks by Kenny Baas-Schwegler.

> **This site is mid-migration.** WordPress is still what
> [weave-it.org](https://weave-it.org) serves today. This repository is the
> static Astro site that replaces it. **[MIGRATION.md](./MIGRATION.md)** is the
> plan and the current state; read it before wondering where something is.

**What is in this repository:** the code that builds the site, plus a committed
copy of its content. The content itself is written in **Notion**, not here.

## Work on the site

```bash
npm install
npm run dev      # http://localhost:4321
```

You do **not** need a Notion token to build, test or work on the site, because
the content is committed. A token is only needed to pull fresh content.

**Read [AGENTS.md](./AGENTS.md) before changing anything.** It is the working
brief, and it is short: the rules that must not be broken, and a map of where the
detail lives. It is written to be read by a person or by a coding agent, so use
whichever agent you like — they all read the same file.

Two rules shape most decisions:

- **The brand is the fixed point.** Layout, copy and structure are open to
  improvement. The visual identity is not up for redesign.
- **URLs are promises.** The site answers every address the WordPress site
  answered — 244 of them, many linked from conference pages and other people's
  posts. `npm run check:urls` proves each one is served, redirected once, or
  deliberately Gone.

### Commands

Everyday:

| Command | What it does |
|---|---|
| `npm run dev` | Local dev server. No search index — `/search/` says so |
| `npm run build` | Static build to `dist/`, pruned, then indexed for search |
| `npm run preview` | Serve the built site |
| `npm test` | The blocking suite |
| `npm run test:quick` | Unit rules and contracts only, for a fast loop |

Less often:

| Command | What it does |
|---|---|
| `npm run test:content` | What an editor could improve. Never fails a deploy |
| `npm run check:urls` | Assert every inherited URL is served, redirected or Gone |
| `npm run redirects` | Regenerate `public/.htaccess` from `data/live-urls.txt` |

Needing a Notion token or a deployed host:

| Command | What it does |
|---|---|
| `npm run sync` | Pull every collection from Notion |
| `npm run sync:<name>` | One collection, for a targeted run |
| `node scripts/verify-live.mjs <url> --all` | Ask a deployed host about every address |

## How it gets to the web

```
Notion ──► sync (hourly, or on publish) ──► build + test ──► release ──► notify
```

An hourly job pulls Notion, commits whatever changed, and deploys it. A typo
fixed in Notion is live within the hour.

Tests gate the deploy, so if they fail the previous release stays up. Releases
are atomic — each is rsynced into its own directory and the document root is a
symlink swapped when the copy is complete — so nobody ever sees a half-written
site and rolling back is one command. Once a week the deployed site is asked
whether it still answers every address it promises, and how long its certificate
has left.

If every automated part of that breaks, publishing degrades to a script and a
commit:

```bash
npm run sync     # needs NOTION_TOKEN in local.env
npm test
git commit -am "Content: …" && git push
```

That fallback is a deliberate constraint rather than an accident. Nothing in the
chain is allowed to become the only way to publish. The reasoning is in
[docs/pipeline.md](./docs/pipeline.md).

## Where this came from

The build, the workflows, the URL contract and the Notion pipeline are ported
from **[virtualddd.com](https://github.com/Virtual-Domain-driven-design/virtualddd.com)**,
which made the same move off the same host in July 2026. What is generic and what
belongs to one site is written down in **[docs/template.md](./docs/template.md)**,
and keeping that file honest is what will let a third site start from a template
rather than from a copy.

## Licence

Split on purpose. See [LICENSE-CONTENT](./LICENSE-CONTENT) for the detail.

| | |
|---|---|
| Code | [MIT](./LICENSE) — take it, it is the half meant to travel |
| Content under `src/content/` | © Kenny Baas-Schwegler, all rights reserved. Quoting with attribution needs no permission |
| Photographs and brand assets | All rights reserved, ask first |
