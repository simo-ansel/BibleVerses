# Building and publishing on Google Play

Step by step, from the repository to the Play Store. Run every command from the project folder, **without
`sudo`**.

## 1. Tools (once)

- **Node.js 22** (the version in `.nvmrc`) and **Git**.
- **EAS CLI**, the command-line tool for Expo's cloud builds: `npm install -g eas-cli`.
  If npm refuses with a permission error on Linux, either set an npm prefix in your home folder
  (`npm config set prefix ~/.npm-global` and add `~/.npm-global/bin` to `PATH`) or use `npx eas-cli@latest`
  wherever this guide says `eas`.
- A free account on [expo.dev](https://expo.dev) and an Android phone.

Then install the project's dependencies:

```bash
npm ci
```

## 2. Link the project to your Expo account (once)

```bash
eas login
eas init
```

`eas init` writes the project id into `app.json`. If the project already exists on your account, it links to it,
so the signing key Expo stores for you is reused.

The Android package name is `com.simoneanse.bibleverses` (in `app.json`). **It cannot change after the first
upload to Google Play**; change it now if you want a different one.

## 3. Install the app on your phone (no Play Store needed)

```bash
npm run build:preview
```

The first build asks to generate an Android keystore: answer **Yes** (Expo keeps it safe on its servers). After
about 15–30 minutes the build page shows a QR code: open it on the phone, download the APK and install it
(Android asks once to allow installs from that source).

This is the real app, identical to the Play Store version.

## 4. Day-to-day development (optional)

A development build lets you change the code and see the result on the phone immediately.

```bash
npm run build:dev   # once, and again only after adding a native library
npm start           # then open "BibleVerses Dev" on the phone
```

The development build is named "BibleVerses Dev" and installs next to the normal app. Phone and computer must
be on the same network (`npm start -- --tunnel` otherwise).

## 5. Google Play Console account (once)

1. Sign up at [play.google.com/console](https://play.google.com/console/signup) with a **personal** account.
2. Pay the one-time US$25 fee and complete identity verification (government ID and a card in your name).
3. Personal accounts must also prove they own an Android phone, through the Google Play Console app.

## 6. Privacy policy (once)

Google requires a public privacy policy even though the app collects nothing.

1. In `store/privacy-policy.html`, replace `YOUR-EMAIL-HERE` (twice) with your contact email.
2. Publish it, for example with Google Sites (new site → paste the text → Publish) or GitHub Pages.
3. Keep the address for the next step.

## 7. Create the app and its store listing

In Play Console choose **Create app**: name `BibleVerses`, default language English (United States), app, free.
Then complete **Set up your app** on the dashboard; every answer is in `store/listing.md`:

- privacy policy address, app access (everything is available without an account), no ads;
- content rating (Reference category, "No" to every question → Everyone / PEGI 3);
- target audience 13+; data safety: the app collects and shares no data; category Books & Reference;
- store listing: name, short and full description, `store/play-icon-512.png`,
  `store/feature-graphic-1024x500.png`, and at least 2 phone screenshots taken from the APK of step 3.

## 8. Build for the Play Store

```bash
npm run build:release
```

This produces an Android App Bundle (`.aab`); download it from the build page. EAS raises the internal version
code automatically on every release build.

## 9. Internal testing (just you)

Internal testing has no tester requirements and is the quickest way to install the store version.

1. **Testing → Internal testing → Testers**: create a list with your Google account.
2. **Create new release**, upload the `.aab`, save, review and roll out.
3. Open the opt-in link on your phone with the same Google account and install the app from the Play Store.

## 10. Closed testing (required before going public)

New personal accounts must run a **closed test with at least 12 testers opted in for 14 consecutive days**
before they can publish to everyone. A tester who leaves and rejoins restarts their count.

1. **Testing → Closed testing**: create a track, add a list with the testers' Gmail addresses.
2. Create a release with the `.aab` and send it for review.
3. Share the opt-in link; each tester accepts and installs the app from the Play Store, and keeps it installed.
4. After 14 days: **Dashboard → Apply for production** and answer the questions about the test. Google's review
   usually takes up to 7 days.

## 11. Production

**Production → Create new release**, promote the closed-test release (or upload a new `.aab`), choose the
countries and roll out.

## 12. Updates

1. Make the change and run `npm run check`.
2. Raise `version` in `app.json` (for example `1.0.0` → `1.0.1`).
3. Commit, then `npm run build:release` and upload the new `.aab` to the track you want.

To upload from the terminal instead of the browser, create a Google service account key
([guide](https://expo.fyi/creating-google-service-account)), add it with `eas credentials`, and run
`eas submit --platform android`. Never commit the key file (it is in `.gitignore`).

## Troubleshooting

- **"Run this command inside a project directory"**: you are not in the project folder, or `package.json` is
  missing (extract the project with its hidden files: `.git`, `.gitignore`).
- **The build fails on EAS**: open the build page; the red section of the log names the problem. Running
  `npx expo install --fix` and building again solves most dependency mismatches.
- **"Package name already exists" in Play Console**: another app uses it; change `android.package` in
  `app.json` and build again.
- **The reminder arrives a few minutes late**: Android may delay inexact alarms to save battery.
