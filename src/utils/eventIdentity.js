export function eventId(event) {
  return typeof event?.id === 'string' && /^[a-zA-Z0-9_-]+$/.test(event.id) ? event.id : null;
}

export function eventUrl(event) {
  const id = eventId(event);
  return id ? `https://eventosterceira.pt/events/?id=${encodeURIComponent(id)}` : null;
}

export function reconcileSaved(saved, events) {
  const current = new Map(events.filter(eventId).map((event) => [event.id, event]));
  return saved.map((snapshot) => ({ ...snapshot, event: current.get(snapshot.id) || snapshot.event, unavailable: !current.has(snapshot.id) }));
}
