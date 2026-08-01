# From Notion to the site

How a change in Notion becomes a deployed page, what the sync does and does not
do, and what it asks a person to decide.

Part of the working brief: [AGENTS.md](../AGENTS.md) is the map, and
[README.md](../README.md) is the front door.

---

# From Notion to the site

Build in **CI only**, never on the host. And the whole pipeline is *automation
over a manual process*: running the sync and `git push` by hand must always
produce a correct deploy. If every automated part breaks, publishing degrades to
a script and a commit, never an outage. Keep it that way.

```
                     ┌── n8n, hourly ──┐
Notion ──────────────┤  n8n dispatch   ├──► sync.yml ──► deploy.yml ──► notify
        (something   └── GitHub cron ──┘     (~20s)      build, test,
         published)      (backstop)                       rsync
```

**The clock does the work. An event is only ever a shortcut.**

- **Editing rides the clock**: an hourly sync, no watcher at all. Notion's "page
  updated" cannot tell a new publication from a typo on an old one, so filtering
  it would fire on every keystroke-sized change. Not watching is simpler than
  throttling.

  It is also what makes the pipeline self-healing, and the reason nothing else
  needs to be. The hourly run holds no state, cares nothing for why the last run
  did not happen, and re-reads everything. A missed event, a failed deploy or an
  afternoon with n8n switched off all cost latency and nothing else.

- **The clock is n8n's, not GitHub's.** GitHub delays and drops scheduled runs on
  a repository that is mostly quiet — on virtualddd.com, a cron asking for `:25`
  fired at 00:53, 04:37, 06:02, 07:57, 10:55 and 13:07 across one day. "Live
  within the hour" was quietly a three-hour promise. So n8n fires the same
  `repository_dispatch` hourly and the cron in `sync.yml` stays on as the backstop
  for a day n8n is off. Two clocks overlapping cost a minute of CI, which is the
  price of not having to trust either one.

- **Drift heals nightly** (`--full`, 03:17 UTC). The hourly run only re-fetches a
  body Notion says has changed, so anything that goes stale *without* an edit — an
  image whose source died, a page the sync skipped on a bad day — is only ever
  caught here. It stays on GitHub's cron, and can afford to: nobody minds drift
  healing at 05:00 instead of 03:17.

**Nothing deploys unless the sync produced a diff.** The generated markdown is
committed, so `git diff --quiet` is the whole test.

**The deploy builds the commit the sync just made, and says which.** A called
workflow runs at the *caller's* commit, and the sync commits after its own run
has begun. So `deploy.yml` takes a `ref` input and `sync.yml` passes the sha it
pushed. Without it, every sync-triggered deploy ships the site as it stood
*before* the content it was called to publish: a green run, a correct summary,
and a site one commit behind. That defect stayed invisible on virtualddd.com for
weeks precisely because nothing printed which commit was being built. The
`What is being built?` step exists for that reason.

## The sync is incremental

`data/sync-state.json` records, per page, the slug and Notion's
`last_edited_time` at the last render.

- **Front matter is rebuilt every run**, because properties arrive free with the
  list query.
- **A body is re-fetched only when Notion says that page changed.** Bodies are
  the expensive part, about two seconds each.

Trailing blank lines are normalised where the file is written, not in either
branch, so a fetched body and a reused body are byte-identical. Without that a
changed page flip-flops between syncs and "no diff, no deploy" quietly becomes
false.

## Generated content is not editable here

`src/content/` is written by the sync and never edited in this repository. Three
layers keep that true, because with an incremental sync a stray edit would
otherwise *persist* rather than being overwritten within minutes:

- **The sync notices.** `sync-state.json` records a digest of every body it
  wrote. If the file on disk no longer matches, the page is refetched and the
  edit is named in the log. A missing digest counts as unknown provenance and
  also refetches — a guard that trusts by default is a decoration.
- **CI refuses to deploy it.** A push touching `src/content/` by anyone other
  than `weave-it-sync` fails the deploy with an explanation.
- **CODEOWNERS** puts the maintainer on any pull request that touches it.

None of this is about mistrust. The edit would simply be lost on the next sync,
and it is kinder to say so immediately than to let someone write something that
quietly disappears.

## When an editorial change breaks a URL

A URL is a promise. Two ordinary actions in Notion break one, and the sync
handles both rather than leaving them to be noticed.

- **A renamed slug** is not ambiguous: the same page id under a new slug is a
  fact. The sync writes the `301` itself into `data/retired-urls.csv`, which
  `build-redirects.ts` reads.
- **A page that stops being published** is ambiguous, so the editor says which
  they meant with a **`Retire URL`** checkbox:
  - **ticked** → the page goes and the address answers `410 Gone`.
  - **not ticked** → **quarantine.** The page keeps being served, everything else
    deploys, and an alert asks a person. An accidental unpublish must not silently
    404 an address other people have linked to, and it must not block everyone
    else's publishing either.
  - **never had a public URL** → just removed; there is no promise to keep.

## Things only an editor can decide

`data/sync-alerts.json` collects what the sync can see but must not act on:

- **`unpublished-but-live`** — the quarantine above.
- **`published-without-a-slug`** — a page Notion calls published that has no
  address. Skipping it is right; skipping it *silently* is not, because the
  editor believes it is on the site.
- **`image-source-gone`** — the picture in Notion points somewhere that stopped
  answering. The last downloaded copy stands, so the page is still right; only an
  editor can re-upload the original.

Neither is worth failing a run over, and all are invisible if they only reach a
CI log — which is the whole reason the file exists. It is keyed by section and
rewritten every run, so resolving the last one empties the list rather than
leaving a stale alert behind.

It carries **no timestamp**, on purpose: a `generated` field would change every
run and "nothing deploys unless the sync produced a diff" would quietly become
false.

**It must be committed, and `.gitignore` must never claim it.** The "has this
changed?" test is `git status --porcelain` on that one file, and for an ignored
file the answer is always nothing — so every alert takes the "already raised"
branch and reaches nobody. On virtualddd.com that hid every alert the pipeline
ever produced, including the eight lost photos. `sync.yml` now fails outright if
the file is ignored, because that failure is silent and looks exactly like having
nothing to say.
