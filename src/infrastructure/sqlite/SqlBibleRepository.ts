/**
 * BibleRepository over the bundled SQLite database (see scripts/build-bible-db.ts for the schema).
 * Depends only on SqlExecutor, so it is tested in Node against the real database file.
 */
import type { Passage, SectionId, Verse } from '@/core/bible/types';
import type { BibleRepository, SearchQuery, SearchResult } from '@/core/ports';

import { MATCH_END, MATCH_START, searchWords, toFtsQuery, toSegments } from './fullTextSearch';
import type { SqlExecutor, SqlParam } from './SqlExecutor';

interface VerseRow {
  id: number;
  book_id: number;
  chapter: number;
  verse: number;
  text: string;
}

interface DailyRow {
  book_id: number;
  chapter: number;
  verse_start: number;
  verse_end: number;
}

const toVerse = (row: VerseRow): Verse => ({
  id: row.id,
  bookId: row.book_id,
  chapter: row.chapter,
  verse: row.verse,
  text: row.text,
});

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export class SqlBibleRepository implements BibleRepository {
  private readonly db: SqlExecutor;

  constructor(db: SqlExecutor) {
    this.db = db;
  }

  async getChapter(bookId: number, chapter: number): Promise<Verse[]> {
    const rows = await this.db.all<VerseRow>(
      'SELECT id, book_id, chapter, verse, text FROM verses WHERE book_id = ? AND chapter = ? ORDER BY verse',
      [bookId, chapter],
    );
    return rows.map(toVerse);
  }

  async getPassageText(passage: Passage): Promise<string> {
    const rows = await this.db.all<{ text: string }>(
      'SELECT text FROM verses WHERE book_id = ? AND chapter = ? AND verse BETWEEN ? AND ? ORDER BY verse',
      [passage.bookId, passage.chapter, passage.verseStart, passage.verseEnd],
    );
    return rows.map((row) => row.text).join(' ');
  }

  async getDailyPassage(index: number): Promise<Passage | null> {
    const row = await this.db.first<DailyRow>(
      'SELECT book_id, chapter, verse_start, verse_end FROM daily WHERE position = ?',
      [index],
    );
    return row
      ? { bookId: row.book_id, chapter: row.chapter, verseStart: row.verse_start, verseEnd: row.verse_end }
      : null;
  }

  async search({ text, section, limit }: SearchQuery): Promise<SearchResult> {
    const fts = toFtsQuery(text);
    if (!fts) return { hits: [], total: 0 };
    try {
      return await this.searchFts(fts, section, limit);
    } catch {
      // SQLite builds without FTS5 fall back to a plain substring search.
      return this.searchLike(searchWords(text), section, limit);
    }
  }

  private async searchFts(fts: string, section: SectionId | null, limit: number): Promise<SearchResult> {
    const sectionFilter = section ? 'AND b.section = ?' : '';
    const params: SqlParam[] = section ? [fts, section] : [fts];
    const from = `FROM verses_fts
      JOIN verses v ON v.id = verses_fts.rowid
      JOIN books b ON b.id = v.book_id
      WHERE verses_fts MATCH ? ${sectionFilter}`;
    const rows = await this.db.all<VerseRow & { marked: string }>(
      `SELECT v.id, v.book_id, v.chapter, v.verse, v.text,
              highlight(verses_fts, 0, char(1), char(2)) AS marked
       ${from} ORDER BY rank LIMIT ?`,
      [...params, limit],
    );
    const count = await this.db.first<{ n: number }>(`SELECT COUNT(*) AS n ${from}`, params);
    return {
      hits: rows.map((row) => ({ verse: toVerse(row), segments: toSegments(row.marked) })),
      total: count?.n ?? rows.length,
    };
  }

  private async searchLike(words: string[], section: SectionId | null, limit: number): Promise<SearchResult> {
    if (words.length === 0) return { hits: [], total: 0 };
    const conditions = words.map(() => 'v.text LIKE ?').join(' AND ');
    const params: SqlParam[] = words.map((word) => `%${word}%`);
    if (section) params.push(section);
    const rows = await this.db.all<VerseRow>(
      `SELECT v.id, v.book_id, v.chapter, v.verse, v.text
       FROM verses v JOIN books b ON b.id = v.book_id
       WHERE ${conditions} ${section ? 'AND b.section = ?' : ''}
       ORDER BY v.id LIMIT ?`,
      [...params, limit],
    );
    const pattern = new RegExp(`(${words.map(escapeRegExp).join('|')})`, 'gi');
    return {
      hits: rows.map((row) => ({
        verse: toVerse(row),
        segments: toSegments(row.text.replace(pattern, `${MATCH_START}$1${MATCH_END}`)),
      })),
      total: rows.length,
    };
  }
}
