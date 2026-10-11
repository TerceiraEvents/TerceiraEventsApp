export function validateEventDataset(value) {
  if (!Array.isArray(value) || value.some((event) => !event || typeof event !== 'object' || typeof event.name !== 'string')) throw new Error('Invalid event dataset');
  return value;
}
