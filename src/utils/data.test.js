// Unit tests for pure helpers in utils/data.
// Run with: node --test "src/**/*.test.js"
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  matchesSearchQuery,
  matchesTag,
  applyEventFilters,
  sortEventsByDate,
  isInRange,
  VALID_RANGES,
} from './data.js';

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

// ---------- sortEventsByDate ----------

test('sortEventsByDate: ascending by date', () => {
  const result = sortEventsByDate(sample);
  const dates = result.map((e) => e.date);
  assert.deepEqual(dates, [
    '2026-04-11',
    '2026-04-20',
    '2026-04-25',
    '2026-04-30',
    '2026-05-09',
  ]);
});

test('sortEventsByDate: does not mutate input', () => {
  const before = sample.map((e) => e.date);
  sortEventsByDate(sample);
  const after = sample.map((e) => e.date);
  assert.deepEqual(after, before);
});

test('sortEventsByDate: handles Date objects (from js-yaml) alongside strings', () => {
  const mixed = [
    { name: 'B', date: new Date('2026-06-01T00:00:00') },
    { name: 'A', date: '2026-05-01' },
    { name: 'C', date: new Date('2026-07-01T00:00:00') },
  ];
  const result = sortEventsByDate(mixed);
  assert.deepEqual(result.map((e) => e.name), ['A', 'B', 'C']);
});

test('sortEventsByDate: events with missing/invalid dates sink to end', () => {
  const messy = [
    { name: 'NoDate' },
    { name: 'Mid', date: '2026-05-01' },
    { name: 'Bad', date: 'not-a-date' },
    { name: 'Early', date: '2026-04-01' },
  ];
  const result = sortEventsByDate(messy);
  assert.equal(result[0].name, 'Early');
  assert.equal(result[1].name, 'Mid');
  // NoDate and Bad both sink — order between them is not guaranteed
  const tail = new Set([result[2].name, result[3].name]);
  assert.deepEqual(tail, new Set(['NoDate', 'Bad']));
});

test('sortEventsByDate: empty input returns empty array', () => {
  assert.deepEqual(sortEventsByDate([]), []);
});

// ---------- isInRange ----------

// Build a date string offset from today by `days` calendar days, in YYYY-MM-DD.
function dateOffset(days) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

test('VALID_RANGES contains the five expected keys', () => {
  assert.deepEqual(
    [...VALID_RANGES].sort(),
    ['all', 'archive', 'month', 'week', 'year'],
  );
});

test('isInRange: today is in week / month / year / all but not archive', () => {
  const e = { date: dateOffset(0) };
  assert.equal(isInRange(e, 'week'), true);
  assert.equal(isInRange(e, 'month'), true);
  assert.equal(isInRange(e, 'year'), true);
  assert.equal(isInRange(e, 'all'), true);
  assert.equal(isInRange(e, 'archive'), false);
});

test('isInRange: yesterday is archive only', () => {
  const e = { date: dateOffset(-1) };
  assert.equal(isInRange(e, 'archive'), true);
  assert.equal(isInRange(e, 'week'), false);
  assert.equal(isInRange(e, 'all'), false);
});

test('isInRange: week boundary — day 6 in, day 7 out', () => {
  assert.equal(isInRange({ date: dateOffset(6) }, 'week'), true);
  assert.equal(isInRange({ date: dateOffset(7) }, 'week'), false);
});

test('isInRange: month boundary — day 30 in, day 31 out', () => {
  assert.equal(isInRange({ date: dateOffset(30) }, 'month'), true);
  assert.equal(isInRange({ date: dateOffset(31) }, 'month'), false);
});

test('isInRange: year boundary — day 364 in, day 365 out', () => {
  assert.equal(isInRange({ date: dateOffset(364) }, 'year'), true);
  assert.equal(isInRange({ date: dateOffset(365) }, 'year'), false);
});

test('isInRange: all accepts far future', () => {
  assert.equal(isInRange({ date: dateOffset(10000) }, 'all'), true);
});

test('isInRange: missing/invalid date returns false', () => {
  assert.equal(isInRange({}, 'week'), false);
  assert.equal(isInRange({ date: 'not-a-date' }, 'week'), false);
  assert.equal(isInRange(null, 'week'), false);
});

test('isInRange: unknown range falls back to upcoming-all', () => {
  assert.equal(isInRange({ date: dateOffset(10000) }, 'bogus'), true);
  assert.equal(isInRange({ date: dateOffset(-1) }, 'bogus'), false);
});

test('applyEventFilters: original array is not mutated', () => {
  const before = sample.slice();
  applyEventFilters(sample, {
    search: 'mario',
    selectedTag: 'kid-friendly',
  });
  assert.deepEqual(sample, before);
});
