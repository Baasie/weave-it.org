/**
 * Dates and excerpts.
 *
 * `excerpt` is the one worth testing properly: it is the fallback that runs
 * whenever an editor has not written an SEO description, which today is most of
 * the training pages — so what it picks *is* the summary a visitor reads on a
 * card and a search engine reads in a result.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { excerpt, formatDate, isoDate } from '../../src/lib/format.ts';

test('a date is written the way the site writes dates', () => {
  assert.equal(formatDate(new Date('2024-01-18T00:00:00Z')), '18 January 2024');
});

test('a date is rendered in the site timezone, not the builder’s', () => {
  // 23:30 UTC on the 17th is already the 18th in Amsterdam. A CI runner is
  // somewhere nobody chose, so this must not depend on where it runs.
  assert.equal(formatDate(new Date('2024-01-17T23:30:00Z')), '18 January 2024');
});

test('isoDate is the machine-readable twin', () => {
  assert.equal(isoDate(new Date('2024-03-14T12:00:00Z')), '2024-03-14');
});

test('an editor’s own summary always wins', () => {
  assert.equal(excerpt('Some body text that is quite long indeed.', 'Written by hand'), 'Written by hand');
});

test('a blank summary falls through to the body', () => {
  const body = 'A paragraph long enough to be a summary of the page it belongs to, honestly.';
  assert.equal(excerpt(body, '   '), body);
});

test('the fallback skips the markup an imported page starts with', () => {
  // Every one of these opens at least one of the migrated training pages: a
  // back-link, an image, a heading, a bare video URL. Picking any of them as
  // the summary produces a card that says nothing.
  const body = [
    '[<< Back to all workshops](https://weave-it.org/training/#workshops)',
    '![](./_assets/cover.jpg)',
    '## About the workshop',
    'https://www.youtube.com/embed/abc123?feature=oembed',
    '- a bullet that is long enough to look like a paragraph if you squint at it',
    '> a pull quote that is also long enough to be mistaken for the opening line',
    'This is the first real paragraph, and it is the one that should be chosen.',
  ].join('\n\n');
  assert.equal(excerpt(body, undefined), 'This is the first real paragraph, and it is the one that should be chosen.');
});

test('the fallback strips markdown rather than showing it', () => {
  const body = 'Read the [research paper](https://example.com) on **additive bias** in `software` design today.';
  assert.equal(
    excerpt(body, undefined),
    'Read the research paper on additive bias in software design today.',
  );
});

test('a long excerpt is cut at a word, not mid-word', () => {
  const body = 'word '.repeat(80).trim();
  const got = excerpt(body, undefined, 60);
  assert.ok(got.length <= 61, `got ${got.length} characters`);
  assert.ok(got.endsWith('…'));
  assert.ok(!got.includes('wor…'), 'must not cut inside a word');
});

test('an empty body produces an empty excerpt rather than throwing', () => {
  assert.equal(excerpt(undefined, undefined), '');
  assert.equal(excerpt('', undefined), '');
});

test('a body with nothing but markup produces an empty excerpt', () => {
  // Honest emptiness. Two training pages are in exactly this state, and a card
  // with no summary is better than a card summarised by a stray bullet.
  assert.equal(excerpt('![](./_assets/a.jpg)\n\n## Heading', undefined), '');
});
