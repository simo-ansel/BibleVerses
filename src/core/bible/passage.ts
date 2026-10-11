import { getBook } from './catalog';
import type { ChapterRef, Passage, Verse } from './types';

/** "John 3:16", "Psalms 121:1-2", "Jude 3" style. */
export function formatPassage(passage: Passage): string {
  const book = getBook(passage.bookId);
  const verses =
    passage.verseEnd > passage.verseStart ? `${passage.verseStart}-${passage.verseEnd}` : `${passage.verseStart}`;
  return book.chapters.length === 1 ? `${book.name} ${verses}` : `${book.name} ${passage.chapter}:${verses}`;
}

/** "John 3", or just "Jude" for one-chapter books. */
export function formatChapter(ref: ChapterRef): string {
  const book = getBook(ref.bookId);
  return book.chapters.length === 1 ? book.name : `${book.name} ${ref.chapter}`;
}

export function samePassage(a: Passage, b: Passage): boolean {
  return a.bookId === b.bookId && a.chapter === b.chapter && a.verseStart === b.verseStart && a.verseEnd === b.verseEnd;
}

export function passageOfVerse(verse: Verse): Passage {
  return { bookId: verse.bookId, chapter: verse.chapter, verseStart: verse.verse, verseEnd: verse.verse };
}
