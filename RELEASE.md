# Releasing

The app deploys to the Google Play production track and the iOS App Store automatically when you publish a GitHub release. The release tag drives the version; EAS handles the rest.

## Per-release flow

1. **Bump version.** Open a PR that updates:
   - `expo.version` in `app.json` — new SemVer (e.g. `1.3.0`)
   - `version` in `package.json` and the two `version` fields at the top of `package-lock.json`

   Do *not* bump `expo.android.versionCode` or `expo.ios.buildNumber` — EAS auto-increments both on every production build (`cli.appVersionSource = "remote"` in `eas.json`).

2. **Merge to `main`.**

3. **Publish a GitHub release** at <https://github.com/TerceiraEvents/TerceiraEventsApp/releases/new>:
   - **Tag**: `v1.3.0` (must match `expo.version` exactly, with `v` prefix)
   - **Title**: `v1.3.0`
   - **Description**: changelog ("Generate release notes" works fine)
   - Click **Publish release**

4. **Watch the build.** `.github/workflows/release.yml` fires on `release: published` and runs two parallel matrix jobs (Android + iOS) with `fail-fast: false`:
   - Verifies the tag matches `expo.version` (fails fast if mismatched)
   - For each platform, runs `eas build --platform <platform> --profile production --auto-submit --non-interactive --no-wait`
   - EAS builds the artifact (~5–7 min Android AAB, ~15–25 min iOS IPA) and then auto-submits to the corresponding store when the build finishes

   Live progress: <https://expo.dev/accounts/chrisrackauckas/projects/TerceiraEventsApp/builds>

5. **Store review.**
   - **Google Play** typically takes a few hours to a day. The new version appears on the production track when Google's review completes.
   - **App Store** typically takes 24–48 hours for review. The build first lands in TestFlight automatically; it then enters App Review when promoted to the production track (auto-submit configures this — see iOS setup below).

If an auto-submit step fails (e.g. credentials drift), the build artifact is still downloadable from the EAS dashboard and you can upload it manually to Play Console / App Store Connect.

## One-time setup

These steps must be done once before the first auto-deploy works for each platform. Skip whichever sections are already configured.

### Android: Google Play service account

EAS needs a Play Console service account to upload AABs without a human in the loop.

1. In **Google Play Console → Setup → API access**, create a new service account (link to a Google Cloud project if prompted).
2. Grant the account the **Release manager** role, scoped to this app.
3. Download the JSON key file. Treat it like a password.
4. From your laptop in this repo (logged into Expo via `eas login`):
   ```sh
   eas credentials configure --platform android
   ```
   Choose **Google Service Account Key for Play Store submissions** → **Upload a Google Service Account Key** → point to the JSON file you downloaded. EAS stores the credential server-side, scoped to the project.

   `eas.json`'s submit profile intentionally does **not** set `serviceAccountKeyPath` — that field would force eas-cli to look for a local file at submit-time, which fails in CI runners. With the field omitted, eas-cli falls back to the EAS cloud-stored credential you just uploaded. This is the canonical CI path.

### Android: seed the remote `versionCode` counter

Tell EAS what the current `versionCode` is so the auto-increment starts from the right number:

```sh
eas build:version:sync --platform android
```

This pulls `expo.android.versionCode` from `app.json` (currently `4`) into EAS's remote counter. From this point on, every `eas build --profile production` consumes and increments the remote counter; `app.json`'s value becomes a no-op.

### iOS: Apple Developer Program enrollment

You need an active **Apple Developer Program** membership (\$99/year) on the Apple ID that will own the app. Enroll at <https://developer.apple.com/programs/enroll/>. The Apple ID used here will become "Account Holder" of the App Store Connect team.

### iOS: register the app in App Store Connect

EAS can build an IPA without an App Store Connect record, but auto-submit needs the app to exist in ASC.

1. Go to **App Store Connect → My Apps → +** → **New App**.
2. Fill in:
   - **Platform**: iOS
   - **Name**: `Terceira Events` (must be unique across the App Store; if taken, use `Eventos da Terceira` to match the localized launcher label)
   - **Primary Language**: Portuguese (Portugal)
   - **Bundle ID**: select `com.terceiraevents.app` (you may need to register it first under <https://developer.apple.com/account/resources/identifiers/list>)
   - **SKU**: any internal identifier, e.g. `terceira-events-app`
3. After creation, note the **Apple ID** (a 10-digit number, shown under **App Information**). This is the `ascAppId` value EAS submit uses.

### iOS: App Store Connect API key (for auto-submit)

EAS needs an ASC API key to upload IPAs without human interaction.

1. In **App Store Connect → Users and Access → Integrations → App Store Connect API**, click **+** to generate a key.
2. **Name**: `EAS Submit`. **Access**: `App Manager` (or higher).
3. Download the `.p8` private key file. Note the **Key ID** and **Issuer ID** shown on the page. **The .p8 can only be downloaded once.**
4. From your laptop in this repo (logged into Expo via `eas login`):
   ```sh
   eas credentials configure --platform ios
   ```
   Choose **App Store Connect: Manage your API Key** → **Set up an API Key for the project** → upload the `.p8` and supply the Key ID + Issuer ID. EAS stores the credential server-side.

   As with Android, `eas.json`'s `submit.production.ios` is intentionally empty so eas-cli falls back to the EAS cloud-stored API key at submit-time. This is the canonical CI path.

### iOS: distribution certificate and provisioning profile

EAS will generate and manage these for you on the first production build, as long as you give it App Store Connect access. The cleanest path:

```sh
eas credentials configure --platform ios
```

Pick **Build credentials** → **Set up Distribution Certificate and Provisioning Profile**. Authenticate with the Apple ID that has Developer Program access; EAS will create and store the cert + profile in EAS cloud creds.

Alternatively, on the very first `eas build --platform ios --profile production` invocation, EAS will prompt for Apple credentials and generate them automatically. In CI (non-interactive) this prompt fails, so do this step from a developer laptop first.

### iOS: seed the remote `buildNumber` counter

Mirrors the Android step:

```sh
eas build:version:sync --platform ios
```

This pulls `expo.ios.buildNumber` from `app.json` (currently `"1"`) into EAS's remote counter. From this point on, every `eas build --profile production` consumes and increments the remote counter.

### Verify `EXPO_TOKEN` secret

The release workflow needs an `EXPO_TOKEN` secret on the GitHub repo (the existing `eas-build.yml` workflow already uses this). Confirm it's set under **Settings → Secrets and variables → Actions**. If missing, generate one at <https://expo.dev/accounts/chrisrackauckas/settings/access-tokens> and add it as `EXPO_TOKEN`.

## Internal testing

### Android internal track / APKs

The `preview` profile in `eas.json` builds an `apk` (`distribution: internal`). Trigger via the manual workflow:

**Actions → EAS Build → Run workflow → Platform: android, Profile: preview**.

Install on a device by scanning the QR code from the EAS build page.

### iOS TestFlight

Preview iOS builds for testers go through TestFlight. Two paths:

- **Manual one-off**: trigger **Actions → EAS Build → Run workflow → Platform: ios, Profile: preview**. The resulting build can be promoted to TestFlight from the EAS dashboard or via `eas submit --platform ios --latest`.
- **Per-release**: every production-profile build runs through `--auto-submit`, which uploads to App Store Connect. Apple automatically routes new builds through TestFlight (internal testing) before they can be promoted to the App Store. Internal testers (added under **App Store Connect → TestFlight → Internal Testing**) get the build minutes after upload. External testers require Beta App Review (24h-ish).

## Files involved

| File | Purpose |
|------|---------|
| `.github/workflows/release.yml` | Triggers on GitHub release publish; runs Android + iOS production builds in a matrix and calls `eas build --auto-submit` for each |
| `.github/workflows/eas-build.yml` | Manual workflow_dispatch for ad-hoc builds (any platform / any profile) |
| `eas.json` | EAS build/submit profiles + `cli.appVersionSource = "remote"` for auto-incrementing `versionCode` and `buildNumber` |
| `app.json` | `expo.version` is the source of truth for the version name; tag must match. `expo.ios.buildNumber` and `expo.android.versionCode` are seeded values for the EAS remote counter |
| `.eas/workflows/production-release.yml` | Legacy EAS-side workflow on `v*` tags. Currently inert unless Expo's GitHub-integration is wired up; the GitHub Actions workflow above is the active path. |

## Troubleshooting

### Common (both platforms)

- **"Release tag 'v1.3.0' does not match expo.version 'v1.2.0'"** — the version-bump PR didn't merge before you published the release. Either re-tag the existing commit at `v<actual app.json version>`, or merge the bump and re-create the release at the same tag.

### Android

- **"File ./google-play-service-account.json doesn't exist"** — `eas.json`'s submit profile is pointing at a local file path. Remove `serviceAccountKeyPath` from the submit profile and run `eas credentials configure --platform android` to upload the JSON to EAS cloud creds instead.
- **`eas submit` fails with `401`/`403`** — the Play service-account JSON is wrong or its Play Console role doesn't include "Release apps to production". Re-run `eas credentials configure --platform android`.
- **Build succeeds but submit fails with "versionCode … already used"** — remote counter is out of sync with what's actually on Play. Re-run `eas build:version:set --platform android --build-version <next-free-int>`.

### iOS

- **`eas build` fails with "No bundle identifier found"** — EAS could not register `com.terceiraevents.app` against the Apple Developer account. Run `eas credentials configure --platform ios` from a laptop, log in with the Apple ID, and let EAS create the App ID.
- **`eas submit` fails with "App not found in App Store Connect"** — the ASC app record isn't created yet. Follow the *register the app in App Store Connect* step above.
- **`eas submit` fails with `401`/`403`** — ASC API key is wrong, expired, revoked, or its role is below `App Manager`. Re-run `eas credentials configure --platform ios` and re-upload the `.p8`.
- **Build succeeds but submit fails with "buildNumber … already used"** — remote counter is out of sync with what's already on App Store Connect. Re-run `eas build:version:set --platform ios --build-version <next-free-int>`.
- **Submit succeeds but TestFlight shows "Missing Compliance"** — Apple needs an export-compliance answer per build. Either set it once in App Store Connect under the build, or add `ITSAppUsesNonExemptEncryption: false` to `app.json`'s `expo.ios.infoPlist` if the app does not use custom crypto.
