# HTTPS app links

The app declares the native side of HTTPS app links for the public site.
The hosted association files are live on `eventosterceira.pt`; activating
operating-system delivery still requires the native declarations below in a
new release build and, on iOS, the Associated Domains capability enabled on
the App ID (pending in the Apple Developer portal at the time of writing).

`App.js` registers the prefixes `https://eventosterceira.pt` and
`https://www.eventosterceira.pt` alongside the `terceiraevents://` custom
scheme, and `src/navigation/linking.js` routes `/events/?id=<id>`,
`/weekly/`, `/special/` and their `/pt/` variants to the matching screens.
`src/utils/eventLinks.js` accepts only those origins; unrelated hosts return
no event ID. Website paths with no app destination — including `/saved/` and
`/pt/saved/`, which are browser redirects to Events — stay in the browser.

## Declared native configuration

`app.json` carries the operating-system declarations:

- `ios.associatedDomains` lists `applinks:eventosterceira.pt` only. No Apple
  Team ID appears here; the team identity belongs to the hosted association
  file.
- `android.intentFilters` declares one `VIEW` filter with `autoVerify: true`
  and `BROWSABLE`/`DEFAULT` categories whose `https` data entries use exact
  `path` values — both the trailing-slash and bare spellings — for the linked
  routes on the canonical host, so unrelated paths like `/events-other/`
  never match.

Only the canonical `eventosterceira.pt` host is registered natively. The
`www` host serves no association files — both `/.well-known/` endpoints there
301-redirect to the apex — and Android app-link verification requires a
matching `assetlinks.json` for every declared host on Android 11 (API 30) and
lower, so declaring `www` would make verification fail. Shared URLs already
use the canonical host (`eventUrl` in `src/utils/eventIdentity.js`), and
`www` URLs keep working as a normal website alias: they redirect to the apex
and the JavaScript linking prefixes and parser still accept them, so a pasted
`www` link inside the app resolves the same routes.

The `terceiraevents://` scheme stays registered; opening it resolves the same
routes including the Saved events filter.

## Hosted association files

Both files are served from `eventosterceira.pt` (see the website repository
`EventosTerceira.pt`, directory `.well-known/`):

- `/.well-known/apple-app-site-association` — an AASA document with
  `applinks.details` containing one entry: `appID` equal to
  `9R3942X8JM.com.terceiraevents.app` (Team ID prefix + bundle ID) and the
  `paths` array listing the twelve linked routes (the three routes and their
  `/pt/` variants, each in bare and trailing-slash spelling). Verified live:
  direct HTTP 200 on the apex, and Apple's CDN copy at
  `https://app-site-association.cdn-apple.com/a/v1/eventosterceira.pt`
  returns HTTP 200 `application/json` with the same appID and paths.
- `/.well-known/assetlinks.json` — a Digital Asset Links array with one
  statement: `namespace: "android_app"`,
  `package_name: "com.terceiraevents.app"`, relation
  `delegate_permission/common.handle_all_urls`, and
  `sha256_cert_fingerprints` holding the production Play app-signing
  certificate fingerprint
  `FD:23:49:C0:4B:57:A5:D2:AF:BE:62:93:D7:92:72:14:29:C4:72:93:60:D5:1E:E5:14:74:D2:66:FF:6A:C4:3A`
  (Play Console → Release → Setup → App signing; the app-signing certificate,
  not the upload certificate). Verified live: direct HTTP 200 with
  content-type `application/json`, and Google's public statement service
  returns the same statement.

## Verification that requires devices

`expo export` validates the JavaScript bundle only. Association behavior
requires a new native build containing these declarations and a physical or
emulator check per platform; none of the below has passed yet for this
configuration:

- iOS: enable Associated Domains on the App ID in the Apple Developer portal
  and regenerate the signing profile, install a release/profile-signed build,
  open `https://eventosterceira.pt/events/?id=<id>` from Notes/Safari and
  confirm the app opens the event.
- Android: install a release-signed build, check
  `adb shell pm get-app-links com.terceiraevents.app` shows
  `eventosterceira.pt` as a verified domain, then open the same URL.
  Task/debug-signed installs can exercise intent delivery but are not proof
  of the production signature association.
