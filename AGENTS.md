# Notes for coding agents

BibleVerses is an Expo (React Native) app for Android, written in TypeScript. Read `docs/architecture.md`
before changing code.

## Rules

- Keep the layers: `src/core` is plain TypeScript; `src/application` uses only `src/core`; libraries are wrapped
  in adapters in `src/infrastructure`; screens get services from `useServices()`; adapters are chosen only in
  `src/composition`. ESLint enforces this.
- Everything in English: code, comments, docs, commit messages.
- Only type-level TypeScript features (no enums, namespaces or parameter properties).
- `npm run check` must pass with zero warnings before a task is done.
- UI copy is short and plain; no explanatory notes in the interface.
- Never edit `src/core/bible/catalog.generated.ts` or `assets/db/bible.db` by hand: run `npm run data:build`.

## Expo changes often

Before writing code that touches an Expo, EAS or React Native API, check the docs for the SDK in
`package.json` (`https://docs.expo.dev/versions/v<major>.0.0/`, index at `https://docs.expo.dev/llms.txt`).

## Commands

```bash
npx expo install <package>   # add libraries (picks SDK-compatible versions)
npm run check                # typecheck, lint, format check, tests
npm run doctor               # expo-doctor
npm start                    # dev server for the development build
```

Native folders (`android/`) are generated at build time; configure native behaviour in `app.json`,
`app.config.ts` and config plugins, never by editing generated files.
