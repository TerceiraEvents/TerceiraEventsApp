# Event discovery

Primary destinations are Home, Events, Weekly, Places, and More. More provides Blog, Resources, Settings, and Suggest an Event. Events separates dated events and Exhibitions. Weekly provides published recurring schedules with the primary tabs visible. The Home Weekly shortcut, Events weekly action, `/weekly/` and `/pt/weekly/` links, and root Weekly navigation entries open this primary destination.

The shared dataset's explicit `id` identifies an event. Website links use `https://eventosterceira.pt/events/?id=<id>`; Portuguese links use `/pt/events/?id=<id>`. The application accepts these routes and `terceiraevents://events?id=<id>`. Universal-link association files and native platform association configuration are required for operating-system delivery of HTTPS links. The custom scheme works with builds containing the declared scheme. An ID absent from the dataset opens an unavailable state.

Saved events filtering uses `{ id, event }` snapshots in device-local storage, uses current metadata for known IDs, and retains missing records with an explicit snapshot notice. Saving does not request notification permission or schedule notifications. Reminder keys retain the existing date/name format for installed-version compatibility; reminders do not yet follow date/name corrections.

Events date filters use rolling windows labelled Next 7 days, Next 31 days, and Next 365 days, measured from the current Atlantic/Azores calendar day. Home date shortcuts use Atlantic/Azores calendar dates. Today and Tomorrow are single days. This weekend selects Saturday and Sunday, or the remaining weekend day(s) when browsing on a weekend. Exhibitions is separate from dated occurrences. Weekly schedules are identified as published recurring schedules.

A successful data request records device fetch time, which does not imply organizer verification. Failed refreshes retain available memory or disk data and expose cached/error feedback. Dataset validation rejects non-array documents. Individual records without a nonempty string name are omitted, with an explicit partial-data warning; usable records remain available. A response with only invalid records does not overwrite a usable cache. Legacy persistent-cache fetch time is unknown and explicitly labelled. Failed refresh retains a known in-memory successful-fetch timestamp; no cache-age threshold or organizer-freshness guarantee is implied. An all-invalid disk cache is rejected as unusable without overwriting its stored bytes.

Feed cards show name, published date range and time, venue, and published price. Localized fields prefer the requested language, then the original field, then an available EN/PT field; missing translations retain published information. Missing time and price remain explicit. Details provide descriptions, tags, poster art with contain sizing, full address, verified source/booking URLs when present, and sharing/reporting/map/calendar/reminder controls.

## Verification boundaries

Automated tests cover identity correction, repeat IDs, unavailable snapshots, link parsing, date shortcuts across year/DST weekends, and malformed datasets. Expo exports validate JavaScript bundles for web, Android, and iOS. Exporting a bundle does not validate native rendering, accessibility, back gestures, OS link delivery, notification permissions, or calendar integration. Native device checks and screenshots remain required before considering the cross-platform issues complete.

## Release dependencies

The shared website schema, stable IDs, and event detail routes must be deployed before this app change merges or ships: https://github.com/TerceiraEvents/EventosTerceira.pt/pull/250, https://github.com/TerceiraEvents/EventosTerceira.pt/pull/253, https://github.com/TerceiraEvents/EventosTerceira.pt/pull/254, and https://github.com/TerceiraEvents/EventosTerceira.pt/pull/255. Home classification requires explicit `kind`; saving and exact links require `id`. Locality controls offer only populated, validated locality values. Partial locality coverage is explicit; All places includes records without confirmed locality. The locality deployment is part of the release gate. Dataset failure offers Retry in details and Saved events and does not establish that an event is missing.

Headers use one shared navigation theme. Primary-tab headers use the green theme with light status text. Stack headers, including BlogIndex and Post, use the white theme with dark status text. The status-bar decision and rendered navigator header options use the same route theme.

Detail loading resolves event data, saved plans, and reminder state independently. A reminder read failure retains the exact event and saved collection, displays an unknown-reminder notice with Retry, and disables reminder changes until the state can be read.

Detail navigation uses `eventDetailParams` to preserve source calendar dates in JSON-safe snapshots. Published stable IDs identify the current record; a snapshot keeps published information available while the feed loads.

Events filters, search and results share one scroll surface. `tabBarHeight` reserves two scaled label lines, icons and the device safe area; labels inherit the device font scale.

Saved state on detail pages remains unknown until storage is read successfully. Read failures expose Retry and disable the Saved toggle; event information, calendar and independent reminder state remain available.
Detail cards place their full-width heading above a wrapping action row. The date badge grows with its text; calendar, share, report and reminder actions keep their own accessible buttons.


## Cache-ready publication updates

`fetchSpecialEvents(forceRefresh)` reads and validates installed YAML cache before waiting for publication. A non-forced cold load returns usable stored records promptly, with `status: stored`, unknown legacy fetch time and neutral publication-checking feedback. It starts one background request; `subscribeSpecialEvents(listener)` delivers cache-ready and settled records plus feed state, and returns an unsubscribe function. `useSpecialFeed(onUpdate)` keeps a mounted consumer's callback current and releases the subscription when it unmounts. Home, Events and exact details consume these updates; pending publication does not establish an empty date or a missing event.

Forced refresh waits for the current request; concurrent forced/default cold callers coalesce into one disk read and one request. Known successful memory fetch time survives failure. Valid empty cache is distinct from unusable malformed/all-invalid cache; invalid bytes remain intact unless a valid publication replaces them. Cache clearing isolates later requests from earlier in-flight responses. Publication freshness is not organizer verification and no arbitrary stale threshold is implied.

Production deferred-network tests cover prompt cold cache, force/coalescing, background success/failure, unknown-age feedback, absent identity while checking, malformed/no cache and generation isolation. Component tests exercise cache-ready updates on the actual Home/Events/detail JSX and hook callback/unsubscription behavior. Native slow/offline/error runs remain separate requirements; an exported bundle does not establish runtime or assistive-technology conformance.
## Artwork in event details

Artwork uses a fixed 360-point frame with contain sizing and an independent full-size link. A failed or rejected image displays localized feedback while retaining the published event and its actions. Android uses a polite live region; iOS image-load failures invoke the public accessibility announcement API. A rejected URL has no full-size control. Published `image_alt_en`/`image_alt_pt`, `image_credit`, `image_rights`, and HTTP(S) `image_source` provide accessibility and provenance. Relative artwork paths use `/assets/images/` in the shared repository; unsafe or malformed URLs have no image control. The component tests simulate image failure and inspect framing and EN/PT labels; they do not establish native decoding of portrait, landscape, or oversized files. Permission-cleared source samples and actual Android/iOS artwork rendering remain required.

Home date actions open the full dated catalog for Today, Tomorrow, or the remaining weekend in Atlantic/Azores. Home Find events opens all upcoming dated events and Home Exhibitions opens all upcoming exhibitions. These explicit entries clear Saved, tags, search, locality, Free, and Family filters. Fresh entries return to list offset zero after the new date and filters commit. The entry flag is consumed once; detail Back preserves the current date, filters, and scroll position. Saved links keep their own filter semantics.
