import { eventDateRange } from './data.js';

const ZONE = 'Atlantic/Azores';
function clockMinutes(clock) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(clock);
  if (!match || +match[1] > 23 || +match[2] > 59) return null;
  return +match[1] * 60 + +match[2];
}
function lastSunday(year, month) {
  const last = new Date(Date.UTC(year, month + 1, 0));
  return last.getUTCDate() - last.getUTCDay();
}
function localParts(instant) {
  try {
    const parts = new Intl.DateTimeFormat('en-GB', { timeZone: ZONE, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(instant);
    const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
    return { date: `${values.year}-${values.month}-${values.day}`, minutes: +values.hour * 60 + +values.minute };
  } catch {
    const year = instant.getUTCFullYear();
    if (year < 1996) return null;
    const summerStart = Date.UTC(year, 2, lastSunday(year, 2), 1);
    const summerEnd = Date.UTC(year, 9, lastSunday(year, 9), 1);
    const shifted = new Date(instant.getTime() + (instant >= summerStart && instant < summerEnd ? 0 : -3600000));
    return { date: shifted.toISOString().slice(0, 10), minutes: shifted.getUTCHours() * 60 + shifted.getUTCMinutes() };
  }
}

/** Resolve a published Azores wall time only when its instant is unique. */
export function islandInstant(date, clock) {
  const minutes = clockMinutes(clock);
  const midnight = Date.parse(`${date}T00:00:00Z`);
  if (minutes === null || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(midnight) || new Date(midnight).toISOString().slice(0, 10) !== date) return { instant: null, reason: 'invalid-time' };
  const candidates = [0, -60].map((offset) => new Date(midnight + (minutes - offset) * 60000)).filter((instant) => {
    const parts = localParts(instant);
    return parts?.date === date && parts.minutes === minutes;
  });
  return candidates.length === 1 ? { instant: candidates[0], reason: null } : { instant: null, reason: candidates.length ? 'ambiguous-time' : 'nonexistent-time' };
}
function nextDay(date) { return new Date(Date.parse(`${date}T00:00:00Z`) + 86400000).toISOString().slice(0, 10); }
function floatingDay(date) { const [year, month, day] = date.split('-').map(Number); return new Date(year, month - 1, day); }

/** Describe one dated occurrence's strictly published time or its unresolved reason. */
export function publishedEventTime(event) {
  const range = eventDateRange(event);
  if (!range) return { start: null, end: null, reason: 'invalid-date' };
  if (range.days > 1) return { start: null, end: null, reason: 'programme-period' };
  if (!event.time) return { start: null, end: null, reason: 'missing-time' };
  const match = /^\s*(\d{1,2}:\d{2})(?:\s*[–—-]\s*(\d{1,2}:\d{2}))?\s*$/.exec(event.time);
  if (!match) return { start: null, end: null, reason: 'invalid-time' };
  const start = islandInstant(range.start, match[1]);
  if (!start.instant) return { start: null, end: null, reason: start.reason };
  if (!match[2]) return { start: start.instant, end: null, reason: null };
  const endDay = clockMinutes(match[2]) < clockMinutes(match[1]) ? nextDay(range.start) : range.start;
  const end = islandInstant(endDay, match[2]);
  if (!end.instant || end.instant <= start.instant) return { start: null, end: null, reason: end.reason || 'invalid-time' };
  return { start: start.instant, end: end.instant, reason: null };
}

/** Build a reviewable calendar draft without inventing published times or durations. */
export function calendarDraft(event) {
  const range = eventDateRange(event);
  if (!range) return { event: null, notice: 'invalid-date' };
  const timing = publishedEventTime(event);
  if (['ambiguous-time', 'nonexistent-time'].includes(timing.reason)) return { event: null, notice: timing.reason };
  if (!timing.start) return { event: { allDay: true, startDate: floatingDay(range.start), endDate: floatingDay(nextDay(range.end)) }, notice: 'all-day-draft' };
  return { event: { allDay: false, startDate: timing.start, endDate: timing.end || new Date(timing.start.getTime() + 3600000), timeZone: ZONE }, notice: timing.end ? null : 'duration-draft' };
}

/** Return the future reminder instant for a uniquely published start and lead time. */
export function reminderDate(event, leadMinutes, now = new Date()) {
  const start = publishedEventTime(event).start;
  if (!start || !Number.isFinite(leadMinutes) || leadMinutes < 0) return null;
  const trigger = new Date(start.getTime() - leadMinutes * 60000);
  return trigger > now ? trigger : null;
}
