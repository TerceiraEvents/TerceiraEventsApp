import { reminderDate } from './eventTime';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import {
  getSettings,
  getRemindedEvents,
  makeEventKey,
  cleanupPastReminders,
} from './storage';
import { parseEventDate, formatDate } from './data';
import { t, getLocale } from '../i18n/core.js';

// Greetings live in the i18n catalog so they translate with locale.
// Reading lazily (per call) ensures a runtime locale change is picked
// up by the next scheduled summary without needing a module reload.
function getGreetings() {
  return t('notifications.greetings');
}

// Configure how notifications appear when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const REMINDER_CHANNEL = 'event-reminders';
async function ensureReminderChannel() {
  if (Platform.OS === 'android') await Notifications.setNotificationChannelAsync(REMINDER_CHANNEL, { name: t('notifications.reminderChannel'), importance: Notifications.AndroidImportance.DEFAULT });
}

export async function requestPermissions() {
  await ensureReminderChannel();
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
  // Day name lookup for weekly-event matching. The website's YAML keys
  // every weekly group on the English day name, so this stays in
  // English regardless of UI locale — it's a data key, not user copy.
  const dayNames = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
  ];

  const greetings = getGreetings();

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
      const timeStr = e.time ? ` ${t('notifications.atTime', { time: e.time })}` : '';
      lines.push(`${e.name}${timeStr} - ${e.venue}`);
    }
    for (const e of dayWeeklyEvents) {
      const timeStr = e.time ? ` ${t('notifications.atTime', { time: e.time })}` : '';
      lines.push(`${e.name}${timeStr} - ${e.venue}`);
    }

    const body =
      lines.length <= 3
        ? lines.join('\n')
        : lines.slice(0, 3).join('\n') +
          '\n' +
          t('notifications.andMore', { count: lines.length - 3 });

    // Schedule at the configured summary time
    const triggerDate = new Date(targetDate);
    triggerDate.setHours(settings.dailySummaryHour, settings.dailySummaryMinute, 0, 0);

    // Don't schedule if the trigger time has already passed
    if (triggerDate <= new Date()) continue;

    // Pick a deterministic-but-varied greeting based on the date
    const greetingIndex =
      (targetDate.getDate() + targetDate.getMonth() * 31) % greetings.length;
    const greeting = greetings[greetingIndex];

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
  if (remindedKeys.size) await ensureReminderChannel();
  const locale = getLocale();

  for (const event of specialEvents) {
    const key = makeEventKey(event);
    if (!remindedKeys.has(key)) continue;

    const eventDate = parseEventDate(event.date);
    if (!eventDate) continue;

    const notifyAt = reminderDate(event, settings.reminderLeadMinutes);
    if (!notifyAt) continue;

    const formatted = formatDate(eventDate, locale);
    const timeStr = event.time
      ? ` ${t('notifications.atTime', { time: event.time })}`
      : '';

    await Notifications.scheduleNotificationAsync({
      content: {
        title: t('notifications.reminderTitle', { name: event.name }),
        body: `${event.venue}${timeStr}\n${formatted.weekday}, ${formatted.month} ${formatted.day}`,
        data: { type: 'event_reminder', eventKey: key },
      },
      trigger: { date: notifyAt, type: 'date', channelId: REMINDER_CHANNEL },
    });
  }
}

// Quick helper to schedule/cancel a single event reminder without
// doing a full reschedule. Still safe if called redundantly since
// rescheduleAllNotifications will clean up.
export async function scheduleOneReminder(event) {
  const settings = await getSettings();
  const eventDate = parseEventDate(event.date);
  if (!eventDate) return false;

  const notifyAt = reminderDate(event, settings.reminderLeadMinutes);
  if (!notifyAt) return false;

  await ensureReminderChannel();
  const locale = getLocale();
  const formatted = formatDate(eventDate, locale);
  const timeStr = event.time
    ? ` ${t('notifications.atTime', { time: event.time })}`
    : '';

  await Notifications.scheduleNotificationAsync({
    content: {
      title: t('notifications.reminderTitle', { name: event.name }),
      body: `${event.venue}${timeStr}\n${formatted.weekday}, ${formatted.month} ${formatted.day}`,
      data: { type: 'event_reminder', eventKey: makeEventKey(event) },
    },
    trigger: { date: notifyAt, type: 'date', channelId: REMINDER_CHANNEL },
  });
  return true;
}
