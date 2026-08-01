/**
 * The conversion rules the sync applies on the way out of Notion.
 *
 * Covers the two that were found by looking at rendered pages rather than by
 * anything failing: tag spelling, and the HTML entities the WordPress import
 * left behind.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decodeEntities } from '../../scripts/lib/notion-md.ts';
import { normaliseTag, normaliseTags } from '../../src/lib/tags.ts';

test('the entities the import actually left behind are decoded', () => {
  // All three were found in real Notion pages: "Domain Driven Design &amp;
  // Data Mesh" was a page title on the site.
  assert.equal(decodeEntities('Domain Driven Design &amp; Data Mesh'), 'Domain Driven Design & Data Mesh');
  assert.equal(decodeEntities('3 &#215; 2'), '3 × 2');
  assert.equal(decodeEntities('2019 &#8211; 2024'), '2019 – 2024');
});

test('hex and decimal character references both decode', () => {
  assert.equal(decodeEntities('&#x2014;'), '—');
  assert.equal(decodeEntities('&#8212;'), '—');
});

test('something that merely looks like an entity is left alone', () => {
  // Safer to under-decode than to mangle prose. "AT&T" and a bare ampersand
  // are both common and neither is a character reference.
  assert.equal(decodeEntities('AT&T and Q&A'), 'AT&T and Q&A');
  assert.equal(decodeEntities('&notarealentity;'), '&notarealentity;');
});

test('a reference outside the usable range is left alone', () => {
  assert.equal(decodeEntities('&#1114112;'), '&#1114112;');
  assert.equal(decodeEntities('&#0;'), '&#0;');
});

test('tags get one spelling', () => {
  assert.equal(normaliseTag('EventStorming'), 'eventstorming');
  assert.equal(normaliseTag('Event Storming'), 'eventstorming');
  assert.equal(normaliseTag('Domain Driven Design'), 'domain-driven design');
  assert.equal(normaliseTag('domain-driven-design'), 'domain-driven design');
});

test('tags are spelled in British English', () => {
  assert.equal(normaliseTag('Collaborative Modeling'), 'collaborative modelling');
  assert.equal(normaliseTag('teams and organizations'), 'teams and organisations');
  assert.equal(normaliseTag('Decision Making'), 'decision-making');
});

test('a page carrying two spellings of one tag ends up with one chip', () => {
  // The reason this runs per page rather than per tag.
  assert.deepEqual(
    normaliseTags(['Collaborative Modeling', 'collaborative modelling']),
    ['collaborative modelling'],
  );
});

test('normalising is stable — running it twice changes nothing', () => {
  // If it were not, the sync would rewrite files on every run and the deploy
  // gate (`git diff --quiet`) would fire on content nobody edited.
  for (const tag of ['EventStorming', 'Domain Driven Design', 'teams and organizations']) {
    assert.equal(normaliseTag(normaliseTag(tag)), normaliseTag(tag));
  }
});
