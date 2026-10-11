# Architecture

BibleVerses is an Android app built with Expo (React Native) and TypeScript. The code is organised in layers
with one rule: **dependencies point inwards**. The core knows nothing about React, Expo or SQLite, so any of those
can change, be upgraded or be replaced without touching the logic of the app.

```
┌───────────────────────────────────────────────────────────────┐
│ src/app            Routes (Expo Router). Thin: read params,   │
│                    render a screen.                           │
├───────────────────────────────────────────────────────────────┤
│ src/ui             Screens, components, theme, hooks.         │
│                    Uses services through useServices().       │
├───────────────────────────────────────────────────────────────┤
│ src/application    Use cases and state: daily verse, saved    │
│                    verses, reading progress, settings and     │
│                    reminder, verse actions.                   │
├───────────────────────────────────────────────────────────────┤
│ src/core           Domain model and rules, plain TypeScript:  │
│                    books, references, calendar, paintings,    │
│                    settings, and the ports (interfaces).      │
└───────────────────────────────────────────────────────────────┘
      ▲ implemented by
┌───────────────────────────────────────────────────────────────┐
│ src/infrastructure Adapters for the ports: SQLite, key-value  │
│                    storage, notifications, image sharing,     │
│                    clipboard, haptics.                        │
└───────────────────────────────────────────────────────────────┘
src/composition      The composition root: picks the adapters and builds the services.
```

## Layers

| Layer                | May import                                  | Must not import                                                                   |
| -------------------- | ------------------------------------------- | --------------------------------------------------------------------------------- |
| `src/core`           | other `src/core` modules                    | React, React Native, Expo or any library; any other layer                         |
| `src/application`    | `src/core`                                  | libraries, `src/infrastructure`, `src/ui`                                         |
| `src/infrastructure` | `src/core`, the library it adapts           | `src/application`, `src/ui`                                                       |
| `src/ui`, `src/app`  | `src/core`, `src/application`, UI libraries | `src/infrastructure`, storage/device libraries (expo-sqlite, expo-notifications…) |
| `src/composition`    | everything                                  | —                                                                                 |

These rules are enforced by ESLint (`no-restricted-imports` in `eslint.config.js`), so a wrong import fails
`npm run lint` and CI.

## Ports and adapters

The ports in `src/core/ports.ts` describe what the app needs from the outside world without naming a library:

| Port                | Adapter (today)                                         | File                                                        |
| ------------------- | ------------------------------------------------------- | ----------------------------------------------------------- |
| `BibleRepository`   | SQLite with FTS5 full-text search                       | `src/infrastructure/sqlite/SqlBibleRepository.ts`           |
| `KeyValueStore`     | `expo-sqlite/kv-store`                                  | `src/infrastructure/storage/kvKeyValueStore.ts`             |
| `ReminderScheduler` | `expo-notifications` (daily local notification)         | `src/infrastructure/notifications/expoReminderScheduler.ts` |
| `VerseCardSharer`   | React Native Skia + `expo-file-system` + `expo-sharing` | `src/infrastructure/sharing/skiaVerseCardSharer.ts`         |
| `Clipboard`         | `expo-clipboard`                                        | `src/infrastructure/device/expoDevice.ts`                   |
| `Feedback`          | `expo-haptics`                                          | `src/infrastructure/device/expoDevice.ts`                   |

`SqlBibleRepository` depends on a two-method `SqlExecutor` interface rather than on expo-sqlite, so the same class
runs on the phone (through `createSqlExecutor` in `expoSqlite.ts`) and in Node tests (through `node:sqlite`).

`src/composition/ServicesProvider.tsx` is the only place where concrete adapters are chosen.

### Replacing a library

1. Write a new adapter that implements the port, next to the old one in `src/infrastructure`.
2. Create it in `src/composition/ServicesProvider.tsx` instead of the old one.
3. Delete the old adapter and its dependency.

Nothing in `src/core`, `src/application` or `src/ui` changes. Examples:

- **Another database** (for example, a different SQLite library): implement `SqlExecutor`, or `BibleRepository`
  directly for a non-SQL store.
- **Another notification library**: implement `ReminderScheduler`.
- **Another drawing library**: implement `VerseCardSharer`, and replace `src/ui/components/PaintingCanvas.tsx`.
  The painting itself is an SkSL shader string in `src/core/art/painting.ts`; Skia is the only renderer that
  runs it today (in the app through React Native Skia, in `scripts/generate-assets.ts` through CanvasKit).

## Data

- `assets/db/bible.db` is a read-only SQLite database built by `scripts/build-bible-db.ts` from public-domain
  sources (see `docs/maintenance.md`). Tables: `books`, `verses`, `verses_fts` (FTS5 index over `verses.text`),
  `daily` (the curated verse-of-the-day list, already shuffled).
- `src/core/bible/catalog.generated.ts` is generated by the same script: the book list, chapter numbers and
  lookup aliases the app needs synchronously at startup, plus `DATA_VERSION` and `DAILY_POOL_SIZE`.
- On first launch the database is copied to the app's storage as `bible-v<DATA_VERSION>.db`. Raising
  `DATA_VERSION` makes updated apps copy the new file and delete the old one.
- The user's own data (saved verses, settings, last chapter read) is in a separate key-value store, so updating
  the Bible text never touches it.

## Daily verse and painting

`dayNumber(date)` counts local calendar days, so everyone sees the same verse and painting on the same date and
the day changes at local midnight. The verse is `daily[dayNumber % DAILY_POOL_SIZE]`. The painting recipe
(palette, seed, warp, scale, angle) comes from a seeded PRNG; palettes are walked in shuffled cycles so two
consecutive days never share one.

## Builds

- `app.json` is the static config (`eas init` writes the project id into it). `app.config.ts` adds build
  variants: with `APP_VARIANT=development` (set by the `development` profile in `eas.json`) the app is named
  "BibleVerses Dev" and uses the package `com.simoneanse.bibleverses.dev`, so it installs next to the release app.
- `expo-dev-client` is only active in development builds; release builds compile it out.
- Native projects (`android/`) are generated at build time (Continuous Native Generation) and are not committed.
  Native settings live in `app.json` and config plugins.

## Conventions

- TypeScript `strict`, plus `noUnusedLocals`, `noUnusedParameters`, `noImplicitOverride`.
- Only type-level TypeScript features (no enums, namespaces or parameter properties), so the code stays plain
  JavaScript once types are removed.
- ESLint with zero warnings allowed; Prettier for formatting; `npm run check` runs everything CI runs.
- One language across the repository: TypeScript, including build scripts and tests.
