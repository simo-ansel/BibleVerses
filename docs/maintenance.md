# Maintenance

## Everyday checks

```bash
npm run check    # typecheck, lint (zero warnings), formatting, tests — the same as CI
npm run doctor   # Expo's project checks (needs internet)
```

CI (`.github/workflows/ci.yml`) runs both on every push to `main` and on pull requests, and bundles the Android
app as a smoke test.

## Upgrading Expo and React Native

Expo releases a new SDK about three times a year, each pinned to a React Native version.

1. Read the SDK release notes and the "Upgrading" section on [expo.dev/changelog](https://expo.dev/changelog).
2. Upgrade Expo and align every Expo-managed dependency:

   ```bash
   npx expo install expo@latest --fix
   ```

3. `npm run check` and `npm run doctor`. Fix what breaks:
   - a renamed or changed library API only affects that library's adapter in `src/infrastructure`
     (or `PaintingCanvas.tsx` / `TabBar.tsx` for UI libraries);
   - TypeScript points at every call site that needs attention.
4. `npm run build:preview`, install on the phone and try every screen: Today, share, reading, search, saved,
   reminder.
5. Commit and push.

Patch updates within the current SDK: `npx expo install --check`.

Always add or update native libraries with `npx expo install <package>`, which picks the version that matches
the SDK. After adding a native library, build a new development build (`npm run build:dev`).

## Node.js

The required version is in `.nvmrc` (and `engines` in `package.json`). When moving to a new Node LTS, update
both, run `npm run check`, and CI picks it up from `.nvmrc`.

## Bible text and verse of the day

The verse-of-the-day list is `data/daily-verses.txt`: one reference per line (`Psalms 23:1`, `Matthew 5:3-9`),
book names as shown in the app. The build checks that every reference exists and appears once.

```bash
npm run data:fetch   # once: downloads the public-domain sources into sources/ (not committed)
npm run data:build   # rebuilds assets/db/bible.db and src/core/bible/catalog.generated.ts
npm test
```

When the database content changes, raise `DATA_VERSION` in `scripts/build-bible-db.ts` before building, so
installed apps replace their copy. Text clean-up rules are in `scripts/lib/textCleaning.ts`; book names and
search aliases in `scripts/lib/bookSources.ts`.

## Icons and store graphics

```bash
npm run assets:generate                  # all images (a few minutes)
npm run assets:generate -- icon feature  # only some
SCALE=0.25 npm run assets:generate       # quick preview
```

They are drawn by `scripts/generate-assets.ts` with the same shader as the app. The palettes are in
`src/core/art/palettes.ts`.

## Versions

- `version` in `app.json` is the version users see (semantic versioning: `1.0.1` for fixes, `1.1.0` for
  features).
- The Android version code is managed by EAS (`appVersionSource: remote`) and raised on every release build.
