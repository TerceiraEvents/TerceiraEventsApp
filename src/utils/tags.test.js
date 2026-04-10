// Unit tests for the shared tag vocabulary helpers.
// Run with: node --test "src/**/*.test.js"
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  TAGS,
  TAGS_BY_SLUG,
  VALID_TAG_SLUGS,
  normalizeEventTags,
  getTagMeta,
} from './tags.js';

test('TAGS are unique and well-formed', () => {
  const slugs = TAGS.map((t) => t.slug);
  assert.equal(new Set(slugs).size, slugs.length, 'slugs are unique');
  for (const t of TAGS) {
    assert.ok(t.slug, `tag has slug: ${JSON.stringify(t)}`);
    assert.ok(t.label, `tag has label: ${JSON.stringify(t)}`);
    assert.ok(t.emoji, `tag has emoji: ${JSON.stringify(t)}`);
  }
});

test('TAGS_BY_SLUG matches TAGS', () => {
  assert.equal(Object.keys(TAGS_BY_SLUG).length, TAGS.length);
  assert.equal(TAGS_BY_SLUG['kid-friendly'].label, 'Kid Friendly');
});

test('VALID_TAG_SLUGS contains all declared slugs', () => {
  for (const t of TAGS) assert.ok(VALID_TAG_SLUGS.has(t.slug));
});

test('normalizeEventTags: empty event', () => {
  assert.deepEqual(normalizeEventTags(null), []);
  assert.deepEqual(normalizeEventTags({}), []);
});

test('normalizeEventTags: passes array through lowercased and de-duped', () => {
  assert.deepEqual(
    normalizeEventTags({ tags: ['Cinema', ' cinema ', 'kid-friendly'] }),
    ['cinema', 'kid-friendly'],
  );
});

test('normalizeEventTags: legacy kid_friendly boolean becomes kid-friendly', () => {
  assert.deepEqual(normalizeEventTags({ kid_friendly: true }), ['kid-friendly']);
});

test('normalizeEventTags: kid_friendly + existing kid-friendly tag not duplicated', () => {
  assert.deepEqual(
    normalizeEventTags({ kid_friendly: true, tags: ['kid-friendly', 'cinema'] }),
    ['kid-friendly', 'cinema'],
  );
});

test('normalizeEventTags: non-string entries ignored', () => {
  assert.deepEqual(
    normalizeEventTags({ tags: ['cinema', null, 42, undefined, 'dance'] }),
    ['cinema', 'dance'],
  );
});

test('getTagMeta: returns known tag', () => {
  const m = getTagMeta('kid-friendly');
  assert.equal(m.label, 'Kid Friendly');
  assert.equal(m.emoji, '👶');
});

test('getTagMeta: synthesizes unknown tag', () => {
  const m = getTagMeta('some-unknown-tag');
  assert.equal(m.slug, 'some-unknown-tag');
  assert.equal(m.label, 'Some Unknown Tag');
  assert.equal(m.emoji, '🏷️');
});
