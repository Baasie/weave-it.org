# Running the live site

The host, the deploy, rollback, cutover and the weekly check.

Part of the working brief: [AGENTS.md](../AGENTS.md) is the map, and
[README.md](../README.md) is the front door.

---

# The host

**Kualo shared hosting**, the same account that serves virtualddd.com. Apache /
LiteSpeed with `.htaccess`, SSH and rsync.

The deploy is atomic: every release is rsynced into `~/releases/<sha>` and the
document root is a **symlink** swapped once the copy is complete. Nobody sees a
half-written site, and a rollback is one command. The last five releases are
kept.

```
/home/<user>/weave-it.org            → ~/releases/<sha>    the live site
/home/<user>/weave-it.org.wordpress                        the old site, parked
/home/<user>/staging.weave-it.org    → ~/releases/<sha>    during the migration
```

## Cutover

**CI will not touch a document root that is a real directory.** It checks and
fails rather than deleting anything, because a real directory there might be
somebody's live site and a deploy job is not the place to find that out. So
pointing the domain at the build is a deliberate human step:

```bash
# on the host:
mv ~/weave-it.org ~/weave-it.org.wordpress     # keep the old site
ln -sfn ~/releases/<sha> ~/weave-it.org        # point at the newest release
# then set KUALO_PATH to the absolute docroot and SITE_URL to the domain.
```

**`KUALO_PATH` must be an absolute path.** It is interpolated inside single
quotes in a shell on the host, so `~` is never expanded. A value starting with
`~` fails at the very last step with `ln: failed to create symbolic link: No such
file or directory` — after a successful build and a successful upload. The
workflow checks for it and says so, which is cheaper than rediscovering it.

Roll back at any time by pointing the symlink at an earlier release:

```bash
ls -1dt ~/releases/*/                          # newest first
ln -sfn ~/releases/<older-sha> ~/weave-it.org
```

## The parked WordPress directory keeps the bytes, not the addresses

This is worth being precise about, because the obvious reading is wrong and it
was wrong in this file until the XML export proved it.

Parking `~/weave-it.org.wordpress` keeps the **files on disk**. It does *not*
keep `https://weave-it.org/wp-content/uploads/…` answering: the document root
is a symlink to the Astro release, so those requests resolve *inside the
release* and would 404 the moment the symlink moves.

Other people's posts, slide decks and Notion pages link straight into that
directory, and 97 attachment-page redirects land in it. So the media the site
still owes the web is **committed under `public/wp-content/uploads/`** — 103
files, 8.2 MB — and is served by the new site directly. See
[urls.md](urls.md).

Keep the parked directory anyway. It holds the ~700 generated thumbnail sizes
that are not committed, and it is the only copy of anything the inventory
missed. Do not delete it on the strength of the new site looking fine — but do
not rely on it to serve a URL, either.

## Certificates

Let's Encrypt via the host. If it is a per-domain AutoSSL certificate it renews
over the HTTP challenge and `public/.well-known/acme-challenge/` has to keep
being served; if it is a wildcard it renews over DNS and that directory is
decoration. Either way, `watch.yml` reports how many days are left, because a
renewal that quietly stopped is silent until the day it expires.

Two thresholds, doing different jobs. **Under 21 days** gets a message: it should
have renewed by now, worth an eye. **Under 14 days**, or any broken address,
fails the run — and a failed scheduled run emails from GitHub directly, rather
than through n8n and a webhook. The louder signal deliberately does not travel
the same kind of chain it is watching.

## Watching it, once a week

`watch.yml` asks the deployed site on Mondays what no test in this repository
can: whether every inherited address is still answered by real Apache, and how
long the certificate has left. Both rot without anyone touching this repository —
a host config change, a restore that loses the `.htaccess`, a renewal that
stopped. None of that is a commit, so none of it can fail a build.

It reports only when something is wrong. A weekly "still fine" is a message
people learn to skip, and the run is already the record. Weekly rather than daily
because a request for every address is a real load on a shared host, and neither
failure is one you would fix within the hour.

## When a deploy fails to reach the host

Kualo's brute-force protection (cPHulk) blocks GitHub runner IPs at random.
Re-run the deploy; a different runner has a different IP. The workflow tests the
port before trying to connect and says this explicitly, because the alternative
was a deploy failing in six silent seconds with nothing in the log.

## Keeping the packages current

`dependabot.yml` opens **one** pull request most Mondays: everything patch and
minor, grouped. Ungrouped it would open five, and five nobody reads is the same
as none — except that it also teaches everyone to ignore the notification. The
GitHub Actions are watched the same way.

A routine group **merges itself** once the suite has passed on it. What makes
that safe is not the bot: `deploy.yml` answers pull requests too, so types,
build, contracts, redirects and the browser suite all run on the bump before
anything merges, and the same suite runs again before the rsync. A bump that
breaks the site cannot reach the host.

**A major waits for a person.** Dependabot gives it its own pull request outside
the `routine` group, the branch name does not match, and nothing merges it. Astro
8 is a reading job, not an update.

The merge runs on `workflow_run` rather than the obvious `pull_request`, for two
reasons worth not rediscovering: a workflow triggered by Dependabot gets a
read-only token and cannot merge anything, and protecting `main` with a required
check — the usual alternative — would block the direct pushes this project
publishes by. The sync bot commits to `main` all day.

## Secrets

| Secret | What for |
|---|---|
| `KUALO_HOST`, `KUALO_USER`, `KUALO_SSH_KEY`, `KUALO_SSH_PORT`, `KUALO_PATH` | The deploy |
| `SITE_URL` | What `verify:live` and `watch.yml` ask |
| `NOTION_TOKEN` | The sync |
| `N8N_DEPLOY_WEBHOOK`, `N8N_WEBHOOK_TOKEN` | Notifications |
| `ANTHROPIC_API_KEY` | The advisory reviewer. Optional; without it `review.yml` says so rather than silently doing nothing |

Repository **variables**, not secrets: `PUBLIC_ANALYTICS_SRC` and
`PUBLIC_ANALYTICS_DOMAIN`. Both appear in the page source of every page, so
hiding them would only make them harder to change.

**Anyone with write access to this repository can read every secret.** Not
because anything is misconfigured: a secret is hidden from logs and from the
public, never from someone who can push a workflow that prints it. What follows
is that **the SSH key is only as safe as the GitHub accounts with write access**.
Require two-factor authentication, and restrict the key where it *lands* rather
than only where it is stored — `restrict,command="…"` in `authorized_keys` on the
host turns a stolen key from a shell into one rsync.

Every workflow declares `permissions:`. Only `sync.yml` has `contents: write`,
because committing the synced content is its whole job.
