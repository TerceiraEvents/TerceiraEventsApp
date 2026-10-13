/** Change one validated event request independently of Saved events. */
export async function changeReminder(event, active, api) {
  if (active) { await api.remove(event); await api.reschedule(); return false; }
  if (!api.date(event, (await api.settings()).reminderLeadMinutes)) { api.unresolved(); return active; }
  if (!await api.permission()) { api.denied(); return active; }
  await api.store(event);
  if (!await api.schedule(event)) { await api.remove(event); api.unresolved(); return active; }
  return true;
}
