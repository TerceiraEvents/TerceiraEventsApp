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

export function matchesDiscoveryOptions(event, { locality = '', free = false, family = false } = {}) {
  const tags = new Set(event.tags || []);
  if (event.kid_friendly) tags.add('kid-friendly');
  return (!locality || event.locality === locality) && (!free || tags.has('free')) && (!family || tags.has('kid-friendly'));
}
