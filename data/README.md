# data/

Committed inputs that the build reads, and the files the sync writes back.
**None of them are safe to delete.**

| File | What it is |
|---|---|
| `live-urls.txt` | The URL contract: every public address this site promises to answer. `npm run check:urls` proves each is served, redirected once, or `410 Gone`. |
| `attachment-pages.csv` | The 97 WordPress attachment pages — a root-level slug per uploaded file — and the file each redirects to. Generated once from the XML export by `import-wordpress.ts attachments`, then frozen: WordPress is going away and these will not grow. |
| `retired-urls.csv` | **Generated.** Written by the sync when a slug is renamed or a page is retired in Notion. `build-redirects.ts` folds it into the `.htaccess`, so the run that breaks a URL is the run that keeps the promise. |
| `sync-state.json` | **Generated.** What the last sync saw, per page: the slug, Notion's `last_edited_time` and a digest of the body written. It is what makes the sync incremental and what notices a generated file edited by hand. |
| `sync-alerts.json` | **Generated.** What the last sync wants a person to decide. Committed on purpose — `sync.yml` raises an alert only when this file's own diff says it is new, so an ignored or uncommitted copy means no alert is ever raised. Resolving something empties it. |

## live-urls.txt

Taken from the Yoast sitemaps and the WordPress REST API on 2026-07-31, then
extended from the XML export on 2026-08-01: **244** addresses, of which 54 are
posts, 21 pages, 97 attachment pages, 57 tag archives and the rest WordPress
machinery.

The 97 attachment pages are the argument for taking an export at all. They are
in no sitemap and not in the REST API's page list, so the first inventory — built
from exactly those two sources — contained none of them, and all 97 are live.

**It is not yet complete.** The sitemap knows what WordPress currently
*publishes*, not what people have *linked to*. Phase 5 of
[MIGRATION.md](../MIGRATION.md) tops it up from Google Search Console and the
host's access logs, which is where old attachment pages, `?p=<id>` permalinks and
pre-2020 slugs come from.

Adding to it is always safe. **Removing from it is not**: an address in this file
is a promise, and deleting the line is how a promise gets broken without anyone
deciding to break it. If `check:urls` reports a problem, fix the rule — do not
delete the URL.

## sync-alerts.json and .gitignore

This file must be committed, and `.gitignore` must never claim it. The "has this
changed?" test is `git status --porcelain` on that one file, and for an ignored
file the answer is always nothing — so every alert would take the "already
raised" branch and reach nobody. `sync.yml` fails outright if the file is
ignored, because that failure is silent and looks exactly like having nothing to
say.

---

If a file here looks like a leftover, read [docs/urls.md](../docs/urls.md) before
touching it. Losing `live-urls.txt` means losing the ability to prove the site
still answers the addresses people have bookmarked.
