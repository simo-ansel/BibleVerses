/**
 * Builds the offline Bible database bundled with the app (assets/db/bible.db) and the book
 * catalog the app reads at startup (src/core/bible/catalog.generated.ts).
 *
 * Sources (public domain), downloaded with `npm run data:fetch`:
 *   sources/KJVA.json              King James Version (1769) with the Apocrypha
 *   sources/1-enoch.json           1 Enoch, tr. R. H. Charles (1917)
 *   sources/book-of-jubilees.json  Jubilees, tr. R. H. Charles (1902)
 *
 * Usage: npm run data:build
 * The build is deterministic: the same inputs always produce the same database.
 */
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';

import { rng } from '../src/core/art/painting';
import { BOOK_SOURCES } from './lib/bookSources';
import { cleanEnoch, cleanJubilees, cleanKjv, type Cleaner } from './lib/textCleaning';

/** Bump whenever the database content changes, so installed apps replace their copy. */
const DATA_VERSION = 2;
/** Fixed seed for the verse-of-the-day order: every phone shows the same verse on the same date. */
const DAILY_SHUFFLE_SEED = 1611;

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SOURCES = path.join(ROOT, 'sources');
const DB_PATH = path.join(ROOT, 'assets/db/bible.db');
const CATALOG_PATH = path.join(ROOT, 'src/core/bible/catalog.generated.ts');
const DAILY_LIST_PATH = path.join(ROOT, 'data/daily-verses.txt');

type Row = { chapter: number; verse: number; text: string };
type DailyRef = { bookId: number; chapter: number; verseStart: number; verseEnd: number };

interface SourceJson {
  books: { name: string; chapters: { chapter: number; verses: { verse: number; text: string }[] }[] }[];
}

function loadSource(file: string, clean: Cleaner): Map<string, Row[]> {
  const fullPath = path.join(SOURCES, file);
  if (!existsSync(fullPath))
    throw new Error(`Missing ${path.relative(ROOT, fullPath)}. Run "npm run data:fetch" first.`);
  const json = JSON.parse(readFileSync(fullPath, 'utf8')) as SourceJson;
  const books = new Map<string, Row[]>();
  for (const book of json.books) {
    const rows: Row[] = [];
    const seen = new Set<string>();
    for (const chapter of book.chapters) {
      for (const verse of chapter.verses) {
        const text = clean(verse.text);
        // Placeholders: the KJV has no text for Additions to Esther 1:1–10:3.
        if (text.length < 3 || text === '…' || text === '...') continue;
        // 1 Enoch: Charles prints a second (Greek) recension of some verses; keep the first.
        const key = `${chapter.chapter}:${verse.verse}`;
        if (seen.has(key)) continue;
        seen.add(key);
        rows.push({ chapter: Number(chapter.chapter), verse: Number(verse.verse), text });
      }
    }
    rows.sort((a, b) => a.chapter - b.chapter || a.verse - b.verse);
    books.set(book.name, rows);
  }
  return books;
}

const toKey = (text: string) => text.toLowerCase().replace(/[^a-z0-9]/g, '');

function parseDailyList(bookIdsByName: Map<string, number>): DailyRef[] {
  const refs: DailyRef[] = [];
  const problems: string[] = [];
  const lines = readFileSync(DAILY_LIST_PATH, 'utf8').split('\n');
  for (const raw of lines) {
    const line = raw.split('#')[0].trim();
    if (!line) continue;
    const match = /^(.+?)\s+(\d+):(\d+)(?:-(\d+))?$/.exec(line);
    const bookId = match ? bookIdsByName.get(match[1]) : undefined;
    if (!match || bookId === undefined) {
      problems.push(`Not a valid reference: ${line}`);
      continue;
    }
    const verseStart = Number(match[3]);
    refs.push({ bookId, chapter: Number(match[2]), verseStart, verseEnd: match[4] ? Number(match[4]) : verseStart });
  }
  if (problems.length) throw new Error(problems.join('\n'));
  return refs;
}

function shuffle<T>(items: T[], seed: number): T[] {
  const random = rng(seed);
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function build() {
  const sources = new Map<string, Row[]>([
    ...loadSource('KJVA.json', cleanKjv),
    ...loadSource('1-enoch.json', cleanEnoch),
    ...loadSource('book-of-jubilees.json', cleanJubilees),
  ]);
  const missing = BOOK_SOURCES.filter((b) => !sources.has(b.source)).map((b) => b.source);
  if (missing.length) throw new Error(`Books missing from the sources: ${missing.join(', ')}`);
  const unknown = [...sources.keys()].filter((name) => !BOOK_SOURCES.some((b) => b.source === name));
  if (unknown.length) throw new Error(`Books in the sources without metadata: ${unknown.join(', ')}`);

  mkdirSync(path.dirname(DB_PATH), { recursive: true });
  rmSync(DB_PATH, { force: true });
  const db = new DatabaseSync(DB_PATH);
  db.exec(`
    PRAGMA journal_mode = DELETE;
    CREATE TABLE books (id INTEGER PRIMARY KEY, name TEXT NOT NULL, abbr TEXT NOT NULL, section TEXT NOT NULL);
    CREATE TABLE verses (
      id INTEGER PRIMARY KEY, book_id INTEGER NOT NULL, chapter INTEGER NOT NULL,
      verse INTEGER NOT NULL, text TEXT NOT NULL
    );
    CREATE UNIQUE INDEX verses_ref ON verses (book_id, chapter, verse);
    CREATE VIRTUAL TABLE verses_fts USING fts5 (
      text, content = 'verses', content_rowid = 'id', tokenize = 'porter unicode61 remove_diacritics 2'
    );
    CREATE TABLE daily (
      position INTEGER PRIMARY KEY, book_id INTEGER NOT NULL, chapter INTEGER NOT NULL,
      verse_start INTEGER NOT NULL, verse_end INTEGER NOT NULL
    );
  `);

  const insertBook = db.prepare('INSERT INTO books VALUES (?, ?, ?, ?)');
  const insertVerse = db.prepare('INSERT INTO verses VALUES (?, ?, ?, ?, ?)');
  const catalog: string[] = [];
  let verseId = 0;

  db.exec('BEGIN');
  BOOK_SOURCES.forEach((meta, index) => {
    const bookId = index + 1;
    insertBook.run(bookId, meta.name, meta.abbr, meta.section);
    const chapters = new Set<number>();
    for (const row of sources.get(meta.source) ?? []) {
      insertVerse.run(++verseId, bookId, row.chapter, row.verse, row.text);
      chapters.add(row.chapter);
    }
    const aliases = [...new Set([meta.name, meta.abbr, meta.source, ...meta.aliases].map(toKey))]
      .filter(Boolean)
      .sort((a, b) => a.length - b.length || a.localeCompare(b));
    catalog.push(
      `  { id: ${bookId}, name: ${JSON.stringify(meta.name)}, abbr: ${JSON.stringify(meta.abbr)}, ` +
        `section: '${meta.section}', chapters: ${JSON.stringify([...chapters].sort((a, b) => a - b))}, ` +
        `aliases: ${JSON.stringify(aliases)} },`,
    );
  });
  db.exec(`INSERT INTO verses_fts (verses_fts) VALUES ('rebuild'); COMMIT;`);

  // Verse of the day: every reference must exist, once.
  const bookIdsByName = new Map(BOOK_SOURCES.map((meta, index) => [meta.name, index + 1]));
  const countVerses = db.prepare(
    'SELECT COUNT(*) AS n FROM verses WHERE book_id = ? AND chapter = ? AND verse BETWEEN ? AND ?',
  );
  const daily = parseDailyList(bookIdsByName);
  const seen = new Set<string>();
  for (const ref of daily) {
    const key = `${ref.bookId}:${ref.chapter}:${ref.verseStart}-${ref.verseEnd}`;
    const { n } = countVerses.get(ref.bookId, ref.chapter, ref.verseStart, ref.verseEnd) as { n: number };
    if (n !== ref.verseEnd - ref.verseStart + 1) throw new Error(`Verse of the day not found in the text: ${key}`);
    if (seen.has(key)) throw new Error(`Verse of the day listed twice: ${key}`);
    seen.add(key);
  }
  const insertDaily = db.prepare('INSERT INTO daily VALUES (?, ?, ?, ?, ?)');
  db.exec('BEGIN');
  shuffle(daily, DAILY_SHUFFLE_SEED).forEach((ref, position) =>
    insertDaily.run(position, ref.bookId, ref.chapter, ref.verseStart, ref.verseEnd),
  );
  db.exec(`COMMIT; PRAGMA user_version = ${DATA_VERSION}; VACUUM;`);
  db.close();

  writeFileSync(
    CATALOG_PATH,
    [
      '// Generated by scripts/build-bible-db.ts. Do not edit by hand: run "npm run data:build".',
      "import type { Book } from './types';",
      '',
      `export const DATA_VERSION = ${DATA_VERSION};`,
      `export const DAILY_POOL_SIZE = ${daily.length};`,
      '',
      'export const BOOKS: readonly Book[] = [',
      ...catalog,
      '];',
      '',
    ].join('\n'),
  );

  console.log(
    `Built ${path.relative(ROOT, DB_PATH)}: ${BOOK_SOURCES.length} books, ${verseId} verses, ${daily.length} daily verses.`,
  );
}

build();
