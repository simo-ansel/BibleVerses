import { BOOKS } from './catalog.generated';
import type { Book, ChapterRef, Section, SectionId } from './types';

export { BOOKS, DAILY_POOL_SIZE, DATA_VERSION } from './catalog.generated';

export const SECTIONS: readonly Section[] = [
  { id: 'ot', title: 'Old Testament' },
  { id: 'apocrypha', title: 'Apocrypha' },
  { id: 'nt', title: 'New Testament' },
  { id: 'ethiopian', title: 'Ethiopian canon' },
];

const booksById = new Map<number, Book>(BOOKS.map((book) => [book.id, book]));

export function findBook(id: number): Book | undefined {
  return booksById.get(id);
}

export function getBook(id: number): Book {
  const book = booksById.get(id);
  if (!book) throw new Error(`Unknown book id: ${id}`);
  return book;
}

export function booksInSection(section: SectionId): Book[] {
  return BOOKS.filter((book) => book.section === section);
}

/** The chapter before or after the given one, crossing into the neighbouring book if needed. */
export function adjacentChapter(from: ChapterRef, direction: 1 | -1): ChapterRef | null {
  const book = getBook(from.bookId);
  const next = book.chapters[book.chapters.indexOf(from.chapter) + direction];
  if (next !== undefined) return { bookId: book.id, chapter: next };

  const neighbour = BOOKS[BOOKS.indexOf(book) + direction];
  if (!neighbour) return null;
  const chapter = direction === 1 ? neighbour.chapters[0] : neighbour.chapters[neighbour.chapters.length - 1];
  return { bookId: neighbour.id, chapter };
}
