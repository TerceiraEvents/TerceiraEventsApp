import React from 'react';
import { TodayEventsWidget } from './TodayEventsWidget';

const SPECIAL_EVENTS_URL =
  'https://raw.githubusercontent.com/TerceiraEvents/EventosTerceira/main/_data/special_events.yml';
const WEEKLY_EVENTS_URL =
  'https://raw.githubusercontent.com/TerceiraEvents/EventosTerceira/main/_data/weekly.yml';

// Lightweight YAML date parser for widget context (no heavy js-yaml dependency).
// Special events YAML has entries like:
//   - name: "Event Name"
//     date: 2026-04-03
//     time: "21:00"
//     venue: "Venue Name"
// js-yaml auto-parses dates, but in the widget headless JS context we use fetch + simple parsing.

function getTodayDayName() {
  const days = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
  ];
  return days[new Date().getDay()];
}

function getTodayDateString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Simple line-based YAML parser for the flat event list structure.
// This avoids importing the full js-yaml library in the widget headless context.
function parseSimpleYaml(text) {
  const items = [];
  let current = null;

  for (const rawLine of text.split('\n')) {
    const line = rawLine.trimEnd();
    if (/^\s*- /.test(line)) {
      // New list item
      if (current) items.push(current);
      current = {};
      const match = line.match(/^\s*- (\w+):\s*(.*)$/);
      if (match) {
        current[match[1]] = cleanValue(match[2]);
      }
    } else if (current && /^\s+\w+:/.test(line)) {
      const match = line.match(/^\s+(\w+):\s*(.*)$/);
      if (match) {
        current[match[1]] = cleanValue(match[2]);
      }
    }
  }
  if (current) items.push(current);
  return items;
}

function cleanValue(val) {
  if (!val) return '';
  // Remove surrounding quotes
  let v = val.trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    v = v.slice(1, -1);
  }
  return v;
}

// Parse the weekly.yml which has a nested structure:
// - day: "Monday"
//   events:
//     - name: "Event"
//       venue: "Place"
//       time: "21:00"
function parseWeeklyYaml(text) {
  const result = [];
  let currentDay = null;
  let currentEvent = null;
  let inEvents = false;

  for (const rawLine of text.split('\n')) {
    const line = rawLine.trimEnd();

    // Top-level day entry
    if (/^- day:/.test(line)) {
      if (currentDay && currentEvent) {
        currentDay.events.push(currentEvent);
        currentEvent = null;
      }
      if (currentDay) result.push(currentDay);
      const match = line.match(/^- day:\s*(.*)$/);
      currentDay = { day: cleanValue(match ? match[1] : ''), events: [] };
      inEvents = false;
      continue;
    }

    if (!currentDay) continue;

    // events: key
    if (/^\s+events:\s*$/.test(line)) {
      inEvents = true;
      continue;
    }

    // Non-event property of day
    if (!inEvents && /^\s+\w+:/.test(line)) {
      const match = line.match(/^\s+(\w+):\s*(.*)$/);
      if (match) {
        currentDay[match[1]] = cleanValue(match[2]);
      }
      continue;
    }

    // Event list item
    if (inEvents && /^\s+- /.test(line)) {
      if (currentEvent) currentDay.events.push(currentEvent);
      currentEvent = {};
      const match = line.match(/^\s+- (\w+):\s*(.*)$/);
      if (match) {
        currentEvent[match[1]] = cleanValue(match[2]);
      }
      continue;
    }

    // Event property
    if (inEvents && currentEvent && /^\s+\w+:/.test(line)) {
      const match = line.match(/^\s+(\w+):\s*(.*)$/);
      if (match) {
        currentEvent[match[1]] = cleanValue(match[2]);
      }
    }
  }

  if (currentDay) {
    if (currentEvent) currentDay.events.push(currentEvent);
    result.push(currentDay);
  }

  return result;
}

async function fetchTodayEvents() {
  const todayStr = getTodayDateString();
  const todayDay = getTodayDayName();
  const allEvents = [];

  try {
    // Fetch special events for today
    const specialResp = await fetch(SPECIAL_EVENTS_URL);
    const specialText = await specialResp.text();
    const specialEvents = parseSimpleYaml(specialText);

    for (const event of specialEvents) {
      // Date field may be "2026-04-03" or similar
      if (event.date && event.date.startsWith(todayStr)) {
        allEvents.push({
          name: event.name || 'Event',
          time: event.time || '',
          venue: event.venue || '',
        });
      }
    }
  } catch (e) {
    console.warn('Widget: failed to fetch special events', e);
  }

  try {
    // Fetch weekly events for today's day of week
    const weeklyResp = await fetch(WEEKLY_EVENTS_URL);
    const weeklyText = await weeklyResp.text();
    const weeklyDays = parseWeeklyYaml(weeklyText);

    for (const dayGroup of weeklyDays) {
      if (dayGroup.day && dayGroup.day.toLowerCase() === todayDay.toLowerCase()) {
        for (const event of dayGroup.events || []) {
          allEvents.push({
            name: event.name || 'Event',
            time: event.time || '',
            venue: event.venue || '',
          });
        }
      }
    }
  } catch (e) {
    console.warn('Widget: failed to fetch weekly events', e);
  }

  // Sort by time (events with times first, then alphabetically)
  allEvents.sort((a, b) => {
    if (a.time && !b.time) return -1;
    if (!a.time && b.time) return 1;
    if (a.time && b.time) return a.time.localeCompare(b.time);
    return a.name.localeCompare(b.name);
  });

  return allEvents;
}

const nameToWidget = {
  TodayEvents: TodayEventsWidget,
};

export async function widgetTaskHandler(props) {
  const widgetInfo = props.widgetInfo;
  const Widget = nameToWidget[widgetInfo.widgetName];

  if (!Widget) {
    console.warn(`Unknown widget: ${widgetInfo.widgetName}`);
    return <TodayEventsWidget events={[]} />;
  }

  switch (props.widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED': {
      const events = await fetchTodayEvents();
      return <Widget events={events} />;
    }
    case 'WIDGET_DELETED':
      // Nothing to clean up
      break;
    case 'WIDGET_CLICK': {
      // OPEN_APP click action is handled natively by react-native-android-widget
      // Re-render with fresh data on any click
      const events = await fetchTodayEvents();
      return <Widget events={events} />;
    }
    default:
      break;
  }

  return <Widget events={[]} />;
}
