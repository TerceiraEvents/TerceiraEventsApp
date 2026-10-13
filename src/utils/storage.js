import { todayAzores } from './data.js';
import { createSavedPlans } from './savedPlans.js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  SETTINGS: 'terceiraevents_settings',
  REMINDERS: 'terceiraevents_reminders',
};

const DEFAULT_SETTINGS = {
  dailySummaryEnabled: false,
  dailySummaryHour: 9,
  dailySummaryMinute: 0,
  includeWeeklyInSummary: false,
  onlyRemindedWeeklyEvents: false,
  reminderLeadMinutes: 60,
};

export async function getSettings() {
  try {
    const raw = await AsyncStorage.getItem(KEYS.SETTINGS);
    if (!raw) return { ...DEFAULT_SETTINGS };
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export async function saveSettings(settings) {
  await AsyncStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
}

// Reminders are stored as a set of event keys: "YYYY-MM-DD|eventName"
// Using date+name as key makes it robust against reordering in the YAML

export function makeEventKey(event) {
  const dateStr =
    event.date instanceof Date
      ? event.date.toISOString().slice(0, 10)
      : String(event.date);
  return `${dateStr}|${event.name}`;
}

export async function getRemindedEventsStrict() {
  const raw = await AsyncStorage.getItem(KEYS.REMINDERS);
  if (!raw) return new Set();
  const keys = JSON.parse(raw);
  if (!Array.isArray(keys) || keys.some((key) => typeof key !== 'string')) throw new Error('Invalid reminder storage');
  return new Set(keys);
}

export async function getRemindedEvents() {
  try { return await getRemindedEventsStrict(); }
  catch { return new Set(); }
}

export async function setEventReminder(event) {
  const reminders = await getRemindedEvents();
  reminders.add(makeEventKey(event));
  await AsyncStorage.setItem(KEYS.REMINDERS, JSON.stringify([...reminders]));
}

export async function removeEventReminder(event) {
  const reminders = await getRemindedEvents();
  reminders.delete(makeEventKey(event));
  await AsyncStorage.setItem(KEYS.REMINDERS, JSON.stringify([...reminders]));
}

export async function isEventReminded(event) {
  const reminders = await getRemindedEvents();
  return reminders.has(makeEventKey(event));
}

// Clean up reminders for events that have already passed
export async function cleanupPastReminders() {
  const reminders = await getRemindedEvents();
  const today = todayAzores();
  const cleaned = new Set();
  for (const key of reminders) {
    const dateStr = key.split('|')[0];
    if (dateStr.slice(0, 10) >= today) {
      cleaned.add(key);
    }
  }
  await AsyncStorage.setItem(KEYS.REMINDERS, JSON.stringify([...cleaned]));
  return cleaned;
}

const savedPlans = createSavedPlans(AsyncStorage);
export const getSavedEvents = savedPlans.read;
export const toggleSavedEvent = savedPlans.toggle;
