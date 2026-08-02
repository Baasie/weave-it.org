---
name: review-change
description: Review a change to this site against the working brief, for what a test cannot see — unverified claims, reuse, additive bias, and the rules AGENTS.md admits nothing checks. Use before committing work that touches src/ or tests/, and in CI on push.
---

# Reviewing a change here

**The rules are in [AGENTS.md](../../../AGENTS.md), and this file does not
repeat them.** It carries the procedure. If you find yourself wanting to list
the rules here, read `CLAUDE.md` first: *a second copy is a copy that will
drift*. The hook list in `docs/testing.md` proved it — hand-maintained, and by
the time anyone looked it was thirteen short and named two hooks that no longer
existed.

## What this is for

`tests/conformance.test.mjs` already enforces what a machine can read from the
files: no test coupled to a styling class, no colour literal outside
`tokens.css`, no orphaned component, no export without a caller. **Do not
re-check those.** If they are broken, the build is already red.

This exists for what is only visible in a *diff*:

- **Unverified claims.** The commonest defect here, and the one worth reading
  for first — see below.
- **Reuse.** A machine sees that a new component is imported somewhere and calls
  it used. It cannot see that it is the fourth way to render a card.
- **Additive bias.** Adding is easy and deleting is frightening, so codebases
  grow monotonically unless somebody asks. Nothing in the suite asks.
- **The rules AGENTS.md marks "nobody".** Rule 4 (propose options, then ask) and
  rule 6 (small steps) have no machine behind them, on purpose. They are yours.

## Who wrote the code you are reviewing

**Almost certainly a coding agent, in one long session, with one person
supervising.** That is the working arrangement here — one maintainer, no second
reviewer — and it changes what this review is for.

A community repository needs review because many hands pull in different
directions. This one does not have many hands. What it has is a great deal of
code written quickly and confidently, by something that writes prose as fluently
as it writes code, and *the prose is not checked by anything*. Tests cover the
code. Nothing covers a comment that says 4.9:1 when the value is 1.87:1.

So the dominant failure mode here is not divergence. It is **an assertion made
confidently and never verified.** Four real examples, all from a single session
on this repository:

| What was written | What was true |
|---|---|
| A comment: "brown on the green is 4.9:1" | 1.87:1 — the worst pairing on the site |
| `docs/template.md` naming five generic files | None of the five existed any more |
| A `--on-brand` token, with a careful note on why it is ink | A malformed comment above it meant the declaration never parsed |
| "The tag filter works — 25 entries become 16" | True of the DOM property; nine cards stayed on screen |

Every one looks right. Every one *reads* as though somebody checked. None of
them was caught by a test, a type, or a linter, because none of them is a code
defect — they are claims. Three were found later by measuring; one shipped.

### How to review for it

Cheap, and the highest-yield thing in this file:

1. **Every number in a comment or a commit message is a claim.** Contrast
   ratios, file counts, page counts, "this is 40% smaller". Recompute one or two
   of the load-bearing ones. If a number cannot be recomputed from the diff, ask
   where it came from.

2. **Every "so that" is a claim about behaviour.** "Hidden so the filter removes
   it", "absolute so it resolves". Ask what would happen if it were false, and
   whether anything in the diff would notice. `hidden` on a `display: flex`
   element is the canonical case: correct-looking, and inert.

3. **A comment naming a file, a token or a rule is a claim it exists.** Grep for
   it. Renames are frequent here and comments do not move with them.

4. **"Verified", "measured", "confirmed" in a commit message.** Against what? If
   the diff adds no test and names no command, the word is doing work the author
   did not do.

5. **Prefer one recomputed number to five opinions.** A review that says "I
   remeasured the three contrast claims in `tokens.css`; two hold, the third is
   2.4:1 not 4.6:1" is worth more than a page of judgement.

This is not an invitation to distrust everything — most of it will be right, and
a reviewer who queries every line is one nobody reads. Sample the claims that
would be expensive to have wrong: anything about accessibility, anything about
the URL contract, anything a later reader would take on faith rather than check.

## Procedure

Work from the diff, not from the files. A file that reads fine can still be the
wrong change.

```sh
git diff origin/main...HEAD --stat          # shape first
git diff origin/main...HEAD -- src/ tests/  # then the substance
```

1. **Read the shape before the substance.** Which sections moved? A change
   touching four sections at once is worth questioning against rule 6 even if
   every line of it is good.

   Then pick two or three claims out of the diff and check them, before you have
   formed an opinion about anything else. See "Who wrote the code you are
   reviewing" — this is the step most likely to find something real, and the
   easiest to skip once you are absorbed in the structure.

2. **For every added file, ask what already did this.** Search before judging —
   `src/components/` and `src/lib/` are small enough to know:

   ```sh
   ls src/components src/lib
   ```

   A new card component beside `TeaserCard`, a new date helper beside
   `src/lib/dates.ts`, a second way to resolve a person beside
   `src/lib/people.ts` — each is a finding unless the diff or the commit
   message says why the existing one did not fit.

3. **For every added block of CSS, ask what `patterns.css` already has.** The
   patterns file exists because three archives had each written their own filter
   bar. A page-scoped `<style>` that redefines a card, a chip or a grid belongs
   in the pattern, or the pattern needs a variant.

4. **Ask what the change deleted.** Not rhetorically — run it:

   ```sh
   git diff origin/main...HEAD --numstat -- src/ | awk '{a+=$1; d+=$2} END {print a" added, "d" deleted"}'
   ```

   A change that only adds is not automatically wrong. A *series* of changes
   that only add is additive bias, and this is the moment it is visible.

5. **For anything a visitor sees, check rule 4 was honoured.** Was the friction
   named and were options offered, or did somebody redesign and then explain?
   The evidence is in the commit message and the conversation, not the code.

6. **Check the change is finishable.** Does it leave the site in a state
   somebody could ship, or does it need a second commit to make sense? Sections
   ship independently here.

## What is not a finding

Noise costs more than it looks: a reviewer that reports twelve things gets read
once and skipped thereafter.

- Anything `tests/conformance.test.mjs` covers. It is already red or already green.
- Anything under `src/content/`. That is Notion's, written by the sync, and no
  human should be editing it — a separate CI step already fails that push.
- Style preferences the brief does not express. Long functions, comment density,
  naming — this repository has its own voice and it is not yours to normalise.
- A missing test for something the existing suite already covers by relationship.

## Reporting

Lead with the verdict, then the findings, worst first. For each one: the file
and line, what the change did, what already existed, and the smallest fix.

Be specific about confidence. "This duplicates `TeaserCard`" and "this may
duplicate `TeaserCard`, I did not check every prop" are different claims and the
reader needs to know which they are getting.

If the change is sound, say so in one line and stop. A review that manufactures
a finding to look useful trains people to ignore the next one.

Finish with the one question worth asking the maintainers, or "none".
