export async function loadDetailData({ fetchEvents, readSaved, readReminders }) {
  const [events, saved, reminders] = await Promise.allSettled([fetchEvents(), readSaved(), readReminders()]);
  if (events.status === 'rejected') throw events.reason;
  return {
    events: events.value,
    saved: saved.status === 'fulfilled' ? saved.value : null,
    reminders: reminders.status === 'fulfilled' ? reminders.value : null,
    savedError: saved.status === 'rejected' ? saved.reason : null,
    reminderError: reminders.status === 'rejected' ? reminders.reason : null,
  };
}
