export function inspectEventDataset(value) {
  if (!Array.isArray(value)) throw new Error('Invalid event dataset');
  const events = value.filter((event) => event && typeof event === 'object' && typeof event.name === 'string' && event.name.trim());
  return { events, rejectedRecords: value.length - events.length };
}

export function validateEventDataset(value) {
  return inspectEventDataset(value).events;
}

export function validateWeeklyDataset(value) {
  if (!Array.isArray(value) || value.some((group) => !group || typeof group.day !== 'string' || !Array.isArray(group.events))) throw new Error('Invalid weekly dataset');
  return value.map((group) => ({ ...group, events: validateEventDataset(group.events) }));
}
