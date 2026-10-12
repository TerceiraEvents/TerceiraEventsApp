import { test } from 'node:test';
import assert from 'node:assert/strict';
import { islandInstant, publishedEventTime, calendarDraft, reminderDate } from './eventTime.js';

const cases = [
  ['2026-10-17', '17:30', '2026-10-17T17:30:00.000Z'],
  ['2026-01-17', '17:30', '2026-01-17T18:30:00.000Z'],
  ['2026-12-31', '23:30', '2027-01-01T00:30:00.000Z'],
  ['2026-03-29', '01:30', '2026-03-29T01:30:00.000Z'],
  ['2026-10-25', '01:30', '2026-10-25T02:30:00.000Z'],
];
for (const fallback of [false, true]) {
  test(`island times preserve DST/year boundaries with ${fallback ? 'documented modern fallback' : 'Intl'}`, () => {
    const original = Intl.DateTimeFormat;
    if (fallback) Intl.DateTimeFormat = function () { throw new Error('Unavailable'); };
    try {
      for (const [day, clock, expected] of cases) assert.equal(islandInstant(day, clock).instant.toISOString(), expected);
      assert.equal(islandInstant('2026-03-29', '00:30').reason, 'nonexistent-time');
      assert.equal(islandInstant('2026-10-25', '00:30').reason, 'ambiguous-time');
    } finally { Intl.DateTimeFormat = original; }
  });
}

test('strict source clock ranges preserve complete and overnight times', () => {
  for (const time of ['16:00–17:30', '16:00 - 17:30', ' 16:00 — 17:30 ']) {
    const timing = publishedEventTime({ date: '2026-10-17', time });
    assert.equal(timing.end.toISOString(), '2026-10-17T17:30:00.000Z');
  }
  const overnight = publishedEventTime({ date: '2026-12-31', time: '23:30–01:30' });
  assert.equal(overnight.start.toISOString(), '2027-01-01T00:30:00.000Z');
  assert.equal(overnight.end.toISOString(), '2027-01-01T02:30:00.000Z');
  for (const time of ['from17:30', '17:30 and19:00', '25:00', '17:60']) assert.equal(publishedEventTime({ date: '2026-10-17', time }).start, null);
  assert.equal(islandInstant('2026-02-29', '17:30').instant, null);
});

test('all-day programme drafts preserve inclusive source dates under device timezones', () => {
  const original = process.env.TZ;
  try {
    for (const zone of ['Europe/Oslo', 'UTC', 'Pacific/Kiritimati']) {
      process.env.TZ = zone;
      const plan = calendarDraft({ date: '2026-12-31', end_date: '2027-01-02' });
      assert.equal(plan.notice, 'all-day-draft');
      assert.equal(plan.event.allDay, true);
      assert.equal(plan.event.startDate.getFullYear(), 2026);
      assert.equal(plan.event.startDate.getDate(), 31);
      assert.equal(plan.event.endDate.getFullYear(), 2027);
      assert.equal(plan.event.endDate.getDate(), 3);
    }
  } finally { if (original === undefined) delete process.env.TZ; else process.env.TZ = original; }
});

test('unresolved, ambiguous and passed source times cannot become guessed reminders', () => {
  for (const event of [{ date: '2026-10-17' }, { date: '2026-10-17', time: 'See details' }, { date: '2026-03-29', time: '00:30' }, { date: '2026-10-25', time: '00:30' }]) {
    assert.equal(reminderDate(event, 60, new Date('2026-01-01T00:00:00Z')), null);
  }
  const event = { date: '2026-10-17', time: '17:30' };
  assert.equal(reminderDate(event, 60, new Date('2026-10-17T17:00:00Z')), null);
  assert.equal(calendarDraft({ date: '2026-10-25', time: '00:30' }).event, null);
});
