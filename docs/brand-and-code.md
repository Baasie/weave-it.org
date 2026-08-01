# Brand and code conventions

The visual identity, the design rules that keep it, and how the code is
organised. Read this before writing CSS or adding a component.

Part of the working brief: [AGENTS.md](../AGENTS.md) is the map, and
[README.md](../README.md) is the front door.

---

# Brand

**Light ground, near-black text, teal as the primary, earthy secondaries. Share
for headings over Poppins for body.**

The CSS is built against tokens in `src/styles/tokens.css`, which also holds the
overlays and documents the **three breakpoints**: 640 / 800 / 900 px, with
`639.98` / `799.98` max-width companions. Only reusable surfaces are tokens: the
stops inside one component's scrim gradient are a shape, not a palette, and
naming each would produce tokens nobody could reuse.

> The current values were extracted from the live Divi theme on 2026-07-31.
> They are accurate to what is published, which is not the same as being the
> brand guide. Phase 2 of [MIGRATION.md](../MIGRATION.md) replaces them from the
> Art of Design source.

## The one trap, stated once

**Text on a brand fill is ink, not white.** This palette is light and saturated:
the olive `#B9AA3A` measures **2.37:1** against white — nowhere near the 4.5:1
small text needs — and **6.8:1** against the body ink.

So there are two tokens and they are not interchangeable:

- **`--on-brand`** (ink) for text on a *solid* fill: a chip, a button, a panel.
- **`--on-colour`** (white) for text over a *photograph*, where a dark scrim is
  already doing the work.

Conflating them is exactly what put white on cyan at 2.22:1 on virtualddd.com,
on the RSVP button, and it took a human review to find. **Write the browser
contrast test in phase 2, before there are twenty components** — not after.

The teal `#4B7D7D` measures 4.64:1 on white. It clears the bar, but only just, so
it is a *heading* colour: small print uses `--color-primary-ink`.

## Porting a component from virtualddd.com

Take the markup; **re-derive the colours**. That site is a near-black canvas with
two neons, and every overlay, scrim and `--on-*` decision in it was made for text
sitting *on* darkness. A component copied across without reading its colours will
look inverted and will usually fail contrast — quietly, because nothing renders
an error.

## Design rules

Anything not covered here is open. The brand is the fixed point, not the layout.

- **Text on photographs.** Never rely on a text-shadow alone. Anything set over a
  photograph gets a scrim or its own plate.
- **One primary action per view.** A training page sells one thing; do not put
  three equally-weighted buttons on it.
- **Never remove a focus ring.** `global.css` defines `:focus-visible` against the
  brand tokens because the browser default is nearly invisible on a light ground.
  A browser test asserts it is still there.
- **The accessibility floor**, each to be held down by a test: text on a brand
  fill clears 4.5:1; the first tab stop is the skip link and it lands in `<main>`;
  filtering announces its result count (`aria-live`); every `button` is at least
  24×24 — a link inside a sentence is exempt (WCAG 2.5.8, inline), a button never
  is. `prefers-reduced-motion` is honoured globally, because the motion here is
  decoration and never information.
- **Progressive enhancement is a rule, not a preference.** Every `<time>` ships a
  server-rendered fallback, filters only hide pre-rendered cards, and no page
  depends on JavaScript to show its content or to reach another page.
- `astro check` must stay at **0 errors, 0 warnings, 0 hints**.

---

# Code conventions

**Shared before local.** A pattern used by more than one section lives in the
shared layer, never copied into a second page. Copying is what once made
"restyle the cards" a sixteen-file edit on the site this came from.

- **`src/styles/tokens.css`** — the brand, and nothing else.
- **`src/styles/global.css`** — reset, base typography, focus ring, skip link.
  Deliberately small.
- **`src/styles/patterns.css`** *(phase 2)* — the shared UI vocabulary, loaded
  once by `BaseLayout`. Add variants **here**, not in a page's `<style>`.

  Build it when the *second* page needs a thing, not in advance. A stylesheet
  created early becomes a place things are added to rather than a place things
  are found.

  **Astro does not extend a page's style scope into a child component**, so a
  `.card` override written in a page's scoped `<style>` silently never matches.
  Variants must be global.

- **`src/lib/`** — pure helpers, no `astro:assets`. Anything needing a build to
  run belongs in its own module, or the rest stops being unit-testable. `seo.ts`
  is unit-tested precisely so it can be rewritten: the tests say what the output
  must still *mean*, not how the file is arranged.
- **`src/components/`** — one card component with variants, not four cards. When
  a second thing looks 80% like the first, that is a variant.
- **`src/scripts/`** — client-side behaviour, one module per concern, imported by
  `BaseLayout`'s single script. Anything a page needs on the client goes here,
  not into a page's `<script>`, so it can be read on its own.
- **Page `<style>` blocks are for what is genuinely local to that page.**
- **Responsive images are opt-in.** Serve one width where a box does not change
  size; pass `imgSizes` where it genuinely does.

## What `review.yml` is looking for

Conformance tests read what a machine can read from the files. What they cannot
see is **additive bias**: a component that should have reused an existing one, a
helper that duplicates one in `src/lib/`, a fourth way to render a card. Every
one of those is *imported by something*, so every mechanical check calls it used.
It is only visible in a diff, by a reader — which is what that workflow is.
