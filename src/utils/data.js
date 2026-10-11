import { load as yamlLoad } from 'js-yaml';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { validateEventDataset } from './feedState.js';
import { normalizeEventTags } from './tags.js';

const SPECIAL_EVENTS_URL =
  'https://raw.githubusercontent.com/TerceiraEvents/EventosTerceira.pt/main/_data/special_events.yml';
const WEEKLY_EVENTS_URL =
  'https://raw.githubusercontent.com/TerceiraEvents/EventosTerceira.pt/main/_data/weekly.yml';

const STORAGE_KEY_SPECIAL = 'terceiraevents_cache_special';
const STORAGE_KEY_WEEKLY = 'terceiraevents_cache_weekly';

let cachedSpecialEvents = null;
let specialFeedState = { status: 'loading', fetchedAt: null };
export function getSpecialFeedState() { return { ...specialFeedState }; }
let cachedWeeklyEvents = null;

async function loadFromStorage(key) {
  try {
    const yamlText = await AsyncStorage.getItem(key);
    if (yamlText !== null) {
      return validateEventDataset(yamlLoad(yamlText));
    }
  } catch (e) {
    console.error('Failed to read from AsyncStorage:', e);
  }
  return null;
}

async function saveToStorage(key, yamlText) {
  try {
    await AsyncStorage.setItem(key, yamlText);
  } catch (e) {
    console.error('Failed to write to AsyncStorage:', e);
  }
}

export async function fetchSpecialEvents(forceRefresh = false) {
  if (cachedSpecialEvents && !forceRefresh) return cachedSpecialEvents;
  try {
    const response = await fetch(SPECIAL_EVENTS_URL);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const text = await response.text();
    cachedSpecialEvents = validateEventDataset(yamlLoad(text));
    specialFeedState = { status: 'current', fetchedAt: new Date().toISOString() };
    await saveToStorage(STORAGE_KEY_SPECIAL, text);
    return cachedSpecialEvents;
  } catch (error) {
    console.error('Failed to fetch special events:', error);
    const stored = cachedSpecialEvents || await loadFromStorage(STORAGE_KEY_SPECIAL);
    specialFeedState = { status: stored ? 'cached' : 'error', fetchedAt: null };
    if (stored) {
      cachedSpecialEvents = stored;
      return cachedSpecialEvents;
    }
    return [];
  }
}

export async function fetchWeeklyEvents() {
  if (cachedWeeklyEvents) return cachedWeeklyEvents;
  try {
    const response = await fetch(WEEKLY_EVENTS_URL);
    const text = await response.text();
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    cachedWeeklyEvents = validateEventDataset(yamlLoad(text));
    await saveToStorage(STORAGE_KEY_WEEKLY, text);
    return cachedWeeklyEvents;
  } catch (error) {
    console.error('Failed to fetch weekly events:', error);
    const stored = await loadFromStorage(STORAGE_KEY_WEEKLY);
    if (stored) {
      cachedWeeklyEvents = stored;
      return cachedWeeklyEvents;
    }
    return [];
  }
}

export function clearCache() {
  cachedSpecialEvents = null;
  cachedWeeklyEvents = null;
}

function isoCalendarDate(value) {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    // YAML dates use UTC midnight; other Date values carry a local calendar day.
    const utcMidnight = value.getUTCHours() === 0 && value.getUTCMinutes() === 0 &&
      value.getUTCSeconds() === 0 && value.getUTCMilliseconds() === 0;
    const year = utcMidnight ? value.getUTCFullYear() : value.getFullYear();
    const month = utcMidnight ? value.getUTCMonth() : value.getMonth();
    const day = utcMidnight ? value.getUTCDate() : value.getDate();
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }
  if (value == null) return null;
  const iso = String(value).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const parsed = new Date(`${iso}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === iso
    ? iso
    : null;
}

export function parseEventDate(dateValue) {
  const iso = isoCalendarDate(dateValue);
  if (!iso) return null;
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function lastSundayUTC(year, month) {
  const lastDay = new Date(Date.UTC(year, month + 1, 0));
  return lastDay.getUTCDate() - lastDay.getUTCDay();
}

function todayAzoresFallback(now) {
  const year = now.getUTCFullYear();
  const summerStart = Date.UTC(year, 2, lastSundayUTC(year, 2), 1);
  const summerEnd = Date.UTC(year, 9, lastSundayUTC(year, 9), 1);
  const instant = now.getTime();
  const offsetHours = instant >= summerStart && instant < summerEnd ? 0 : -1;
  return new Date(instant + offsetHours * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export function todayAzores(now = new Date()) {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Atlantic/Azores',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(now);
    const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
    const iso = `${values.year}-${values.month}-${values.day}`;
    if (isoCalendarDate(iso)) return iso;
  } catch {
    return todayAzoresFallback(now);
  }
  return todayAzoresFallback(now);
}

// Map an app locale code to the BCP-47 string we hand to
// `toLocaleDateString` / `Intl.DateTimeFormat`. We deliberately use
// `pt-PT` for Portuguese (the Azores variant), not `pt-BR`.
function intlLocale(locale) {
  if (locale === 'pt') return 'pt-PT';
  return 'en-US';
}

// "2026-04-30" → "30 Apr 2026" (en) or "30 abr. 2026" (pt). Used by
// blog post lists / details. js-yaml Date objects are also accepted.
export function formatPostDate(value, locale) {
  if (!value) return '';
  const iso = value instanceof Date
    ? (isNaN(value.getTime()) ? null : value.toISOString().slice(0, 10))
    : String(value);
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(intlLocale(locale), {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

// "2026-05-05" → "5 May" (no year). Used in compact event lists like
// the homepage "Upcoming special events" preview, where a year would
// be redundant for events all in the next ~12 months.
export function formatEventDateShort(value, locale) {
  if (!value) return '';
  const d = parseEventDate(value);
  if (!d) return String(value);
  return d.toLocaleDateString(intlLocale(locale), {
    day: 'numeric',
    month: 'short',
  });
}

const MONTH_NAMES = {
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
       'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  pt: ['jan', 'fev', 'mar', 'abr', 'mai', 'jun',
       'jul', 'ago', 'set', 'out', 'nov', 'dez'],
};

export function formatDate(date, locale) {
  const months = MONTH_NAMES[locale === 'pt' ? 'pt' : 'en'];
  return {
    month: months[date.getMonth()],
    day: date.getDate(),
    year: date.getFullYear(),
    weekday: date.toLocaleDateString(intlLocale(locale), { weekday: 'long' }),
  };
}

export function sortEventsByDate(events) {
  return [...events].sort((a, b) => {
    const da = isoCalendarDate(a?.date);
    const db = isoCalendarDate(b?.date);
    if (!da && !db) return 0;
    if (!da) return 1;
    if (!db) return -1;
    return da.localeCompare(db);
  });
}

function endDateOf(event) {
  return isoCalendarDate(event?.end_date) || isoCalendarDate(event?.date);
}

function addDays(iso, days) {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

const RANGE_DAYS = { week: 7, month: 31, year: 365 };
export const VALID_RANGES = new Set(['week', 'month', 'year', 'all', 'archive']);

export function eventKind(event) {
  return event?.kind === 'exhibition' ? 'exhibition' : 'event';
}

export function isEnded(event, today = todayAzores()) {
  const end = endDateOf(event);
  return !end || end < today;
}

export function isActive(event, today = todayAzores()) {
  return !isEnded(event, today);
}

export function exhibitionStatus(event, today = todayAzores()) {
  const start = isoCalendarDate(event?.date);
  const end = endDateOf(event);
  if (!start || !end || end < today) return 'ended';
  if (start > today) return start <= addDays(today, 13) ? 'opening-soon' : 'upcoming';
  return end <= addDays(today, 13) ? 'ending-soon' : 'on-view';
}

function compareName(a, b) {
  return String(a?.name || '').localeCompare(String(b?.name || ''));
}

export function sortExhibitions(list, today = todayAzores()) {
  const order = ['opening-soon', 'ending-soon', 'on-view', 'upcoming', 'ended'];
  return [...list].sort((a, b) => {
    const statusA = exhibitionStatus(a, today);
    const statusB = exhibitionStatus(b, today);
    const statusOrder = order.indexOf(statusA) - order.indexOf(statusB);
    if (statusOrder) return statusOrder;
    const dateA = statusA === 'opening-soon' || statusA === 'upcoming'
      ? isoCalendarDate(a?.date)
      : endDateOf(a);
    const dateB = statusB === 'opening-soon' || statusB === 'upcoming'
      ? isoCalendarDate(b?.date)
      : endDateOf(b);
    return (dateA || '').localeCompare(dateB || '') || compareName(a, b);
  });
}

function attendanceDate(event, today) {
  const start = isoCalendarDate(event?.date);
  const end = endDateOf(event);
  return start && end && start < today && end >= today ? today : start;
}

export function sortDatedEvents(list, today = todayAzores()) {
  return [...list].sort((a, b) => {
    const dateA = attendanceDate(a, today);
    const dateB = attendanceDate(b, today);
    if (!dateA && !dateB) return 0;
    if (!dateA) return 1;
    if (!dateB) return -1;
    const dateOrder = dateA.localeCompare(dateB);
    if (dateOrder) return dateOrder;
    return String(a?.time || '').localeCompare(String(b?.time || '')) || compareName(a, b);
  });
}

export function filterByKind(list, kind) {
  return kind === 'all' ? [...list] : list.filter((event) => eventKind(event) === kind);
}

export function eventDateRange(event) {
  const start = isoCalendarDate(event?.date);
  const end = endDateOf(event);
  if (!start || !end) return null;
  const days = (Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86400000 + 1;
  return { start, end, days };
}

export function eventOccursOn(event, isoDate) {
  const range = eventDateRange(event);
  const date = isoCalendarDate(isoDate);
  return Boolean(range && date && range.start <= date && date <= range.end);
}

// Test whether an event falls inside a given date range. Mirrors the
// website's range filter (rolling windows of 7 / 31 / 365 days from today).
// `archive` is past-only; everything else is upcoming-only.
export function isInRange(event, range, today = todayAzores()) {
  const start = isoCalendarDate(event?.date);
  const end = endDateOf(event);
  if (!start || !end) return false;
  if (range === 'archive') return end < today;
  if (end < today) return false;
  if (range === 'all') return true;
  const days = RANGE_DAYS[range];
  if (!days) return true;
  return start < addDays(today, days);
}

export function isUpcoming(event, today = todayAzores()) {
  return isActive(event, today);
}

export function isThisWeek(event, today = todayAzores()) {
  return isInRange(event, 'week', today);
}

// Returns true when the event matches a free-text query against its name,
// venue, and description. An empty or whitespace-only query always matches.
export function matchesSearchQuery(event, query) {
  if (!query) return true;
  const q = String(query).trim().toLowerCase();
  if (!q) return true;
  const name = (event?.name || '').toLowerCase();
  const venue = (event?.venue || '').toLowerCase();
  const desc = (event?.description || '').toLowerCase();
  return (
    name.indexOf(q) !== -1 ||
    venue.indexOf(q) !== -1 ||
    desc.indexOf(q) !== -1
  );
}

// Returns true when the event has the given tag slug. Handles both the
// `tags: [...]` array form and the legacy `kid_friendly: true` boolean.
// A falsy selectedTag matches every event.
export function matchesTag(event, selectedTag) {
  if (!selectedTag) return true;
  const tags = normalizeEventTags(event);
  return tags.indexOf(selectedTag) !== -1;
}

// Applies the optional tag picker and search query to a list of events.
// Pure function — no dependency on the current date, so callers should
// pre-filter by thisWeek/upcoming/archive before calling this.
export function applyEventFilters(events, { search = '', selectedTag = '' } = {}) {
  let result = events;
  if (selectedTag) {
    result = result.filter((e) => matchesTag(e, selectedTag));
  }
  if (search && String(search).trim()) {
    result = result.filter((e) => matchesSearchQuery(e, search));
  }
  return result;
}

export const venues = [
  {
    name: 'Tasca do Camões',
    address: 'Rua Da Rocha 64, Angra do Heroísmo',
    description: 'Weekly schedule:\n• Wednesday — Karaoke Night\n• Thursday — Latin Night\n\nAlso hosts live concerts and special events throughout the year.',
    mapQuery: 'Tasca+do+Camões+Angra+do+Heroísmo',
  },
  {
    name: 'The Texan / The Garden Club',
    address: 'Rua Carreira dos Cavalos 37, Angra do Heroísmo',
    description: 'Tex-Mex restaurant and bar with cocktails, large screens for sports, and a garden event space.\n\nWeekly schedule:\n• Friday — Karaoke Night\n• Saturday — Karaoke Night',
    mapQuery: 'The+Texan+Angra+do+Heroísmo',
    instagram: 'https://www.instagram.com/thetexanbar/',
    website: 'https://www.thetexan.pt',
    reservation: 'https://the-texan-1755256381.resos.com/booking',
  },
  {
    name: 'Sala 319',
    address: 'Praça Almeida Garrett 11, Angra do Heroísmo',
    description: 'Restaurant and bar serving Portuguese and European cuisine, with events and live music.',
    mapQuery: 'Sala+319+Angra+do+Heroísmo',
    instagram: 'https://www.instagram.com/sala.319/',
    phone: '+351 967 021 868',
  },
  {
    name: 'Wine Not',
    address: 'Angra do Heroísmo',
    description: 'Weekly schedule:\n• Monday — Dance Night',
    mapQuery: 'Wine+Not+Angra+do+Heroísmo',
  },
  {
    name: 'Lar Doce Livro',
    address: 'Rua de São João 22-24, Angra do Heroísmo',
    description: 'A bookstore-café in the historic center hosting cultural events, readings, and the weekly reading club.\n\nWeekly schedule:\n• Wednesday — Clube de Leitura (Reading Club) at 18:15',
    mapQuery: 'Lar+Doce+Livro+Angra+do+Heroísmo',
  },
  {
    name: 'Teatro Angrense',
    address: 'Rua da Esperança 48-52, Angra do Heroísmo',
    description: 'Historic theater in the UNESCO-listed city center. Hosts plays, concerts, fado nights, and the annual Festival de Teatro.',
    mapQuery: 'Teatro+Angrense+Angra+do+Heroísmo',
    website: 'https://angradoheroismo.pt/local/teatro-angrense-2/',
    tickets: 'https://ticketline.sapo.pt/en/salas/sala/1293',
  },
  {
    name: 'CCCAH (Centro Cultural e de Congressos)',
    address: 'Canada Nova, Santa Luzia, Angra do Heroísmo',
    description: "Angra's main cultural and conference center, converted from the former bullring. Hosts cinema screenings, music festivals, exhibitions, and conferences.",
    mapQuery: 'Centro+Cultural+e+de+Congressos+Angra+do+Heroísmo',
    website: 'https://angradoheroismo.pt/local/centro-cultural-e-de-congressos-de-angra-do-heroismo/',
    tickets: 'https://ticketline.sapo.pt/en/salas/sala/1294',
  },
  {
    name: 'Havanna Club',
    address: 'Porto das Pipas 154, Angra do Heroísmo',
    description: 'One of the busiest bars at the marina. DJ nights, karaoke-to-dancing Saturdays, and themed party events. Covered terrace with sea views.',
    mapQuery: 'Havanna+Club+Angra+do+Heroísmo',
    instagram: 'https://www.instagram.com/havannaangra/',
    phone: '917 746 773',
  },
  {
    name: 'Casa do Sal / Oficina d\'Angra',
    address: 'Estrada Gaspar Corte-Real, Angra do Heroísmo',
    description: 'Cultural association and event space hosting live music nights, DJ sessions, and alternative cultural events.',
    mapQuery: 'Casa+do+Sal+Oficina+Angra+do+Heroísmo',
    facebook: 'https://www.facebook.com/oficinadangra/',
  },
  {
    name: 'Paços do Concelho (Town Hall)',
    address: 'Praça Velha, Angra do Heroísmo',
    description: 'The historic town hall at Praça Velha square. Hosts book presentations, exhibitions, and civic cultural events.',
    mapQuery: 'Paços+do+Concelho+Angra+do+Heroísmo',
  },
  {
    name: 'Praça de Toiros da Ilha Terceira',
    address: 'Av. de Jácome de Bruges, 9700-102 Angra do Heroísmo',
    description: "Terceira's bullring, home to the Arraial Taurino and traditional bullfighting festivals during the season (May–October).",
    mapQuery: 'Praça+de+Toiros+Ilha+Terceira',
  },
  {
    name: 'Auditório AMIT',
    address: 'Av. Tenente Coronel José Agostinho 6-A, 9700-108 Angra do Heroísmo',
    description: 'Auditorium of the Musical Academy of Terceira Island. Hosts concerts, recitals, jazz courses, and choral performances.',
    mapQuery: 'Academia+Musical+Ilha+Terceira+Angra+do+Heroísmo',
    instagram: 'https://www.instagram.com/auditorioamit/',
  },
];

export const resources = [
  {
    name: 'Bullfight Finder App',
    description: 'The go-to app for finding touradas à corda (rope bullfights) across Terceira. Real-time alerts, event calendar, GPS directions, and weather updates. The bull season runs from May 1 to October 15, with over 200 events per year.',
    url: 'https://bullfightfinder-landing-page.web.app/',
    appStore: 'https://apps.apple.com/us/app/bullfight-finder/id1659230479',
    playStore: 'https://play.google.com/store/apps/details?id=com.eventfinder.bullfightfinderandroid',
  },
  {
    name: 'Câmara Municipal — Eventos',
    description: 'The official events page from the Angra do Heroísmo city council. Covers municipal events, festivals, exhibitions, and cultural programming.',
    url: 'https://angradoheroismo.pt/eventos/',
  },
  {
    name: 'Agendaçores',
    description: 'Azores-wide event listing site with an Angra do Heroísmo tag for local events.',
    url: 'https://agendacores.pt/events/etiqueta/angra-do-heroismo/',
  },
  {
    name: 'Songkick — Angra do Heroísmo',
    description: 'Concert and festival listings for the Angra do Heroísmo area.',
    url: 'https://www.songkick.com/metro-areas/53979-portugal-angra-do-heroismo',
  },
  {
    name: 'Explore Terceira',
    description: 'Tourism site covering nightlife, local commerce, and cultural events across the island.',
    url: 'https://www.exploreterceiraisland.com/en/discover/urban-life/',
  },
];

export const instagramAccounts = [
  { handle: '@angradoheroismo', label: 'Câmara Municipal de Angra do Heroísmo', url: 'https://www.instagram.com/angradoheroismo/' },
  { handle: '@tascadocamoes', label: 'Tasca do Camões', url: 'https://www.instagram.com/tascadocamoes/' },
  { handle: '@thetexanbar', label: 'The Texan', url: 'https://www.instagram.com/thetexanbar/' },
  { handle: '@thegardenclub.angra', label: 'The Garden Club', url: 'https://www.instagram.com/thegardenclub.angra/' },
  { handle: '@sala.319', label: 'Sala 319', url: 'https://www.instagram.com/sala.319/' },
  { handle: '@havannaangra', label: 'Havanna Club', url: 'https://www.instagram.com/havannaangra/' },
  { handle: '@livrarialardocelivro', label: 'Lar Doce Livro', url: 'https://www.instagram.com/livrarialardocelivro/' },
  { handle: '@fullrange_rave', label: 'Full Range (electronic events)', url: 'https://www.instagram.com/fullrange_rave/' },
  { handle: '@auditorioamit', label: 'Auditório AMIT', url: 'https://www.instagram.com/auditorioamit/' },
];

export const facebookPages = [
  { name: 'Tasca do Camões', label: 'concerts, karaoke, and event listings', url: 'https://www.facebook.com/tascadocamoes/' },
  { name: 'Oficina d\'Angra / Casa do Sal', label: 'alternative music and cultural events', url: 'https://www.facebook.com/oficinadangra/' },
  { name: 'Havanna Terceira', label: 'party nights and DJ events', url: 'https://www.facebook.com/p/Havanna-Terceira-100059128671983/' },
  { name: 'Lar Doce Livro', label: 'readings, book launches, cultural events', url: 'https://www.facebook.com/livrarialardocelivro/' },
  { name: 'Casa do Sal', label: 'live music and community events', url: 'https://www.facebook.com/casadosal.angra/' },
];
