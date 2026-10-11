import { eventId } from './eventIdentity.js';

export function createSavedPlans(storage) {
  const key = 'terceiraevents_saved';
  async function read() {
    const raw = await storage.getItem(key);
    const saved = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(saved) || saved.some((entry) => !eventId(entry?.event) || entry.id !== entry.event.id)) throw new Error('Invalid saved plans');
    return saved;
  }
  async function toggle(event) {
    const id = eventId(event);
    if (!id) throw new Error('Event has no stable identity');
    const saved = await read();
    const exists = saved.some((entry) => entry.id === id);
    const updated = exists ? saved.filter((entry) => entry.id !== id) : [...saved, { id, event }];
    await storage.setItem(key, JSON.stringify(updated));
    return !exists;
  }
  return { read, toggle };
}
