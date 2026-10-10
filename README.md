# BibleVerses

An Android app (Expo / React Native) that shows a Bible verse and a generative painting every day, with the complete King James Bible including the Apocrypha, plus 1 Enoch and Jubilees — offline, with full-text search, saved verses, share-as-image and a morning notification.

**Start here: [GUIDA.md](GUIDA.md)** — step-by-step guide (in Italian) from running the app on your phone to publishing it on Google Play.

```bash
npm install
npx expo start        # open with Expo Go on your phone
npm test              # data, search and reference-parser tests
```

## How it is built

- **Expo SDK 57**, Expo Router, TypeScript.
- **Bible text**: prebuilt SQLite database (`assets/db/bible.db`, FTS5 index) produced by `scripts/build_db.py` from public-domain sources.
- **Paintings**: one SkSL shader (`src/art/painting.ts`) rendered with React Native Skia in the app and with CanvasKit in `scripts/make-assets.ts`, so the icon, store graphics and shared images all come from the same code.
- **User data** (saved verses, settings) lives in `expo-sqlite/kv-store`, separate from the Bible database.

## Texts

King James Version (1769) with the Apocrypha; 1 Enoch (1917) and Jubilees (1902) translated by R. H. Charles. All public domain. Source files: [scrollmapper/bible_databases](https://github.com/scrollmapper/bible_databases) and [scrollmapper/bible_databases_deuterocanonical](https://github.com/scrollmapper/bible_databases_deuterocanonical).
