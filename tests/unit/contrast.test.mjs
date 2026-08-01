/**
 * Every text-on-fill pairing the design uses, measured.
 *
 * **This is the test MIGRATION.md phase 2 asks for**, and the reason it asks
 * early rather than late: virtualddd.com shipped white-on-brand at 2.22:1,
 * found it by hand, and only then wrote this. On the Weave IT palette the trap
 * is worse, because the fills are lighter — white on the olive is 2.37:1 and
 * looks perfectly pleasant on a screen.
 *
 * It reads the real `tokens.css` rather than a copy, so a token that changes
 * value is caught here rather than by somebody looking at a page. It asserts
 * *relationships* between tokens, never that a token holds a particular hex —
 * the brand is allowed to be adjusted, and this must not be the file that
 * forbids it. What it forbids is an adjustment that makes something unreadable.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../../src/styles/tokens.css', import.meta.url), 'utf8');

/** Every `--name: value` in `:root`. */
function tokens() {
  const out = {};
  for (const [, name, value] of css.matchAll(/^\s*(--[a-z0-9-]+):\s*([^;]+);/gim)) {
    out[name] = value.trim();
  }
  return out;
}

const T = tokens();

const luminance = (hex) => {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? [...h].map((c) => c + c).join('') : h;
  const [r, g, b] = full
    .match(/../g)
    .map((x) => parseInt(x, 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const ratio = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

/** Resolve a token name to a hex value, following one level of `var()`. */
const value = (name) => {
  const raw = T[name];
  assert.ok(raw, `${name} is not defined in tokens.css`);
  const via = raw.match(/^var\((--[a-z0-9-]+)\)$/);
  return via ? T[via[1]] : raw;
};

/**
 * WCAG AA: 4.5:1 for body text, 3:1 for text at 24px, or 18.7px bold.
 *
 * Each case says which threshold applies and why, because "it is a heading" is
 * not the same claim as "it is 24px" and only the second one is true of a
 * particular element.
 */
const AA = 4.5;
const AA_LARGE = 3;

test('body text is readable on the page ground', () => {
  assert.ok(
    ratio(value('--color-text'), value('--color-bg')) >= AA,
    'body copy on the sage ground must clear 4.5:1',
  );
});

test('muted text is readable on the page ground', () => {
  // The sage is light, so there is very little room here — this is the token
  // most likely to be nudged lighter by someone wanting a softer grey.
  assert.ok(
    ratio(value('--color-text-muted'), value('--color-bg')) >= AA,
    'muted text on the sage ground must clear 4.5:1; the sage leaves almost no headroom',
  );
});

test('an article title is readable on the page ground', () => {
  assert.ok(ratio(value('--color-heading'), value('--color-bg')) >= AA);
});

test('in-prose subheadings use the darker teal, not the brand teal', () => {
  // A 21px subheading is not "large text", so the brand teal's 3.07:1 is not
  // enough for it. This is why `--color-primary-ink` exists.
  assert.ok(
    ratio(value('--color-primary-ink'), value('--color-bg')) >= AA,
    '--color-primary-ink must carry small text on the sage',
  );
});

test('display headings may use the brand teal, because they are large', () => {
  assert.ok(ratio(value('--color-primary'), value('--color-bg')) >= AA_LARGE);
});

test('--on-brand is readable on every brand fill', () => {
  // The whole point of the token: one ink that works on all of them, so no
  // component has to decide. If a brand colour is ever changed, this is what
  // notices that the ink no longer covers it.
  for (const fill of ['--color-accent', '--color-moss', '--color-moss-soft']) {
    const r = ratio(value('--on-brand'), value(fill));
    assert.ok(r >= AA, `--on-brand on ${fill} is ${r.toFixed(2)}:1, needs ${AA}:1`);
  }
});

test('--on-colour is readable on the two dark bands, and only those', () => {
  for (const fill of ['--color-primary', '--color-bark']) {
    const r = ratio(value('--on-colour'), value(fill));
    assert.ok(r >= AA, `--on-colour on ${fill} is ${r.toFixed(2)}:1, needs ${AA}:1`);
  }
});

test('white is NOT used on the olive, and the tokens still prove why', () => {
  // A guard against the fix being quietly undone. If someone "simplifies"
  // `--on-brand` to white, the assertion above catches it; this one documents
  // the number that makes it wrong, and fails if the olive is ever lightened
  // enough that the whole argument stops holding.
  const r = ratio(value('--on-colour'), value('--color-accent'));
  assert.ok(
    r < AA_LARGE,
    `white on the olive measures ${r.toFixed(2)}:1 — if this ever passes, the ` +
      'comments in tokens.css and patterns.css need rewriting, not the code',
  );
});

test('the pale olive carries text on the brown band', () => {
  assert.ok(ratio(value('--color-accent-pale'), value('--color-bark')) >= AA);
});

test('the darkened green carries an eyebrow on the sage', () => {
  assert.ok(ratio(value('--color-moss-ink'), value('--color-bg')) >= AA);
});

test('nothing tinted can pass on the teal, so white is the only option there', () => {
  // Not a style rule — a fact about the colour, recorded so the next person to
  // try a gold link on the teal band finds out here instead of from axe.
  const ceiling = ratio('#ffffff', value('--color-primary'));
  assert.ok(
    ceiling < 5,
    `the teal tops out at ${ceiling.toFixed(2)}:1 against pure white; anything ` +
      'tinted is below 4.5:1 by construction',
  );
});

test('the current-page nav marker is readable', () => {
  assert.ok(ratio(value('--color-moss-ink'), value('--color-bg')) >= AA);
});
