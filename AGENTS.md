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

- The current nine-issue completion scope prioritizes readable layouts,
  keyboard/focus access, labeled controls, touch targets, enlarged text and
  actual browser zoom. Speech-specific testing (pronunciation, automatic
  spoken output, audio recording or transcription) and speech-only features
  require an explicit new user request; the omitted speech checks are
  user-skipped, not unfinished device or simulator work. Existing assistive
  labels and semantics stay in place, and source/platform evidence
  boundaries from earlier runs still apply.
- Clock and cache fixtures share one deterministic island day
  (`src/utils/coldCache.test.js`, `src/utils/cacheMatrix.test.js`).
- Resolved-color, cascade, and contrast checks apply to rendered text;
  token presence alone proves nothing about visible labels.
- Accessibility: generated captions can establish the focused utterance
  strings and activation actually observed — but not audio pronunciation,
  and automatic status announcements still need an actual
  assistive-technology run. Simulator checks never establish
  physical-device screen-reader speech. Record the boundary on every such
  claim.
- Calendar: verify calendar drafts and persistence within the user's
  authorized task scope, distinguish editor-field checks from actual saved
  events, and clean only exact disposable QA records. A generic offline
  calendar editor needs no account; account-specific onboarding is a
  separate check.
- Production HTTPS app links require a real Apple Team ID, release
  certificate fingerprints, native association configuration, and domain
  files. Custom-scheme success is a separate, weaker result; never imply
  production association from debug artifacts.
- Apple capability changes require matching provisioning-profile contents
  in both the Apple portal and EAS. Check the exact app identifier, granted
  entitlement and existing distribution certificate before replacing an
  authorized profile. Keep certificate and private-key changes separate.
- A successful build-dispatch workflow establishes submission to EAS.
  Check the completed native EAS build itself before reporting build
  success; preserve its source commit, profile and build number.
- Native UI verification records the actual executed test count. An empty
  suite proves no behavior. Use observed system-editor roles and identifiers,
  and inspect a failed locator before treating it as an application defect.
- Declare only the canonical shared-URL host (`eventosterceira.pt`)
  natively: Android verification requires association data for every
  declared host, and the `www` alias only redirects to the apex. JavaScript
  link parsing may still accept `www` website URLs; OS registration is
  narrower than accepted input.
- Keep task tools and data isolated; restore device settings
  (accessibility, font scale, locale, home state) to baseline; remove only
  exact disposable QA records.
