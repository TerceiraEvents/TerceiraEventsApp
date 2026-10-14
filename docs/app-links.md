# HTTPS app links

The app declares the native side of HTTPS app links for the public site.
Operating-system delivery is not active yet: it requires the hosted domain
association files described below and a new native build.

`App.js` registers the prefixes `https://eventosterceira.pt` and
`https://www.eventosterceira.pt` alongside the `terceiraevents://` custom
scheme, and `src/navigation/linking.js` routes `/events/?id=<id>`,
`/weekly/`, `/special/` and their `/pt/` variants to the matching screens.
`src/utils/eventLinks.js` accepts only those origins; unrelated hosts return
no event ID. Website paths with no app destination — including `/saved/` and
`/pt/saved/`, which are browser redirects to Events — stay in the browser.

## Declared native configuration

`app.json` carries the operating-system declarations:

- `ios.associatedDomains` lists `applinks:eventosterceira.pt` and
  `applinks:www.eventosterceira.pt`. No Apple Team ID appears here; the team
  identity belongs to the hosted association file.
- `android.intentFilters` declares one `VIEW` filter with `autoVerify: true`
  and `BROWSABLE`/`DEFAULT` categories whose `https` data entries use exact
  `path` values — both the trailing-slash and bare spellings — for the linked
  routes on both hosts, so unrelated paths like `/events-other/` never match.

The `terceiraevents://` scheme stays registered; opening it resolves the same
routes including the Saved events filter.

## Remaining real inputs

Production association requires two files hosted on `eventosterceira.pt`,
each gated on a real release identity that must not be fabricated:

- `/.well-known/apple-app-site-association` — an AASA document whose
  `applinks.details[].appIDs` entries are `<APPLE_TEAM_ID>.com.terceiraevents.app`,
  with `components`/`paths` covering the linked routes above. Requires the real
  Apple Team ID. Served over HTTPS without a `.json` extension.
- `/.well-known/assetlinks.json` — a Digital Asset Links array with
  `namespace: "android_app"`, `package_name: "com.terceiraevents.app"`, and
  `sha256_cert_fingerprints` holding the release signing certificate
  fingerprint, obtained from `eas credentials -p android` or Play Console →
  Release → Setup → App Signing. Served over HTTPS with content-type
  `application/json`.

Until those files are hosted with the real identities, Android `autoVerify`
verification cannot succeed and HTTPS links fall back to the browser; iOS
universal links do not activate until the AASA is fetched at install/update.

## Verification that requires devices

`expo export` validates the JavaScript bundle only. Association behavior
requires a new native build containing these declarations and a physical or
emulator check per platform:

- iOS: install the build, host the AASA, open `https://eventosterceira.pt/events/?id=<id>` from Notes/Safari and confirm the app opens the event.
- Android: install the build, host `assetlinks.json`, check `adb shell pm get-app-links com.terceiraevents.app` shows a verified domain, then open the same URL.
