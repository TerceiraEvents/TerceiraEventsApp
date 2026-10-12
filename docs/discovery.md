# Event discovery

Primary destinations are Home, Explore, Places, My Plans, and More. More provides Blog, Resources, Settings, and Suggest an Event. Explore separates dated events and On View and provides access to weekly published schedules.

The shared dataset's explicit `id` identifies an event. Website links use `https://eventosterceira.pt/events/?id=<id>`; Portuguese links use `/pt/events/?id=<id>`. The application accepts these routes and `terceiraevents://events?id=<id>`. Universal-link association files and native platform association configuration are required for operating-system delivery of HTTPS links. The custom scheme works with builds containing the declared scheme. An ID absent from the dataset opens an unavailable state.

My Plans stores `{ id, event }` snapshots in device-local storage, uses current metadata for known IDs, and retains missing records with an explicit snapshot notice. Saving does not request notification permission or schedule notifications. Reminder keys retain the existing date/name format for installed-version compatibility; reminders do not yet follow date/name corrections.

Explore date filters use rolling windows labelled Next 7 days, Next 31 days, and Next 365 days, measured from the current Atlantic/Azores calendar day. Home date shortcuts use Atlantic/Azores calendar dates. Today and Tomorrow are single days. This weekend selects Saturday and Sunday, or the remaining weekend day(s) when browsing on a weekend. On View is separate from dated occurrences. Weekly schedules are identified as published recurring schedules.

A successful data request records device fetch time, which does not imply organizer verification. Failed refreshes retain available memory or disk data and expose cached/error feedback. Dataset validation rejects non-array documents. Individual records without a nonempty string name are omitted, with an explicit partial-data warning; usable records remain available. A response with only invalid records does not overwrite a usable cache. Persistent-cache fetch time is unknown.

Feed cards show name, published date range and time, venue, and published price. Localized fields prefer the requested language, then the original field, then an available EN/PT field; missing translations retain published information. Missing time and price remain explicit. Details provide descriptions, tags, poster art with contain sizing, full address, verified source/booking URLs when present, and sharing/reporting/map/calendar/reminder controls.

## Verification boundaries

Automated tests cover identity correction, repeat IDs, unavailable snapshots, link parsing, date shortcuts across year/DST weekends, and malformed datasets. Expo exports validate JavaScript bundles for web, Android, and iOS. Exporting a bundle does not validate native rendering, accessibility, back gestures, OS link delivery, notification permissions, or calendar integration. Native device checks and screenshots remain required before considering the cross-platform issues complete.

## Release dependencies

The shared website schema, stable IDs, and event detail routes must be deployed before this app change merges or ships: https://github.com/TerceiraEvents/EventosTerceira.pt/pull/250, https://github.com/TerceiraEvents/EventosTerceira.pt/pull/253, https://github.com/TerceiraEvents/EventosTerceira.pt/pull/254, and https://github.com/TerceiraEvents/EventosTerceira.pt/pull/255. Home classification requires explicit `kind`; saving and exact links require `id`. Locality controls offer only populated, validated locality values. Partial locality coverage is explicit; All places includes records without confirmed locality. The locality deployment is part of the release gate. Dataset failure offers Retry in details and My Plans and does not establish that an event is missing.

Headers use one shared navigation theme. Primary-tab headers use the green theme with light status text. Stack headers, including BlogIndex and Post, use the white theme with dark status text. The status-bar decision and rendered navigator header options use the same route theme.

Detail loading resolves event data, saved plans, and reminder state independently. A reminder read failure retains the exact event and saved collection, displays an unknown-reminder notice with Retry, and disables reminder changes until the state can be read.

Detail navigation uses `eventDetailParams` to preserve source calendar dates in JSON-safe snapshots. Published stable IDs identify the current record; a snapshot keeps published information available while the feed loads.

Explore filters, search and results share one scroll surface. `tabBarHeight` reserves two scaled label lines, icons and the device safe area; labels inherit the device font scale.

Saved state on detail pages remains unknown until storage is read successfully. Read failures expose Retry and disable the Saved toggle; event information, calendar and independent reminder state remain available.
Detail cards place their full-width heading above a wrapping action row. The date badge grows with its text; calendar, share, report and reminder actions keep their own accessible buttons.

## Artwork in event details

Artwork uses a fixed 360-point frame with contain sizing and an independent full-size link. A failed or rejected image displays localized feedback while retaining the published event and its actions. Android uses a polite live region; iOS image-load failures invoke the public accessibility announcement API. A rejected URL has no full-size control. Published `image_alt_en`/`image_alt_pt`, `image_credit`, `image_rights`, and HTTP(S) `image_source` provide accessibility and provenance. Relative artwork paths use `/assets/images/` in the shared repository; unsafe or malformed URLs have no image control. The component tests simulate image failure and inspect framing and EN/PT labels; they do not establish native decoding of portrait, landscape, or oversized files. Permission-cleared source samples and actual Android/iOS artwork rendering remain required.
