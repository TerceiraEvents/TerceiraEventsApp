# Event discovery

Primary destinations are Home, Explore, Places, My Plans, and More. More provides Blog, Resources, Settings, and Suggest an Event. Explore separates dated events and On View and provides access to weekly published schedules.

The shared dataset's explicit `id` identifies an event. Website links use `https://eventosterceira.pt/events/?id=<id>`; Portuguese links use `/pt/events/?id=<id>`. The application accepts these routes and `terceiraevents://events?id=<id>`. Universal-link association files and native platform association configuration are required for operating-system delivery of HTTPS links. The custom scheme works with builds containing the declared scheme. An ID absent from the dataset opens an unavailable state.

My Plans stores `{ id, event }` snapshots in device-local storage, uses current metadata for known IDs, and retains missing records with an explicit snapshot notice. Saving does not request notification permission or schedule notifications. Reminder keys retain the existing date/name format for installed-version compatibility; reminders do not yet follow date/name corrections.

Home date shortcuts use Atlantic/Azores calendar dates. Today and Tomorrow are single days. This weekend selects Saturday and Sunday, or the remaining weekend day(s) when browsing on a weekend. On View is separate from dated occurrences. Weekly schedules are identified as published recurring schedules.

A successful data request records device fetch time, which does not imply organizer verification. Failed refreshes retain available memory or disk data and expose cached/error feedback. Dataset validation rejects non-array documents and records without names before cache persistence. Persistent-cache fetch time is unknown.

Feed cards show name, published date range and time, venue, and published price. Missing time and price remain explicit. Details provide descriptions, tags, poster art with contain sizing, full address, verified source/booking URLs when present, and sharing/reporting/map/calendar/reminder controls.

## Verification boundaries

Automated tests cover identity correction, repeat IDs, unavailable snapshots, link parsing, date shortcuts across year/DST weekends, and malformed datasets. Expo exports validate JavaScript bundles for web, Android, and iOS. Exporting a bundle does not validate native rendering, accessibility, back gestures, OS link delivery, notification permissions, or calendar integration. Native device checks and screenshots remain required before considering the cross-platform issues complete.

## Observed iOS checks

On 12 October 2026, the app launched through Expo Go 54.0.7 on an iPhone 17 Pro simulator running iOS 26.4. Native UI inspection opened the weekly route and displayed the published weekly schedules. Combining Free and Family filters returned one published result, Hora do Conto on 17 October at 17:30; selecting it opened that event detail, and Back retained the selected filters and result. A main-branch baseline Home screenshot recorded the eight-tab layout. The current public weekly YAML request returned HTTP 200 and passed the grouped-weekly validator with seven day groups and eleven named events. Runtime inspection exposed a validator shape error, covered by a failing-before/passing-after regression test.

These observations do not establish VoiceOver, enlarged text, notification/calendar permission behavior, offline behavior, custom/universal-link OS delivery, or Android correctness. Save remains disabled for records without the explicit shared dataset ID; native Save validation requires the shared schema rollout.
