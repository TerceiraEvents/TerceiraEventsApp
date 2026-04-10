// Unit tests for pure helpers in utils/data.
// Run with: node --test src/utils/data.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { matchesSearchQuery, applyEventFilters } from './data.js';

const sample = [
  {
    name: 'Super Mario Galaxy — O Filme',
    venue: 'CCCAH',
    description: 'Family screening',
    kid_friendly: true,
    date: '2026-04-11',
  },
  {
    name: 'ESCAMA: de dragão 2#',
    venue: 'AMIT',
    description: 'Thrash and death metal night',
    date: '2026-05-09',
  },
  {
    name: 'Desfile de Filarmónicas — 25 de Abril',
    venue: 'Rua da Sé',
    description: 'Brass bands parade through the city',
    kid_friendly: true,
    date: '2026-04-25',
  },
  {
    name: 'Late Karaoke',
    venue: 'AMIT',
    description: undefined,
    date: '2026-04-30',
  },
];

test('matchesSearchQuery: empty query matches everything', () => {
  assert.equal(matchesSearchQuery(sample[0], ''), true);
  assert.equal(matchesSearchQuery(sample[0], '   '), true);
  assert.equal(matchesSearchQuery(sample[0], null), true);
  assert.equal(matchesSearchQuery(sample[0], undefined), true);
});

test('matchesSearchQuery: matches by name (case-insensitive)', () => {
  assert.equal(matchesSearchQuery(sample[0], 'mario'), true);
  assert.equal(matchesSearchQuery(sample[0], 'MARIO'), true);
  assert.equal(matchesSearchQuery(sample[0], 'Galaxy'), true);
});

test('matchesSearchQuery: matches by venue', () => {
  assert.equal(matchesSearchQuery(sample[1], 'amit'), true);
});

test('matchesSearchQuery: matches by description', () => {
  assert.equal(matchesSearchQuery(sample[1], 'thrash'), true);
});

test('matchesSearchQuery: no match returns false', () => {
  assert.equal(matchesSearchQuery(sample[0], 'reggae'), false);
});

test('matchesSearchQuery: missing fields treated as empty strings', () => {
  assert.equal(matchesSearchQuery({ name: 'Foo' }, 'foo'), true);
  assert.equal(matchesSearchQuery({ name: 'Foo' }, 'bar'), false);
  assert.equal(matchesSearchQuery({}, 'anything'), false);
});

test('applyEventFilters: no filters returns the full list', () => {
  const result = applyEventFilters(sample, {});
  assert.equal(result.length, sample.length);
});

test('applyEventFilters: kidFriendlyOnly keeps only kid_friendly events', () => {
  const result = applyEventFilters(sample, { kidFriendlyOnly: true });
  assert.equal(result.length, 2);
  assert.ok(result.every((e) => e.kid_friendly === true));
  assert.ok(result.find((e) => e.name.startsWith('Super Mario')));
  assert.ok(result.find((e) => e.name.startsWith('Desfile')));
});

test('applyEventFilters: search only', () => {
  const result = applyEventFilters(sample, { search: 'parade' });
  assert.equal(result.length, 1);
  assert.equal(result[0].name, 'Desfile de Filarmónicas — 25 de Abril');
});

test('applyEventFilters: search + kid-friendly combined', () => {
  const result = applyEventFilters(sample, {
    search: 'amit',
    kidFriendlyOnly: true,
  });
  // AMIT events: ESCAMA (not kid-friendly), Late Karaoke (not kid-friendly)
  assert.equal(result.length, 0);
});

test('applyEventFilters: kid-friendly filter excludes unflagged events', () => {
  const result = applyEventFilters(sample, { kidFriendlyOnly: true });
  assert.ok(!result.find((e) => e.name === 'ESCAMA: de dragão 2#'));
  assert.ok(!result.find((e) => e.name === 'Late Karaoke'));
});

test('applyEventFilters: whitespace-only search is a no-op', () => {
  const result = applyEventFilters(sample, { search: '   ' });
  assert.equal(result.length, sample.length);
});

test('applyEventFilters: original array is not mutated', () => {
  const before = sample.slice();
  applyEventFilters(sample, { search: 'mario', kidFriendlyOnly: true });
  assert.deepEqual(sample, before);
});
