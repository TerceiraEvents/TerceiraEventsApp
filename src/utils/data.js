import yaml from 'js-yaml';

const SPECIAL_EVENTS_URL =
  'https://raw.githubusercontent.com/AngraEvents/Angraevents.github.io/main/_data/special_events.yml';
const WEEKLY_EVENTS_URL =
  'https://raw.githubusercontent.com/AngraEvents/Angraevents.github.io/main/_data/weekly.yml';

let cachedSpecialEvents = null;
let cachedWeeklyEvents = null;

export async function fetchSpecialEvents() {
  if (cachedSpecialEvents) return cachedSpecialEvents;
  try {
    const response = await fetch(SPECIAL_EVENTS_URL);
    const text = await response.text();
    cachedSpecialEvents = yaml.load(text) || [];
    return cachedSpecialEvents;
  } catch (error) {
    console.error('Failed to fetch special events:', error);
    return [];
  }
}

export async function fetchWeeklyEvents() {
  if (cachedWeeklyEvents) return cachedWeeklyEvents;
  try {
    const response = await fetch(WEEKLY_EVENTS_URL);
    const text = await response.text();
    cachedWeeklyEvents = yaml.load(text) || [];
    return cachedWeeklyEvents;
  } catch (error) {
    console.error('Failed to fetch weekly events:', error);
    return [];
  }
}

export function clearCache() {
  cachedSpecialEvents = null;
  cachedWeeklyEvents = null;
}

export function parseEventDate(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr + 'T00:00:00');
  return isNaN(d.getTime()) ? null : d;
}

export function formatDate(date) {
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  return {
    month: months[date.getMonth()],
    day: date.getDate(),
    year: date.getFullYear(),
    weekday: date.toLocaleDateString('en-US', { weekday: 'long' }),
  };
}

export function isUpcoming(event) {
  const d = parseEventDate(event.date);
  if (!d) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d >= today;
}

export function isThisWeek(event) {
  const d = parseEventDate(event.date);
  if (!d) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weekFromNow = new Date(today);
  weekFromNow.setDate(weekFromNow.getDate() + 7);
  return d >= today && d < weekFromNow;
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
    address: 'Angra do Heroísmo',
    description: "Terceira's bullring, home to the Arraial Taurino and traditional bullfighting festivals during the season (May–October).",
    mapQuery: 'Praça+de+Toiros+Angra+do+Heroísmo',
  },
  {
    name: 'Auditório AMIT',
    address: 'Angra do Heroísmo',
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
