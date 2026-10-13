import { normalizeEventTags } from './tags.js';
export function shortcutWindow(key, today) {
  const date = new Date(`${today}T00:00:00Z`);
  const iso = (offset) => {
    const copy = new Date(date);
    copy.setUTCDate(copy.getUTCDate() + offset);
    return copy.toISOString().slice(0, 10);
  };
  if (key === 'tomorrow') return { start: iso(1), end: iso(1) };
  if (key === 'weekend') {
    const day = date.getUTCDay();
    const offset = day === 0 || day === 6 ? 0 : 6 - day;
    return { start: iso(offset), end: iso(offset + (day === 0 ? 0 : 1)) };
  }
  return { start: today, end: today };
}

export function matchesDiscoveryOptions(event, { locality = '', free = false, family = false, savedOnly = false, savedIDs = [] } = {}) {
  const tags = new Set(normalizeEventTags(event));
  return (!savedOnly || (savedIDs || []).includes(event.id)) && (!locality || event.locality === locality) && (!free || tags.has('free')) && (!family || tags.has('kid-friendly'));
}

export function localityCoverage(events) {
  const supported = ['angra', 'praia', 'other'];
  const confirmed = events.filter((event) => supported.includes(event?.locality));
  return { options: supported.filter((value) => confirmed.some((event) => event.locality === value)), confirmed: confirmed.length, total: events.length };
}
