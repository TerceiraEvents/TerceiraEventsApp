// Unit tests for pure helpers in utils/data.
// Run with: node --test "src/**/*.test.js"
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { matchesSearchQuery, matchesTag, applyEventFilters } from './data.js';

const sample = [
  {
    name: 'Super Mario Galaxy — O Filme',
    venue: 'CCCAH',
    description: 'Family screening',
    tags: ['kid-friendly', 'cinema'],
    date: '2026-04-11',
  },
  {
    name: 'ESCAMA: de dragão 2#',
    venue: 'AMIT',
    description: 'Thrash and death metal night',
    tags: ['live-music', 'nightlife'],
    date: '2026-05-09',
  },
  {
    name: 'Desfile de Filarmónicas — 25 de Abril',
    venue: 'Rua da Sé',
    description: 'Brass bands parade through the city',
    tags: ['kid-friendly', 'live-music', 'outdoor', 'free'],
    date: '2026-04-25',
  },
  {
    name: 'Late Karaoke',
    venue: 'AMIT',
    description: undefined,
    tags: ['karaoke', 'nightlife'],
    date: '2026-04-30',
  },
  {
    // Legacy kid_friendly boolean — should still match the kid-friendly tag
    name: 'Legacy Family Night',
    venue: 'Somewhere',
    kid_friendly: true,
    date: '2026-04-20',
  },
];

// ---------- matchesSearchQuery ----------

test('matchesSearchQuery: empty query matches everything', () => {
  assert.equal(matchesSearchQuery(sample[0], ''), true);
  assert.equal(matchesSearchQuery(sample[0], '   '), true);
  assert.equal(matchesSearchQuery(sample[0], null), true);
  assert.equal(matchesSearchQuery(sample[0], undefined), true);
});

test('matchesSearchQuery: matches by name (case-insensitive)', () => {
  assert.equal(matchesSearchQuery(sample[0], 'mario'), true);
  assert.equal(matchesSearchQuery(sample[0], 'MARIO'), true);
});

test('matchesSearchQuery: matches by venue and description', () => {
  assert.equal(matchesSearchQuery(sample[1], 'amit'), true);
  assert.equal(matchesSearchQuery(sample[1], 'thrash'), true);
});

test('matchesSearchQuery: no match returns false', () => {
  assert.equal(matchesSearchQuery(sample[0], 'reggae'), false);
});

test('matchesSearchQuery: missing fields treated as empty', () => {
  assert.equal(matchesSearchQuery({ name: 'Foo' }, 'foo'), true);
  assert.equal(matchesSearchQuery({}, 'anything'), false);
});

// ---------- matchesTag ----------

test('matchesTag: empty tag matches everything', () => {
  assert.equal(matchesTag(sample[0], ''), true);
  assert.equal(matchesTag(sample[0], null), true);
});

test('matchesTag: finds tag in array', () => {
  assert.equal(matchesTag(sample[0], 'cinema'), true);
  assert.equal(matchesTag(sample[0], 'kid-friendly'), true);
});

test('matchesTag: missing tag returns false', () => {
  assert.equal(matchesTag(sample[0], 'karaoke'), false);
});

test('matchesTag: legacy kid_friendly boolean matches kid-friendly slug', () => {
  assert.equal(matchesTag(sample[4], 'kid-friendly'), true);
});

test('matchesTag: legacy kid_friendly does not match other tags', () => {
  assert.equal(matchesTag(sample[4], 'cinema'), false);
});

// ---------- applyEventFilters ----------

test('applyEventFilters: no filters returns the full list', () => {
  const result = applyEventFilters(sample, {});
  assert.equal(result.length, sample.length);
});

test('applyEventFilters: filter by kid-friendly tag', () => {
  const result = applyEventFilters(sample, { selectedTag: 'kid-friendly' });
  assert.equal(result.length, 3);
  const names = result.map((e) => e.name);
  assert.ok(names.includes('Super Mario Galaxy — O Filme'));
  assert.ok(names.includes('Desfile de Filarmónicas — 25 de Abril'));
  assert.ok(names.includes('Legacy Family Night'));
});

test('applyEventFilters: filter by nightlife tag', () => {
  const result = applyEventFilters(sample, { selectedTag: 'nightlife' });
  assert.equal(result.length, 2);
  assert.ok(result.find((e) => e.name === 'ESCAMA: de dragão 2#'));
  assert.ok(result.find((e) => e.name === 'Late Karaoke'));
});

test('applyEventFilters: search only', () => {
  const result = applyEventFilters(sample, { search: 'parade' });
  assert.equal(result.length, 1);
  assert.equal(result[0].name, 'Desfile de Filarmónicas — 25 de Abril');
});

test('applyEventFilters: search + tag combined', () => {
  const result = applyEventFilters(sample, {
    search: 'amit',
    selectedTag: 'kid-friendly',
  });
  // AMIT events: ESCAMA (nightlife), Late Karaoke (karaoke) — neither kid-friendly
  assert.equal(result.length, 0);
});

test('applyEventFilters: unknown tag returns empty', () => {
  const result = applyEventFilters(sample, { selectedTag: 'made-up' });
  assert.equal(result.length, 0);
});

test('applyEventFilters: whitespace-only search is a no-op', () => {
  const result = applyEventFilters(sample, { search: '   ' });
  assert.equal(result.length, sample.length);
});

test('applyEventFilters: original array is not mutated', () => {
  const before = sample.slice();
  applyEventFilters(sample, {
    search: 'mario',
    selectedTag: 'kid-friendly',
  });
  assert.deepEqual(sample, before);
});
