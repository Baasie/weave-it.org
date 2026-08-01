/** Redirect coverage: every inherited URL is deliberately handled.
 *
 * This runs `scripts/check-redirects.mjs`, which simulates mod_rewrite against
 * `public/.htaccess`. A simulation is not the real thing — Apache/LiteSpeed is
 * the authority — so `scripts/verify-live.mjs` re-checks the same list against
 * a deployed host at cutover. This test catches the mistakes that are cheap to
 * catch early: a rule pointing at a page that does not exist, a URL nobody
 * thought about, a redirect chain.
 *
 * **Two of these three tests do not care which build is in `dist/`.** The
 * `.htaccess` is generated from `data/` and `src/content/`, so it can be
 * checked against its own inputs whatever was built. Only the coverage test
 * needs pages, and it is the one that has to know — see its own comment.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { COLLECTIONS, SECTION, entries, isStaging } from './helpers.mjs';

/** Run the checker and hand back its output, pass or fail. */
const check = () => {
  try {
    return execFileSync('node', ['scripts/check-redirects.mjs', '--all'], { encoding: 'utf8' });
  } catch (e) {
    return `${e.stdout ?? ''}${e.stderr ?? ''}`;
  }
};

test('every inherited URL is served, redirected or Gone', () => {
  const out = check();
  const n = (label) => Number(out.match(new RegExp(`${label}\\s*:\\s*(\\d+)`))?.[1] ?? 0);
  const handled = n('served by a page') + n('redirected \\(301\\)') + n('gone \\(410\\)');
  const problems = Number(out.match(/(\d+) problem\(s\)/)?.[1] ?? 0);
  // `--all`, so the list is complete rather than the checker's forty-line
  // courtesy to a human reader. Judging "is every unhandled address explained?"
  // on a truncated sample is judging on a sample and calling it a proof.
  const named = [...out.matchAll(/^\s+(\/\S+) — (.*)$/gm)].map((m) => ({ url: m[1], why: m[2] }));

  // Every one of the 244 addresses is accounted for either way: handled, or
  // counted as a problem. A total that does not add up means the checker itself
  // changed shape, and every assertion below rests on its output.
  assert.equal(handled + problems, 244,
    `the URL inventory should be fully accounted for, got ${handled + problems}`);

  if (isStaging()) {
    assert.match(out, /all indexed URLs are handled/,
      `a staging build shows every entry, so nothing should be unhandled:\n${out}`);
    return;
  }

  // On a production build the content is not published yet, so the pages those
  // addresses need do not exist. That is the migration's actual state (phase
  // 3c), not a broken redirect — but it must not become a blanket excuse.
  //
  // So: the shortfall has to be *exactly* the editorial backlog. Anything
  // unhandled that is not an unpublished entry of ours is a rule that stopped
  // matching, and fails here even in production mode.
  const awaiting = new Set();
  for (const c of COLLECTIONS) {
    for (const e of entries(c)) {
      if (e.status !== 'Published') awaiting.add(`/${SECTION[c]}/${e.id}/`);
    }
  }

  // A problem is explained if the address itself is unpublished content, *or*
  // if it is a redirect whose destination is. `/project/<slug>/` 301s to a talk
  // — the rule is right and the target simply is not published yet, which is
  // the same backlog one hop further on.
  const explained = ({ url, why }) =>
    awaiting.has(url) || [...awaiting].some((a) => why.includes(a));

  const notExplained = named.filter((p) => !explained(p)).map((p) => `${p.url} — ${p.why}`);
  assert.deepEqual(notExplained, [],
    'these URLs are unhandled and are not content awaiting publication — a rule stopped matching:\n' +
    notExplained.join('\n'));
  assert.equal(named.length, problems,
    'the problem list was truncated, so the check above ran on a sample');
});

test('www redirects to the bare domain, once, before anything else', () => {
  // Two properties worth pinning: the rule is guarded by a host condition (or
  // its catch-all pattern would swallow every path), and it comes first (or a
  // www request takes a path hop before being sent home, which is two
  // redirects where the contract promises one).
  const lines = readFileSync('public/.htaccess', 'utf8').split('\n');
  const i = lines.findIndex((l) => /^RewriteCond\s+%\{HTTP_HOST\}\s+\^www\\?\./.test(l));
  assert.ok(i >= 0, 'no host condition for www in public/.htaccess');

  assert.match(lines[i + 1], /^RewriteRule\s+\^\(\.\*\)\$\s+https:\/\/\S+\/\$1\s+\[R=301,L\]/,
    `the line after the www condition is not the redirect: ${lines[i + 1]}`);

  const first = lines.findIndex((l) => l.startsWith('RewriteRule'));
  assert.equal(first, i + 1, 'a path rule runs before the www redirect, which costs a second hop');
});

test('the committed .htaccess is what the generator would write today', () => {
  // `public/.htaccess` is generated from `data/` and `src/content/`, and
  // regenerating it is something a person has to remember.
  //
  // The coverage test above cannot notice when they forget: a rule that *should*
  // exist and does not satisfies "every URL is handled" perfectly, because the
  // address it would have covered is not in the inventory yet. This is the
  // difference between the file and its inputs, and it is the whole reason
  // `--out=` exists in the generator.
  assert.ok(existsSync('public/.htaccess'), 'public/.htaccess is missing');
  const dir = mkdtempSync(join(tmpdir(), 'htaccess-'));
  try {
    const out = join(dir, '.htaccess');
    execFileSync('npx', ['tsx', 'scripts/build-redirects.ts', `--out=${out}`], { encoding: 'utf8' });
    assert.equal(
      readFileSync(out, 'utf8'),
      readFileSync('public/.htaccess', 'utf8'),
      'public/.htaccess is out of date with its inputs — run `npm run redirects` and commit the result',
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
