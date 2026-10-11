export function validateEventDataset(value) {
  if (!Array.isArray(value) || value.some((event) => !event || typeof event !== 'object' || typeof event.name !== 'string')) throw new Error('Invalid event dataset');
  return value;
}

export function validateWeeklyDataset(value) {
  if (!Array.isArray(value) || value.some((group) => !group || typeof group.day !== 'string' || !Array.isArray(group.events))) throw new Error('Invalid weekly dataset');
  for (const group of value) validateEventDataset(group.events);
  return value;
}
