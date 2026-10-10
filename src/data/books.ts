import { BOOKS, SECTIONS } from './books.generated';
import type { BookInfo, Passage, SectionId } from './types';

export { BOOKS, SECTIONS };

const byId = new Map<number, BookInfo>(BOOKS.map((b) => [b.id, b]));

export function getBook(id: number): BookInfo {
  const book = byId.get(id);
  if (!book) throw new Error(`Unknown book id ${id}`);
  return book;
}

export function findBook(id: number): BookInfo | undefined {
  return byId.get(id);
}

export function sectionTitle(section: SectionId): string {
  return SECTIONS.find((s) => s.id === section)?.title ?? '';
}

/** Books outside the 66-book Protestant canon get a quiet note under the reference. */
export function isHiddenBook(book: BookInfo): boolean {
  return book.section === 'apocrypha' || book.section === 'ethiopian';
}

export function provenance(book: BookInfo): string | null {
  if (book.section === 'apocrypha') return 'from the Apocrypha';
  if (book.section === 'ethiopian') return 'from the Ethiopian canon';
  return null;
}

export function formatPassage(p: Passage, opts: { abbreviated?: boolean } = {}): string {
  const book = getBook(p.bookId);
  const name = opts.abbreviated ? book.abbr : book.name;
  const verses = p.verseEnd > p.verseStart ? `${p.verseStart}-${p.verseEnd}` : `${p.verseStart}`;
  return `${name} ${p.chapter}:${verses}`;
}

export function formatChapter(bookId: number, chapter: number): string {
  const book = getBook(bookId);
  return book.chapters.length === 1 ? book.name : `${book.name} ${chapter}`;
}

/** The chapter before/after this one, crossing book boundaries. */
export function adjacentChapter(
  bookId: number,
  chapter: number,
  direction: 1 | -1,
): { bookId: number; chapter: number } | null {
  const book = getBook(bookId);
  const idx = book.chapters.indexOf(chapter);
  const next = book.chapters[idx + direction];
  if (next !== undefined) return { bookId, chapter: next };
  const bookIdx = BOOKS.findIndex((b) => b.id === bookId);
  const other = BOOKS[bookIdx + direction];
  if (!other) return null;
  return {
    bookId: other.id,
    chapter: direction === 1 ? other.chapters[0] : other.chapters[other.chapters.length - 1],
  };
}
