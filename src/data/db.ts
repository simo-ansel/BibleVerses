/**
 * Queries against the bundled, read-only Bible database (assets/db/bible.db).
 */
import type { SQLiteDatabase } from 'expo-sqlite';

import type { Passage, PassageWithText, SectionId, Verse } from './types';

type VerseRow = { id: number; book_id: number; chapter: number; verse: number; text: string };

const toVerse = (r: VerseRow): Verse => ({
  id: r.id,
  bookId: r.book_id,
  chapter: r.chapter,
  verse: r.verse,
  text: r.text,
});

export async function getChapter(db: SQLiteDatabase, bookId: number, chapter: number): Promise<Verse[]> {
  const rows = await db.getAllAsync<VerseRow>(
    'SELECT id, book_id, chapter, verse, text FROM verses WHERE book_id = ? AND chapter = ? ORDER BY verse',
    [bookId, chapter],
  );
  return rows.map(toVerse);
}

export async function getPassageText(db: SQLiteDatabase, p: Passage): Promise<string> {
  const rows = await db.getAllAsync<{ text: string }>(
    'SELECT text FROM verses WHERE book_id = ? AND chapter = ? AND verse BETWEEN ? AND ? ORDER BY verse',
    [p.bookId, p.chapter, p.verseStart, p.verseEnd],
  );
  return rows.map((r) => r.text).join(' ');
}

export async function getDailyPassage(db: SQLiteDatabase, position: number): Promise<PassageWithText | null> {
  const row = await db.getFirstAsync<{ book_id: number; chapter: number; verse_start: number; verse_end: number }>(
    'SELECT book_id, chapter, verse_start, verse_end FROM daily WHERE position = ?',
    [position],
  );
  if (!row) return null;
  const passage: Passage = {
    bookId: row.book_id,
    chapter: row.chapter,
    verseStart: row.verse_start,
    verseEnd: row.verse_end,
  };
  return { ...passage, text: await getPassageText(db, passage) };
}

export async function verseExists(db: SQLiteDatabase, bookId: number, chapter: number, verse: number) {
  const row = await db.getFirstAsync<{ n: number }>(
    'SELECT COUNT(*) AS n FROM verses WHERE book_id = ? AND chapter = ? AND verse = ?',
    [bookId, chapter, verse],
  );
  return (row?.n ?? 0) > 0;
}

// ───────────────────────── search ─────────────────────────

/** Markers wrapped around matched words in `SearchHit.text`. */
export const MATCH_START = '\u0001';
export const MATCH_END = '\u0002';

export interface SearchHit extends Verse {
  /** Verse text with matches wrapped in MATCH_START / MATCH_END. */
  marked: string;
}

export interface SearchResult {
  hits: SearchHit[];
  total: number;
}

/** Turns free text into a safe FTS5 query: every word must appear, the last one as a prefix. */
export function toFtsQuery(input: string): string | null {
  const phrase = /^\s*"(.+)"\s*$/.exec(input);
  if (phrase) {
    const words = phrase[1].match(/[A-Za-z0-9\u00C0-\u024F]+/g);
    return words ? `"${words.join(' ')}"` : null;
  }
  const words = input.match(/[A-Za-z0-9\u00C0-\u024F]+/g);
  if (!words || words.length === 0) return null;
  return words.map((w, i) => (i === words.length - 1 ? `"${w}"*` : `"${w}"`)).join(' ');
}

export async function searchVerses(
  db: SQLiteDatabase,
  input: string,
  section: SectionId | null,
  limit = 150,
): Promise<SearchResult> {
  const fts = toFtsQuery(input);
  if (!fts) return { hits: [], total: 0 };
  const sectionSql = section ? 'AND b.section = ?' : '';
  const params: (string | number)[] = section ? [fts, section] : [fts];
  try {
    const rows = await db.getAllAsync<VerseRow & { marked: string }>(
      `SELECT v.id, v.book_id, v.chapter, v.verse, v.text,
              highlight(verses_fts, 0, char(1), char(2)) AS marked
         FROM verses_fts
         JOIN verses v ON v.id = verses_fts.rowid
         JOIN books b ON b.id = v.book_id
        WHERE verses_fts MATCH ? ${sectionSql}
        ORDER BY rank
        LIMIT ${limit}`,
      params,
    );
    const count = await db.getFirstAsync<{ n: number }>(
      `SELECT COUNT(*) AS n
         FROM verses_fts
         JOIN verses v ON v.id = verses_fts.rowid
         JOIN books b ON b.id = v.book_id
        WHERE verses_fts MATCH ? ${sectionSql}`,
      params,
    );
    return { hits: rows.map((r) => ({ ...toVerse(r), marked: r.marked })), total: count?.n ?? rows.length };
  } catch {
    return searchWithLike(db, input, section, limit);
  }
}

/** Fallback for SQLite builds without FTS5: plain substring search. */
async function searchWithLike(
  db: SQLiteDatabase,
  input: string,
  section: SectionId | null,
  limit: number,
): Promise<SearchResult> {
  const words = input.match(/[A-Za-z0-9\u00C0-\u024F]+/g) ?? [];
  if (words.length === 0) return { hits: [], total: 0 };
  const where = words.map(() => 'v.text LIKE ?').join(' AND ');
  const params: (string | number)[] = words.map((w) => `%${w}%`);
  if (section) params.push(section);
  const rows = await db.getAllAsync<VerseRow>(
    `SELECT v.id, v.book_id, v.chapter, v.verse, v.text
       FROM verses v JOIN books b ON b.id = v.book_id
      WHERE ${where} ${section ? 'AND b.section = ?' : ''}
      ORDER BY v.id LIMIT ${limit}`,
    params,
  );
  const re = new RegExp(`(${words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');
  return {
    hits: rows.map((r) => ({ ...toVerse(r), marked: r.text.replace(re, `${MATCH_START}$1${MATCH_END}`) })),
    total: rows.length,
  };
}

/** Splits marked text into plain and matched runs for rendering. */
export function splitMarked(marked: string): { text: string; match: boolean }[] {
  const out: { text: string; match: boolean }[] = [];
  let match = false;
  let buf = '';
  for (const ch of marked) {
    if (ch === MATCH_START || ch === MATCH_END) {
      if (buf) out.push({ text: buf, match });
      buf = '';
      match = ch === MATCH_START;
    } else {
      buf += ch;
    }
  }
  if (buf) out.push({ text: buf, match });
  return out;
}
