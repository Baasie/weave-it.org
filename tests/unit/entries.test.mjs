/**
 * The pure rules over a list of entries.
 *
 * These are testable at all only because they were moved out of
 * `collections.ts`, which imports `astro:content` and therefore cannot be
 * loaded outside a build. See the header of `src/lib/entries.ts`.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { neighbours, tagOptions } from '../../src/lib/entries.ts';

const list = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];

test('neighbours finds the entries either side', () => {
  assert.deepEqual(neighbours(list, 'b'), { prev: { id: 'a' }, next: { id: 'c' } });
});

test('neighbours does not wrap around at either end', () => {
  // The ends are the point: a "next" that loops to the top of the archive is a
  // link that lies about where it goes.
  assert.equal(neighbours(list, 'a').prev, undefined);
  assert.equal(neighbours(list, 'c').next, undefined);
});

test('neighbours returns nothing for an entry that is not in the list', () => {
  // Happens for real: a detail page for a draft, in a list filtered to
  // published. It must not throw and must not silently return the first pair.
  assert.deepEqual(neighbours(list, 'missing'), {});
});

test('neighbours preserves the order it was given', () => {
  // It must never sort. "Previous" means previous *on the index the reader came
  // from*, and those are ordered differently per section.
  const reversed = [...list].reverse();
  assert.deepEqual(neighbours(reversed, 'b'), { prev: { id: 'c' }, next: { id: 'a' } });
});

const entries = (...tagSets) => tagSets.map((tags, i) => ({ id: String(i), data: { tags } }));

test('tagOptions lists each tag once, most used first', () => {
  const got = tagOptions(entries(['ddd', 'bdd'], ['ddd'], ['ddd', 'bdd'], ['tdd']));
  assert.deepEqual(got, ['ddd', 'bdd', 'tdd']);
});

test('tagOptions breaks ties alphabetically', () => {
  // Without this the chip order depends on the order Notion returned rows in,
  // and the built HTML churns on every sync with no content having changed.
  assert.deepEqual(tagOptions(entries(['zebra'], ['apple'])), ['apple', 'zebra']);
});

test('tagOptions copes with entries that have no tags at all', () => {
  assert.deepEqual(tagOptions([{ id: '1', data: {} }, { id: '2', data: { tags: ['x'] } }]), ['x']);
});

test('tagOptions of nothing is nothing', () => {
  assert.deepEqual(tagOptions([]), []);
});
