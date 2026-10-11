/** Helpers for SQLite FTS5 queries. */
import type { TextSegment } from '@/core/ports';

/** Markers SQLite's highlight() wraps around matching words. Control characters never occur in the text. */
export const MATCH_START = '\u0001';
export const MATCH_END = '\u0002';

const WORD = /[A-Za-z0-9À-ɏ]+/g;

/**
 * Turns what the user typed into a safe FTS5 query: every word must appear and the last word
 * matches as a prefix, so results update while typing. Text in double quotes is an exact phrase.
 * Returns null when there is nothing to search for.
 */
export function toFtsQuery(input: string): string | null {
  const phrase = /^\s*"(.+)"\s*$/.exec(input);
  if (phrase) {
    const words = phrase[1].match(WORD);
    return words ? `"${words.join(' ')}"` : null;
  }
  const words = input.match(WORD);
  if (!words) return null;
  return words.map((word, i) => (i === words.length - 1 ? `"${word}"*` : `"${word}"`)).join(' ');
}

export function searchWords(input: string): string[] {
  return input.match(WORD) ?? [];
}

/** Splits highlight() output into plain and matching runs. */
export function toSegments(marked: string): TextSegment[] {
  const segments: TextSegment[] = [];
  let isMatch = false;
  let buffer = '';
  for (const char of marked) {
    if (char === MATCH_START || char === MATCH_END) {
      if (buffer) segments.push({ text: buffer, isMatch });
      buffer = '';
      isMatch = char === MATCH_START;
    } else {
      buffer += char;
    }
  }
  if (buffer) segments.push({ text: buffer, isMatch });
  return segments;
}
