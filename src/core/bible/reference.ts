/**
 * Parses Bible references as people type them:
 * "John 3:16", "jn 3 16", "1 Cor 13", "I Samuel 3:4-10", "Sirach 2", "Jude 3", "enoch 1".
 */
import { BOOKS } from './catalog';
import type { Book } from './types';

export interface ParsedReference {
  readonly book: Book;
  readonly chapter?: number;
  readonly verseStart?: number;
  readonly verseEnd?: number;
}

const ORDINAL_PREFIXES: readonly [RegExp, string][] = [
  [/^(first|1st)\s+/, '1 '],
  [/^(second|2nd)\s+/, '2 '],
  [/^(third|3rd)\s+/, '3 '],
  [/^iii\s+/, '3 '],
  [/^ii\s+/, '2 '],
  [/^i\s+(?=[a-z])/, '1 '],
];

const REFERENCE_PATTERN =
  /^\s*((?:[1-4]|i{1,3}|first|second|third|1st|2nd|3rd)?\s*[a-z][a-z.\s']*?)\s*(?:(\d+)(?:\s*[:.,\s]\s*(\d+))?(?:\s*[-–]\s*(\d+))?)?\s*$/i;

/** Shortest unique prefix length accepted when a name is not an exact alias ("revel" → Revelation). */
const MIN_PREFIX_LENGTH = 3;

const toKey = (text: string): string => text.toLowerCase().replace(/[^a-z0-9]/g, '');

const booksByAlias = new Map<string, Book>();
for (const book of BOOKS) for (const alias of book.aliases) booksByAlias.set(alias, book);

export function findBookByName(input: string): Book | null {
  let name = input.toLowerCase().trim().replace(/\./g, '');
  for (const [pattern, replacement] of ORDINAL_PREFIXES) name = name.replace(pattern, replacement);
  const key = toKey(name);
  if (key.length === 0) return null;

  const exact = booksByAlias.get(key);
  if (exact) return exact;
  if (key.length < MIN_PREFIX_LENGTH) return null;

  const candidates = new Set(BOOKS.filter((book) => book.aliases.some((alias) => alias.startsWith(key))));
  return candidates.size === 1 ? [...candidates][0] : null;
}

export function parseReference(input: string): ParsedReference | null {
  const match = REFERENCE_PATTERN.exec(input);
  if (!match) return null;
  const book = findBookByName(match[1]);
  if (!book) return null;

  const [first, second, third] = [match[2], match[3], match[4]].map((n) => (n ? parseInt(n, 10) : undefined));
  if (first === undefined) return { book };

  // In one-chapter books a lone number is a verse: "Jude 3", "Jude 24-25".
  const isOneChapter = book.chapters.length === 1;
  if (isOneChapter && second === undefined && (!book.chapters.includes(first) || third !== undefined)) {
    const end = third !== undefined && third >= first ? third : first;
    return { book, chapter: book.chapters[0], verseStart: first, verseEnd: end };
  }

  if (!book.chapters.includes(first)) return null;
  if (second === undefined) return { book, chapter: first };
  const end = third !== undefined && third >= second ? third : second;
  return { book, chapter: first, verseStart: second, verseEnd: end };
}

export function describeReference(ref: ParsedReference): string {
  const { book, chapter, verseStart, verseEnd } = ref;
  if (chapter === undefined) return book.name;
  const isOneChapter = book.chapters.length === 1;
  if (verseStart === undefined) return isOneChapter ? book.name : `${book.name} ${chapter}`;
  const verses = verseEnd !== undefined && verseEnd > verseStart ? `${verseStart}-${verseEnd}` : `${verseStart}`;
  return isOneChapter ? `${book.name} ${verses}` : `${book.name} ${chapter}:${verses}`;
}
