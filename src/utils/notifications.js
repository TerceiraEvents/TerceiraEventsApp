import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import {
  getSettings,
  getRemindedEvents,
  makeEventKey,
  cleanupPastReminders,
} from './storage';
import { parseEventDate, formatDate } from './data';

const DAILY_GREETINGS = [
  "Good Moo-rning! Here's today's lineup:",
  "Udderly exciting day ahead on Terceira:",
  "Holy cow! Look what's happening today:",
  "No bull \u2014 here's what's on today:",
  "Herd it here first! Today's events:",
  "Moo-ve over, boring days! Today's packed:",
  "Don't have a cow, but today is stacked:",
  "The steaks are high today:",
  "Legen-dairy day ahead:",
  "Pasture bedtime? Not with today's events:",
  "Cud you believe today's lineup?",
  "Terceira-sly good lineup today:",
  "Island vibes and good times \u2014 today on Terceira:",
  "The bull's on the rope and the night is young:",
  "From Angra to Praia, today's got it all:",
  "Grab the rope! Today's events are charging:",
  "Today's lineup is on the loose:",
];

// Configure how notifications appear when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function requestPermissions() {
  if (!Device.isDevice) {
    return false;
  }
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

// Cancel all scheduled notifications and reschedule from scratch.
// This is the safest approach when the calendar changes frequently.
export async function rescheduleAllNotifications(specialEvents, weeklyEvents) {
  await Notifications.cancelAllScheduledNotificationsAsync();
  await cleanupPastReminders();

  const settings = await getSettings();
  const remindedKeys = await getRemindedEvents();

  if (settings.dailySummaryEnabled) {
    await scheduleDailySummaries(specialEvents, weeklyEvents, settings);
  }

  await scheduleEventReminders(specialEvents, settings, remindedKeys);
}

// Schedule daily summary notifications for the next 14 days
async function scheduleDailySummaries(
  specialEvents,
  weeklyEvents,
  settings,
) {
  const dayNames = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
  ];

  for (let dayOffset = 0; dayOffset < 14; dayOffset++) {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + dayOffset);
    targetDate.setHours(0, 0, 0, 0);

    const targetDateStr = targetDate.toISOString().slice(0, 10);
    const dayName = dayNames[targetDate.getDay()];

    // Collect special events for this day
    const daySpecialEvents = specialEvents.filter((e) => {
      const d = parseEventDate(e.date);
      if (!d) return false;
      return d.toISOString().slice(0, 10) === targetDateStr;
    });

    // Collect weekly events for this day (if setting enabled)
    let dayWeeklyEvents = [];
    if (settings.includeWeeklyInSummary) {
      const dayGroup = weeklyEvents.find((dg) => dg.day === dayName);
      if (dayGroup) {
        dayWeeklyEvents = dayGroup.events;
      }
    }

    const totalEvents = daySpecialEvents.length + dayWeeklyEvents.length;
    if (totalEvents === 0) continue;

    // Build notification body
    const lines = [];
    for (const e of daySpecialEvents) {
      const timeStr = e.time ? ` at ${e.time}` : '';
      lines.push(`${e.name}${timeStr} - ${e.venue}`);
    }
    for (const e of dayWeeklyEvents) {
      const timeStr = e.time ? ` at ${e.time}` : '';
      lines.push(`${e.name}${timeStr} - ${e.venue}`);
    }

    const body =
      lines.length <= 3
        ? lines.join('\n')
        : lines.slice(0, 3).join('\n') + `\n...and ${lines.length - 3} more`;

    // Schedule at the configured summary time
    const triggerDate = new Date(targetDate);
    triggerDate.setHours(settings.dailySummaryHour, settings.dailySummaryMinute, 0, 0);

    // Don't schedule if the trigger time has already passed
    if (triggerDate <= new Date()) continue;

    // Pick a deterministic-but-varied greeting based on the date
    const greetingIndex =
      (targetDate.getDate() + targetDate.getMonth() * 31) % DAILY_GREETINGS.length;
    const greeting = DAILY_GREETINGS[greetingIndex];

    await Notifications.scheduleNotificationAsync({
      content: {
        title: greeting,
        body,
        data: { type: 'daily_summary', date: targetDateStr },
      },
      trigger: { date: triggerDate, type: 'date' },
    });
  }
}

// Schedule reminder notifications for reminded events
async function scheduleEventReminders(specialEvents, settings, remindedKeys) {
  const leadMs = settings.reminderLeadMinutes * 60 * 1000;

  for (const event of specialEvents) {
    const key = makeEventKey(event);
    if (!remindedKeys.has(key)) continue;

    const eventDate = parseEventDate(event.date);
    if (!eventDate) continue;

    // Build the trigger time from date + time
    const triggerDate = new Date(eventDate);
    if (event.time) {
      const parts = event.time.match(/(\d{1,2}):(\d{2})/);
      if (parts) {
        triggerDate.setHours(parseInt(parts[1], 10), parseInt(parts[2], 10), 0, 0);
      } else {
        // No parseable time, default to noon
        triggerDate.setHours(12, 0, 0, 0);
      }
    } else {
      // No time specified, remind at 9am on the event day
      triggerDate.setHours(9, 0, 0, 0);
    }

    // Subtract lead time
    const notifyAt = new Date(triggerDate.getTime() - leadMs);

    // Don't schedule if already passed
    if (notifyAt <= new Date()) continue;

    const formatted = formatDate(eventDate);
    const timeStr = event.time ? ` at ${event.time}` : '';

    await Notifications.scheduleNotificationAsync({
      content: {
        title: `Reminder: ${event.name}`,
        body: `${event.venue}${timeStr}\n${formatted.weekday}, ${formatted.month} ${formatted.day}`,
        data: { type: 'event_reminder', eventKey: key },
      },
      trigger: { date: notifyAt, type: 'date' },
    });
  }
}

// Quick helper to schedule/cancel a single event reminder without
// doing a full reschedule. Still safe if called redundantly since
// rescheduleAllNotifications will clean up.
export async function scheduleOneReminder(event) {
  const settings = await getSettings();
  const leadMs = settings.reminderLeadMinutes * 60 * 1000;
  const eventDate = parseEventDate(event.date);
  if (!eventDate) return;

  const triggerDate = new Date(eventDate);
  if (event.time) {
    const parts = event.time.match(/(\d{1,2}):(\d{2})/);
    if (parts) {
      triggerDate.setHours(parseInt(parts[1], 10), parseInt(parts[2], 10), 0, 0);
    } else {
      triggerDate.setHours(12, 0, 0, 0);
    }
  } else {
    triggerDate.setHours(9, 0, 0, 0);
  }

  const notifyAt = new Date(triggerDate.getTime() - leadMs);
  if (notifyAt <= new Date()) return;

  const formatted = formatDate(eventDate);
  const timeStr = event.time ? ` at ${event.time}` : '';

  await Notifications.scheduleNotificationAsync({
    content: {
      title: `Reminder: ${event.name}`,
      body: `${event.venue}${timeStr}\n${formatted.weekday}, ${formatted.month} ${formatted.day}`,
      data: { type: 'event_reminder', eventKey: makeEventKey(event) },
    },
    trigger: { date: notifyAt, type: 'date' },
  });
}
