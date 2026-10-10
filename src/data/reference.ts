/**
 * Parses what people type into the search box as a Bible reference:
 * "John 3:16", "jn 3 16", "1 Cor 13", "I Samuel 3:4-10", "Sirach 2", "Jude 3", "enoch 1".
 */
import { BOOKS } from './books';
import type { BookInfo } from './types';

export interface ParsedReference {
  book: BookInfo;
  chapter?: number;
  verseStart?: number;
  verseEnd?: number;
}

const ORDINALS: [RegExp, string][] = [
  [/^(first|1st)\s+/, '1 '],
  [/^(second|2nd)\s+/, '2 '],
  [/^(third|3rd)\s+/, '3 '],
  [/^iii\s+/, '3 '],
  [/^ii\s+/, '2 '],
  [/^i\s+(?=[a-z])/, '1 '],
];

function key(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '');
}

const aliasIndex = new Map<string, BookInfo>();
for (const book of BOOKS) for (const alias of book.aliases) aliasIndex.set(alias, book);

export function findBookByName(input: string): BookInfo | null {
  let s = input.toLowerCase().trim().replace(/\./g, '');
  for (const [re, rep] of ORDINALS) s = s.replace(re, rep);
  const k = key(s);
  if (k.length === 0) return null;
  const exact = aliasIndex.get(k);
  if (exact) return exact;
  if (k.length < 3) return null;
  // Unique prefix of a full name or alias ("revel" → Revelation, "macc" is ambiguous).
  const matches = new Set<BookInfo>();
  for (const book of BOOKS) {
    if (book.aliases.some((a) => a.startsWith(k))) matches.add(book);
  }
  return matches.size === 1 ? [...matches][0] : null;
}

const REF_RE = /^\s*((?:[1-4]|i{1,3}|first|second|third|1st|2nd|3rd)?\s*[a-z][a-z.\s']*?)\s*(?:(\d+)(?:\s*[:.,\s]\s*(\d+))?(?:\s*[-–]\s*(\d+))?)?\s*$/i;

export function parseReference(input: string): ParsedReference | null {
  const m = REF_RE.exec(input);
  if (!m) return null;
  const book = findBookByName(m[1]);
  if (!book) return null;
  const n1 = m[2] ? parseInt(m[2], 10) : undefined;
  const n2 = m[3] ? parseInt(m[3], 10) : undefined;
  const n3 = m[4] ? parseInt(m[4], 10) : undefined;

  if (n1 === undefined) return { book };

  // One-chapter books: "Jude 3" means verse 3.
  if (book.chapters.length === 1 && n2 === undefined && (!book.chapters.includes(n1) || n3 !== undefined)) {
    return { book, chapter: book.chapters[0], verseStart: n1, verseEnd: n3 !== undefined && n3 >= n1 ? n3 : n1 };
  }
  if (!book.chapters.includes(n1)) return null;
  if (n2 === undefined) return { book, chapter: n1 };
  const end = n3 !== undefined && n3 >= n2 ? n3 : n2;
  return { book, chapter: n1, verseStart: n2, verseEnd: end };
}

export function describeReference(ref: ParsedReference): string {
  if (ref.chapter === undefined) return ref.book.name;
  const base = ref.book.chapters.length === 1 ? ref.book.name : `${ref.book.name} ${ref.chapter}`;
  if (ref.verseStart === undefined) return base;
  const verses = ref.verseEnd && ref.verseEnd > ref.verseStart ? `${ref.verseStart}-${ref.verseEnd}` : `${ref.verseStart}`;
  return ref.book.chapters.length === 1 ? `${ref.book.name} ${verses}` : `${base}:${verses}`;
}
