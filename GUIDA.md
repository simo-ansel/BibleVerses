# BibleVerses — dalla cartella al Play Store

Guida passo passo pensata per chi non ha mai pubblicato un'app. Tempo realistico: un pomeriggio per vederla sul telefono e caricarla su Google Play, poi **almeno 14 giorni** di test chiuso obbligatorio prima che sia pubblica (vedi passo 9).

---

## 0. Cosa c'è nella cartella

```
bibleverses/
├─ src/app/            le schermate (ogni file = una schermata, gestite da Expo Router)
│  ├─ (tabs)/index.tsx    Today: verso del giorno + dipinto
│  ├─ (tabs)/read.tsx     elenco dei libri
│  ├─ (tabs)/search.tsx   ricerca per parole o riferimento (es. "John 3:16")
│  ├─ (tabs)/saved.tsx    versetti salvati
│  ├─ book/[id].tsx       capitoli di un libro
│  ├─ chapter/[book]/[chapter].tsx   lettura di un capitolo
│  ├─ settings.tsx, about.tsx
├─ src/art/            il dipinto generativo (shader Skia), le palette, l'immagine da condividere
├─ src/data/           accesso al database, parser dei riferimenti, preferiti e impostazioni
├─ assets/db/bible.db  la Bibbia completa (SQLite, 82 libri, 39.146 versetti, ricerca full-text)
├─ data/daily-verses.txt   i 369 versetti del giorno (modificabile)
├─ scripts/            build_db.py (crea il database), make-assets.ts (icona e grafiche), fetch-sources.mjs
├─ store/              testi e grafiche per la scheda Play Store, privacy policy
├─ tests/              test automatici (npm test)
├─ app.json            configurazione dell'app (nome, icona, pacchetto Android…)
└─ eas.json            configurazione delle build nel cloud di Expo
```

**Testi inclusi** (tutti di pubblico dominio): King James Version 1769 con gli Apocrifi del 1611 (Antico Testamento, Apocrifi/deuterocanonici, Nuovo Testamento) + 1 Enoch e Giubilei (canone etiope) nella traduzione di R. H. Charles.

---

## 1. Installa gli strumenti (una volta sola)

1. **Node.js** versione LTS (22 o più recente): scaricalo da <https://nodejs.org> e installalo.
2. **Git** (<https://git-scm.com>): la cartella è già un repository git, e le build di Expo lo usano per sapere quali file caricare.
3. Sul telefono Android installa **Expo Go** dal Play Store.
4. Estrai lo zip **da terminale** con `unzip bibleverses.zip`: così vengono estratti anche i file nascosti (`.git`, `.gitignore`), che alcuni gestori di file saltano. Se sposti la cartella, spostala intera, non solo il contenuto.
5. Apri un terminale (su Windows: *PowerShell*) dentro la cartella `bibleverses` ed esegui:

   ```bash
   npm install
   ```

   Scarica le librerie (qualche minuto, serve solo la prima volta).

---

## 2. Guarda l'app sul tuo telefono (Expo Go)

```bash
npx expo start
```

Compare un QR code nel terminale. Apri **Expo Go** sul telefono e inquadralo. Telefono e computer devono essere sulla stessa rete Wi-Fi; se non funziona usa `npx expo start --tunnel`.

Ogni volta che salvi un file, l'app sul telefono si aggiorna da sola. Per fermare il server: `Ctrl + C`.

> **Se Expo Go dice che il progetto usa un SDK non supportato**: Expo Go supporta solo l'SDK più recente. Esegui `npx expo install expo@latest --fix` per aggiornare il progetto, oppure salta al passo 5 e prova l'APK.

Cose da controllare in questa fase:
- **Today**: il dipinto che "si sviluppa", scorri a destra/sinistra per i giorni precedenti, Save / Share / Read.
- **Read**: apri un libro degli Apocrifi o 1 Enoch, tocca un versetto → Save, Share (immagine), Copy.
- **Search**: prova `still small voice`, `wisdom` con il filtro *Apocrypha*, oppure `Sirach 43:11`.
- **Settings** (ingranaggio in alto a destra in Today): notifica del mattino, carattere *Fell* o *Garamond*, dimensione del testo.

---

## 3. Crea l'account Expo e collega il progetto

Le build per il Play Store si fanno nel cloud di Expo (EAS), gratis nel piano base: non ti serve Android Studio.

1. Crea un account gratuito su <https://expo.dev/signup>.
2. Nel terminale, **senza `sudo`** (con `sudo` i comandi girano come utente root e il login finisce nel posto sbagliato):

   ```bash
   npm install -g eas-cli      # su Linux, se dà errore di permessi: npx eas-cli@latest al posto di eas
   eas login
   eas init
   ```

   Se `eas` risponde *"Run this command inside a project directory"*, nella cartella in cui sei manca `package.json`: controlla con `ls -la` di essere nella cartella del progetto e che lo zip sia stato estratto per intero.

   `eas init` collega la cartella al tuo account e aggiunge un `projectId` in `app.json`.

---

## 4. Scegli il nome del pacchetto (prima del primo caricamento!)

In `app.json` c'è `"package": "com.simoneanse.bibleverses"`. È l'identificativo dell'app su Google Play: **dopo il primo caricamento non si può più cambiare**. Se preferisci un altro nome (es. `com.tuonome.bibleverses`), cambialo ora, sia in `android.package` sia in `ios.bundleIdentifier`. Usa solo lettere minuscole, numeri e punti.

---

## 5. Prima build di prova (APK da installare direttamente)

```bash
eas build --platform android --profile preview
```

- La prima volta ti chiede di generare una **keystore** (la "firma" dell'app): rispondi **Yes**, Expo la crea e la custodisce per te.
- Dopo 10–20 minuti ricevi un link: aprilo dal telefono, scarica l'APK e installalo (Android ti chiederà di consentire l'installazione da fonti sconosciute).

Questa è l'app vera, identica a quella del Play Store: qui le notifiche funzionano al 100%, con icona e splash definitivi.

---

## 6. Account Google Play Console

1. Vai su <https://play.google.com/console/signup> e scegli **account personale**.
2. Paghi **25 US$ una tantum**; serve un documento d'identità e una carta intestati a te, e devi avere almeno 18 anni.
3. Completa la verifica dell'identità (può richiedere qualche giorno).
4. Gli account personali devono anche **dimostrare di avere un telefono Android**: installa l'app *Google Play Console* sul telefono e segui la richiesta di verifica.

---

## 7. Pubblica la privacy policy

Google chiede un link a una privacy policy anche se l'app non raccoglie dati. È pronta in `store/privacy-policy.html`:

1. Apri il file e sostituisci `YOUR-EMAIL-HERE` (due volte) con la tua email di contatto.
2. Mettila online. Il modo più semplice: **Google Sites** (<https://sites.google.com>) → nuovo sito → incolla il testo → *Pubblica*. In alternativa GitHub Pages.
3. Tieni da parte l'indirizzo: ti serve al passo 8.

---

## 8. Crea l'app nella Play Console e compila la scheda

1. **Crea app** → nome `BibleVerses`, lingua predefinita **Inglese (Stati Uniti)**, tipo *App*, *Gratuita*.
2. Nella **Dashboard** completa la sezione "Configura la tua app". Tutte le risposte sono in `store/listing.md`:
   - **Privacy policy**: l'indirizzo del passo 7.
   - **Accesso all'app**: tutte le funzioni sono disponibili senza accesso.
   - **Annunci**: no.
   - **Classificazione dei contenuti**: categoria *Riferimento, notizie o istruzione*, rispondi "No" a tutto → PEGI 3.
   - **Pubblico di destinazione**: 13+ (scegliere meno di 13 anni attiva requisiti aggiuntivi).
   - **Sicurezza dei dati**: l'app **non raccoglie né condivide** dati.
   - **Categoria**: *Libri e consultazione*.
3. **Scheda dello Store** (in inglese, copia da `store/listing.md`):
   - nome, descrizione breve, descrizione completa;
   - icona: `store/play-icon-512.png`;
   - grafica in primo piano: `store/feature-graphic-1024x500.png`;
   - **screenshot**: almeno 2 (meglio 4) fatti dal tuo telefono con l'APK del passo 5 — Today, Read, Search, un'immagine condivisa.

---

## 9. Test chiuso obbligatorio (12 tester per 14 giorni)

Per gli account personali nuovi Google richiede un **test chiuso con almeno 12 tester iscritti per 14 giorni consecutivi** prima di poter pubblicare in produzione. Se un tester si disiscrive, il suo conteggio riparte da zero.

1. Crea la build per il Play Store (file `.aab`):

   ```bash
   eas build --platform android --profile production
   ```

   Al termine scarica il file `.aab` dal link.
2. Play Console → **Test → Test chiuso** → crea una traccia (es. "Alpha") → **Tester**: crea un elenco con le email Gmail dei tuoi tester (amici, compagni di università, famiglia: servono telefoni Android).
3. **Crea una nuova release** → carica il file `.aab` → note di rilascio (es. "First test version") → invia per la revisione.
4. Quando è approvata, copia il **link di partecipazione** e mandalo ai tester: ognuno deve aprirlo, accettare e **installare l'app dal Play Store**. Chiedi di tenerla installata e aprirla ogni tanto per tutti i 14 giorni.
5. Dopo 14 giorni con almeno 12 tester iscritti: **Dashboard → Richiedi l'accesso alla produzione**, rispondi alle domande sul test. La revisione di Google di solito richiede fino a 7 giorni.
6. Approvato l'accesso: **Produzione → Crea nuova release** → promuovi la release del test chiuso (o carica un nuovo `.aab`) → scegli i paesi → **Invia**. 🎉

---

## 10. Pubblicare aggiornamenti

1. Modifica il codice e provalo con `npx expo start`, poi salva le modifiche in git: `git add -A` e `git commit -m "descrizione"`.
2. Aumenta `version` in `app.json` (es. `1.0.0` → `1.0.1`). Il numero interno (`versionCode`) lo incrementa EAS da solo.
3. `eas build --platform android --profile production` e carica il nuovo `.aab` nella Play Console.

*Facoltativo*: con una chiave di servizio Google (<https://expo.fyi/creating-google-service-account>) puoi caricare direttamente dal terminale con `eas submit --platform android`.

---

## 11. Modificare i contenuti

- **Versetti del giorno**: modifica `data/daily-verses.txt` (un riferimento per riga, es. `Psalms 23:1` o `Matthew 5:3-9`) e ricostruisci il database (sotto).
- **Ricostruire il database** (serve Python 3 e git):

  ```bash
  node scripts/fetch-sources.mjs   # scarica i testi originali in sources/
  npm run build:db                 # ricrea assets/db/bible.db e src/data/books.generated.ts
  npm test                         # controlla che tutto sia coerente
  ```

  Su Windows, se `python3` non esiste, lancia direttamente `py scripts/build_db.py --kjva sources/KJVA.json --enoch sources/1-enoch.json --jubilees sources/book-of-jubilees.json`.

  Se cambi il contenuto del database, aumenta `DB_VERSION` in `scripts/build_db.py`: così le app già installate sostituiscono la copia vecchia.
- **Icona e grafiche**: `npx tsx scripts/make-assets.ts` le ridisegna con lo stesso shader dell'app.
- **Colori dei dipinti**: `src/art/palettes.ts`.

---

## 12. Comandi utili

| Comando | A cosa serve |
|---|---|
| `npx expo start` | avvia l'app in Expo Go |
| `npm test` | test automatici (parser, database, versetti del giorno) |
| `npm run typecheck` | controllo dei tipi TypeScript |
| `npx expo lint` | controllo dello stile del codice |
| `eas build -p android --profile preview` | APK da installare sul telefono |
| `eas build -p android --profile production` | `.aab` per il Play Store |

## Problemi comuni

- **Il QR non si apre**: stessa rete Wi-Fi? Prova `npx expo start --tunnel`.
- **La notifica non arriva all'ora esatta**: Android può ritardarla di qualche minuto per risparmiare batteria; è normale.
- **"Package name already exists" nella Play Console**: il nome del pacchetto è già usato da qualcun altro → cambialo (passo 4) e rifai la build.
- **Build EAS fallita**: apri il link della build, la sezione rossa nei log indica il problema; spesso basta `npx expo install --fix` e riprovare.
