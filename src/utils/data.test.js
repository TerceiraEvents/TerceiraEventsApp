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
  parseEventDate,
  todayAzores,
  eventKind,
  isEnded,
  isActive,
  exhibitionStatus,
  sortExhibitions,
  sortDatedEvents,
  filterByKind,
  eventDateRange,
  eventOccursOn,
  formatPostDate,
  formatEventDateShort,
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

test('isInRange: ongoing listing overlaps windows until its inclusive end date', () => {
  const event = { date: '2026-06-12', end_date: '2026-12-31' };
  const today = '2026-10-11';
  assert.deepEqual(
    ['week', 'month', 'year', 'all', 'archive'].map((range) => isInRange(event, range, today)),
    [true, true, true, true, false],
  );
});

test('date ranges classify single-day, running, future, end-today, and expired listings', () => {
  const cases = [
    { name: 'single day today', event: { date: '2026-10-11' }, ended: false, occurs: true },
    { name: 'running multi-day', event: { date: '2026-10-09', end_date: '2026-10-13' }, ended: false, occurs: true },
    { name: 'future', event: { date: '2026-10-12', end_date: '2026-10-15' }, ended: false, occurs: false },
    { name: 'ends today', event: { date: '2026-10-09', end_date: '2026-10-11' }, ended: false, occurs: true },
    { name: 'expired', event: { date: '2026-10-09', end_date: '2026-10-10' }, ended: true, occurs: false },
  ];
  for (const { name, event, ended, occurs } of cases) {
    assert.equal(isEnded(event, '2026-10-11'), ended, name);
    assert.equal(isActive(event, '2026-10-11'), !ended, name);
    assert.equal(eventOccursOn(event, '2026-10-11'), occurs, name);
  }
});

test('event date helpers preserve UTC calendar dates from js-yaml Date values', async () => {
  const { load } = await import('js-yaml');
  const yamlDate = load('date: 2026-10-11').date;
  assert.ok(yamlDate instanceof Date);
  assert.equal(parseEventDate(yamlDate).toISOString().slice(0, 10), '2026-10-11');
  assert.equal(parseEventDate('2026-10-11').toISOString().slice(0, 10), '2026-10-11');
  assert.equal(isInRange({ date: yamlDate }, 'all', '2026-10-11'), true);
  assert.equal(isInRange({ date: '2026-10-11' }, 'all', '2026-10-11'), true);
});

test('todayAzores uses Atlantic/Azores calendar boundaries', () => {
  const cases = [
    ['2026-10-11T23:30:00Z', '2026-10-11'],
    ['2026-10-12T00:30:00Z', '2026-10-12'],
    ['2027-01-15T00:30:00Z', '2027-01-14'],
    ['2027-03-28T00:30:00Z', '2027-03-27'],
    ['2027-03-28T01:30:00Z', '2027-03-28'],
    ['2026-10-25T00:30:00Z', '2026-10-25'],
    ['2026-10-25T01:30:00Z', '2026-10-25'],
  ];
  for (const [instant, expected] of cases) {
    assert.equal(todayAzores(new Date(instant)), expected, instant);
  }
});

test('todayAzores fallback handles standard time, daylight time, and switch instants', () => {
  const original = Intl.DateTimeFormat;
  try {
    Intl.DateTimeFormat = function unavailableTimeZone() {
      throw new RangeError('time zone unsupported');
    };
    const cases = [
      ['2027-01-15T00:30:00Z', '2027-01-14'],
      ['2027-03-28T00:30:00Z', '2027-03-27'],
      ['2027-03-28T01:30:00Z', '2027-03-28'],
      ['2026-10-25T00:30:00Z', '2026-10-25'],
      ['2026-10-25T01:30:00Z', '2026-10-25'],
    ];
    for (const [instant, expected] of cases) {
      assert.equal(todayAzores(new Date(instant)), expected, instant);
    }
  } finally {
    Intl.DateTimeFormat = original;
  }
});

test('exhibition status uses inclusive display dates and the 13-day threshold', () => {
  const cases = [
    [{ date: '2026-10-10', end_date: '2026-10-10' }, 'ended'],
    [{ date: '2026-10-12', end_date: '2026-11-01' }, 'opening-soon'],
    [{ date: '2026-10-25', end_date: '2026-11-01' }, 'upcoming'],
    [{ date: '2026-10-01', end_date: '2026-10-24' }, 'ending-soon'],
    [{ date: '2026-10-01', end_date: '2026-10-25' }, 'on-view'],
  ];
  for (const [event, expected] of cases) {
    assert.equal(exhibitionStatus(event, '2026-10-11'), expected);
  }
});

test('classification, filters, and inclusive calendar range helpers', () => {
  const events = [
    { name: 'Event', date: '2026-12-30', end_date: '2027-01-02' },
    { name: 'Exhibition', kind: 'exhibition', date: '2026-12-30', end_date: '2027-01-02' },
    { name: 'Legacy exhibition tag', tags: ['exhibition'], date: '2026-12-30' },
  ];
  assert.deepEqual(events.map(eventKind), ['event', 'exhibition', 'event']);
  assert.deepEqual(filterByKind(events, 'event').map((event) => event.name), ['Event', 'Legacy exhibition tag']);
  assert.deepEqual(filterByKind(events, 'exhibition').map((event) => event.name), ['Exhibition']);
  assert.equal(filterByKind(events, 'all').length, 3);
  assert.deepEqual(eventDateRange(events[0]), { start: '2026-12-30', end: '2027-01-02', days: 4 });
  assert.equal(eventOccursOn(events[0], '2027-01-02'), true);
  assert.equal(eventOccursOn(events[0], '2027-01-03'), false);
});

test('sortExhibitions follows status priority and each status date order', () => {
  const exhibitions = [
    { name: 'Upcoming', date: '2026-11-30', end_date: '2026-12-31' },
    { name: 'On view later end', date: '2026-10-01', end_date: '2026-12-01' },
    { name: 'Opening later', date: '2026-10-20', end_date: '2026-11-01' },
    { name: 'Ending later', date: '2026-10-01', end_date: '2026-10-20' },
    { name: 'Opening first', date: '2026-10-12', end_date: '2026-11-01' },
    { name: 'On view first', date: '2026-10-01', end_date: '2026-11-30' },
    { name: 'Ending first', date: '2026-10-01', end_date: '2026-10-12' },
  ];
  assert.deepEqual(
    sortExhibitions(exhibitions, '2026-10-11').map((event) => event.name),
    ['Opening first', 'Opening later', 'Ending first', 'Ending later', 'On view first', 'On view later end', 'Upcoming'],
  );
});

test('sortDatedEvents orders by next attendance date, time, and name', () => {
  const events = [
    { name: 'Late', date: '2026-10-13', time: '20:00' },
    { name: 'Running later time', date: '2026-10-09', end_date: '2026-10-12', time: '19:00' },
    { name: 'Running early time', date: '2026-10-09', end_date: '2026-10-12', time: '17:00' },
    { name: 'Earlier future', date: '2026-10-12', time: '22:00' },
    { name: 'Same time B', date: '2026-10-12', time: '18:00' },
    { name: 'Same time A', date: '2026-10-12', time: '18:00' },
  ];
  assert.deepEqual(
    sortDatedEvents(events, '2026-10-11').map((event) => event.name),
    ['Running early time', 'Running later time', 'Same time A', 'Same time B', 'Earlier future', 'Late'],
  );
});

// ---------- formatPostDate ----------

test('formatPostDate: ISO string → "30 Apr 2026"', () => {
  assert.equal(formatPostDate('2026-04-30'), 'Apr 30, 2026');
});

test('formatPostDate: Date object → same format', () => {
  const d = new Date('2026-04-30T00:00:00Z');
  assert.equal(formatPostDate(d), 'Apr 30, 2026');
});

test('formatPostDate: empty / null / undefined → ""', () => {
  assert.equal(formatPostDate(''), '');
  assert.equal(formatPostDate(null), '');
  assert.equal(formatPostDate(undefined), '');
});

test('formatPostDate: invalid string → input passed through', () => {
  assert.equal(formatPostDate('not-a-date'), 'not-a-date');
});

test('formatPostDate: invalid Date object → ""', () => {
  assert.equal(formatPostDate(new Date('not-a-date')), '');
});

// ---------- formatEventDateShort ----------

test('formatEventDateShort: ISO string → "May 5" (no year)', () => {
  assert.equal(formatEventDateShort('2026-05-05'), 'May 5');
});

test('formatEventDateShort: Date object accepted', () => {
  // Construct date in local time so cross-host TZ doesn't shift the day
  const d = new Date(2026, 4, 5);
  assert.equal(formatEventDateShort(d), 'May 5');
});

test('formatEventDateShort: UTC date objects keep their YAML calendar day', () => {
  assert.equal(formatEventDateShort(new Date('2026-05-05T00:00:00Z')), 'May 5');
});

test('formatEventDateShort: empty → ""', () => {
  assert.equal(formatEventDateShort(''), '');
  assert.equal(formatEventDateShort(null), '');
});

test('formatEventDateShort: invalid input → original string back', () => {
  assert.equal(formatEventDateShort('garbage'), 'garbage');
});

test('applyEventFilters: original array is not mutated', () => {
  const before = sample.slice();
  applyEventFilters(sample, {
    search: 'mario',
    selectedTag: 'kid-friendly',
  });
  assert.deepEqual(sample, before);
});
