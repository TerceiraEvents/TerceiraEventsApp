# AGENTS.md — TerceiraEventsApp (Expo app)

This is the Terceira Events native app: an Expo React Native app sharing
the website's event data and product contract. Judge every change by task
completion — finding today's events, finding weekly events, understanding
an event, acting on it. Compare against the existing UI first. Preserve or
revert changes that add taps, hide content or actions, truncate summaries,
weaken contrast, or introduce jargon without a demonstrated benefit.

## Stack and checks

- CI (`.github/workflows/lint.yml`) runs on Node 22 with `npm ci`:
  `npx expo lint`, `npm test` (`node --test "src/**/*.test.js"`), and
  `npx expo export --platform web`. Run the same commands locally. New
  behavior requires tests; keep assertions as written and never silence
  failures or loosen expectations to obtain green runs.

## Product contract

- Five tabs, in order: Home, Events, Weekly, Venues, More (`App.js`,
  `primaryRoutes` in `src/utils/navigation.js`). Display strings live in
  `src/i18n/strings.en.js` and `strings.pt.js`; use the user-visible names
  and never introduce new destination names.
- Today is immediate on Home: `src/screens/HomeScreen.js` opens on the
  today window with one-tap tomorrow/weekend shortcuts (`shortcutWindow` in
  `src/utils/discovery.js`, Azores day from `src/hooks/useAzoresDay.js`).
  Weekly takes one tab activation (`src/screens/WeeklyScreen.js`, fed by
  `fetchWeeklyEvents` in `src/utils/data.js`).
- The Events screen (`src/screens/SpecialEventsScreen.js`) lists Events and
  Exhibitions as plain kinds with compact filters. Locality options derive
  from `localityCoverage` with its partial-coverage note; matching is AND
  (`matchesDiscoveryOptions` in `src/utils/discovery.js`). Empty states,
  truthful counts, and Clear-filters behavior mirror the website.
- Saved events is an optional filter over on-device records
  (`src/utils/storage.js`, `src/utils/savedPlans.js`); the product copy
  states saves do not sync across devices and saving does not enable
  reminders (`discovery.localOnly`). Save state and notification/reminder
  permission and state are independent: denied notifications leave saved
  events untouched. Never gate saving on notification permission.
- Detail routes carry identity only (`eventDetailParams` in
  `src/utils/eventRoute.js`); Back returns to the exact origin with the
  selected date, filters, and scroll context preserved.
- Event cards (`src/components/EventCard.js`) show full published summaries
  with direct Maps, published-source/booking, Share, calendar, and report
  actions. Summaries resolve through `localizedField`
  (`src/utils/i18nFields.js`): requested locale, then the bare field, then
  the other published language. Never invent translations; never hide a
  published language.

## Data and curator corrections

- Special events arrive from the published feed with a cached fallback;
  weekly schedules arrive from the website feed, and `src/utils/data.js`
  also carries bundled venue descriptions. Apply curator corrections to
  every duplicated copy (feed data, weekly schedules, bundled descriptions)
  within their stated scope without inventing another weekday. Never remove
  historical one-off events to satisfy a correction about recurring
  schedules. Distinguish a user correction from fresh organizer-source
  verification.

## Verification boundaries

- Clock and cache fixtures share one deterministic island day
  (`src/utils/coldCache.test.js`, `src/utils/cacheMatrix.test.js`).
- Resolved-color, cascade, and contrast checks apply to rendered text;
  token presence alone proves nothing about visible labels.
- Accessibility: generated focus captions demonstrate focused utterances
  and activation only — not audio pronunciation or automatic announcements.
  Simulator checks never establish physical-device screen-reader speech.
  Record the boundary on every such claim.
- Calendar: inspect or cancel drafts; persisting a draft is a separate,
  explicitly authorized step. A generic offline calendar editor needs no
  account; account-specific onboarding is a separate check.
- Production HTTPS app links require a real Apple Team ID, release
  certificate fingerprints, native association configuration, and domain
  files. Custom-scheme success is a separate, weaker result; never imply
  production association from debug artifacts.
- Keep task tools and data isolated; restore device settings
  (accessibility, font scale, locale, home state) to baseline; remove only
  exact disposable QA records.
