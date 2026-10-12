import { parseEventDate } from './data.js';
import { eventId } from './eventIdentity.js';

function serializable(value) {
  if (value instanceof Date) {
    const day = parseEventDate(value);
    return day ? `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}` : null;
  }
  if (Array.isArray(value)) return value.map(serializable);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined).map(([key, item]) => [key, serializable(item)]));
  }
  return value;
}

/** Build a JSON-safe detail snapshot with the source calendar dates. */
export function eventDetailParams(event) {
  const id = eventId(event);
  return { ...(id ? { id } : {}), event: serializable(event) };
}
