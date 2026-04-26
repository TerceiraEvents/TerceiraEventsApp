# Releasing

The app deploys to the Google Play production track automatically when you publish a GitHub release. The release tag drives the version; EAS handles the rest.

## Per-release flow

1. **Bump version.** Open a PR that updates:
   - `expo.version` in `app.json` — new SemVer (e.g. `1.3.0`)
   - `version` in `package.json` and the two `version` fields at the top of `package-lock.json`

   Do *not* bump `expo.android.versionCode` — EAS auto-increments it on every production build (`cli.appVersionSource = "remote"` in `eas.json`).

2. **Merge to `main`.**

3. **Publish a GitHub release** at <https://github.com/TerceiraEvents/TerceiraEventsApp/releases/new>:
   - **Tag**: `v1.3.0` (must match `expo.version` exactly, with `v` prefix)
   - **Title**: `v1.3.0`
   - **Description**: changelog ("Generate release notes" works fine)
   - Click **Publish release**

4. **Watch the build.** `.github/workflows/release.yml` fires on `release: published`:
   - Verifies the tag matches `expo.version` (fails fast if mismatched)
   - Runs `eas build --platform android --profile production --auto-submit --non-interactive --no-wait`
   - EAS builds the AAB on its infrastructure (~5–7 min) and then auto-submits to the Play Console production track when the build finishes

   Live progress: <https://expo.dev/accounts/chrisrackauckas/projects/TerceiraEventsApp/builds>

5. **Play review** typically takes a few hours to a day. The new version appears on the production track when Google's review completes.

If the auto-submit step fails (e.g. credentials drift), the build artifact is still downloadable from the EAS dashboard and you can upload it manually to Play Console.

## One-time setup

These steps must be done once before the first auto-deploy works. Skip if already configured.

### 1. Google Play service account

EAS needs a Play Console service account to upload AABs without a human in the loop.

1. In **Google Play Console → Setup → API access**, create a new service account (link to a Google Cloud project if prompted).
2. Grant the account the **Release manager** role, scoped to this app.
3. Download the JSON key file. Treat it like a password.
4. From your laptop in this repo:
   ```sh
   eas credentials configure --platform android
   ```
   Choose "Google Service Account Key for Play Store submissions" and upload the JSON. EAS stores it on the project and references it from `eas.json`'s `submit.production.android.serviceAccountKeyPath`.

   *(Alternative: place the JSON at `./google-play-service-account.json` in the repo root and add it to `.gitignore`. EAS will pick it up by path. The credentials-configure path is preferred since it survives across machines.)*

### 2. Seed the remote `versionCode` counter

Tell EAS what the current `versionCode` is so the auto-increment starts from the right number:

```sh
eas build:version:sync --platform android
```

This pulls `expo.android.versionCode` from `app.json` (currently `4`) into EAS's remote counter. From this point on, every `eas build --profile production` consumes and increments the remote counter; `app.json`'s value becomes a no-op.

After seeding, you can drop `expo.android.versionCode` from `app.json` entirely if you want — EAS no longer reads it.

### 3. Verify `EXPO_TOKEN` secret

The release workflow needs an `EXPO_TOKEN` secret on the GitHub repo (the existing `eas-build.yml` workflow already uses this). Confirm it's set under **Settings → Secrets and variables → Actions**. If missing, generate one at <https://expo.dev/accounts/chrisrackauckas/settings/access-tokens> and add it as `EXPO_TOKEN`.

## Files involved

| File | Purpose |
|------|---------|
| `.github/workflows/release.yml` | Triggers on GitHub release publish; calls `eas build --auto-submit` |
| `eas.json` | EAS build/submit profiles + `cli.appVersionSource = "remote"` for auto-versionCode |
| `app.json` | `expo.version` is the source of truth for the version name; tag must match |
| `.eas/workflows/production-release.yml` | Legacy EAS-side workflow on `v*` tags. Currently inert unless Expo's GitHub-integration is wired up; the GitHub Actions workflow above is the active path. |

## Troubleshooting

- **"Release tag 'v1.3.0' does not match expo.version 'v1.2.0'"** — the version-bump PR didn't merge before you published the release. Either re-tag the existing commit at `v<actual app.json version>`, or merge the bump and re-create the release at the same tag.
- **`eas submit` fails with `401`/`403`** — the Play service-account JSON is wrong or its Play Console role doesn't include "Release apps to production". Re-run `eas credentials configure --platform android`.
- **Build succeeds but submit fails with "versionCode … already used"** — remote counter is out of sync with what's actually on Play. Re-run `eas build:version:set --platform android --build-version <next-free-int>`.
