# BibleVerses

An Android app that shows one Bible verse a day over a painting generated for that day, with the complete
King James Bible including the Apocrypha, plus 1 Enoch and Jubilees. Offline, with full-text search, saved
verses, sharing as an image and a daily reminder.

Proprietary software: see [LICENSE](LICENSE).

## Stack

| Concern       | Choice                                                                          |
| ------------- | ------------------------------------------------------------------------------- |
| Language      | TypeScript (strict) everywhere, including scripts and tests                     |
| App framework | Expo SDK 57 (React Native 0.86), Expo Router                                    |
| Bible text    | Bundled SQLite database with an FTS5 full-text index                            |
| Painting      | One SkSL shader, drawn with React Native Skia                                   |
| Builds        | EAS Build (cloud), development and release variants                             |
| Quality       | ESLint (zero warnings, layer rules), Prettier, Node test runner, GitHub Actions |

## Getting started

```bash
npm ci
npm run check        # typecheck, lint, formatting and tests
npm run build:dev    # once: a development build to install on your phone
npm start            # run the code on that build
```

Building, installing and publishing are described step by step in [docs/publishing.md](docs/publishing.md).

## Scripts

| Script                    | What it does                                               |
| ------------------------- | ---------------------------------------------------------- |
| `npm start`               | Starts the development server for the development build    |
| `npm run build:dev`       | Development build (installs as "BibleVerses Dev")          |
| `npm run build:preview`   | Release-like APK to install directly on a phone            |
| `npm run build:release`   | Android App Bundle for Google Play                         |
| `npm run check`           | Everything CI checks: types, lint, formatting, tests       |
| `npm run doctor`          | Expo's dependency and configuration checks                 |
| `npm run data:fetch`      | Downloads the public-domain source texts                   |
| `npm run data:build`      | Rebuilds the Bible database and the generated book catalog |
| `npm run assets:generate` | Redraws the icons, splash images and store graphics        |

## Project structure

```
src/
  app/             routes (Expo Router), thin
  ui/              screens, components, theme, hooks
  application/     use cases and state
  core/            domain model and rules, ports — plain TypeScript
  infrastructure/  adapters: SQLite, storage, notifications, sharing, device
  composition/     composition root: wires adapters into services
scripts/           database build, asset generation, source download
tests/             unit and integration tests (node:test)
data/              curated verse-of-the-day list
assets/            database, icons, splash images
store/             Play Store listing text, graphics, privacy policy
docs/              architecture, publishing, maintenance
```

## Documentation

- [Architecture](docs/architecture.md): layers, ports and adapters, how to replace a library.
- [Publishing](docs/publishing.md): from the repository to Google Play.
- [Maintenance](docs/maintenance.md): upgrading Expo, updating the Bible data, regenerating graphics.

## Texts

King James Version (1769) with the Apocrypha; 1 Enoch (1917) and Jubilees (1902) translated by R. H. Charles.
All public domain. Sources: [scrollmapper/bible_databases](https://github.com/scrollmapper/bible_databases) and
[scrollmapper/bible_databases_deuterocanonical](https://github.com/scrollmapper/bible_databases_deuterocanonical).
