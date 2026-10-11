/**
 * Clean-up of the source texts: removes editorial apparatus (sub-verse labels, recension
 * markers, chronology notes, brackets) so verses read as plain text.
 */

export type Cleaner = (text: string) => string;

/** Unicode-normalises and collapses whitespace, and removes spaces before punctuation. */
export function squash(text: string): string {
  return text
    .normalize('NFC')
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.;:?!])/g, '$1')
    .trim();
}

const unwrapBrackets = (text: string) => text.replace(/\[([^\]]*)\]/g, '$1');

/** King James Version with Apocrypha. */
export const cleanKjv: Cleaner = (text) =>
  squash(
    unwrapBrackets(
      text.replace(/–/g, '-'), // Beth–el → Beth-el: the KJV joins names with hyphens
    ),
  );

/** 1 Enoch, tr. R. H. Charles. */
export const cleanEnoch: Cleaner = (text) =>
  squash(
    unwrapBrackets(
      text
        .replace(/\[Lost passage[^\]]*\]/g, '')
        .replace(/\[\d+:\d+[a-z]\]/g, '') // sub-verse labels such as [5:6a]
        .replace(/\*\*[A-Za-z]+\*\*/g, '') // recension markers **E** and **Gg**
        .replace(/[†⌈⌉]/g, '')
        .replace(/[\u0091\u0092]/g, "'")
        .replace(/--/g, '—'),
    ),
  );

/** Jubilees, tr. R. H. Charles. */
export const cleanJubilees: Cleaner = (text) =>
  squash(
    unwrapBrackets(
      text
        .replace(/\[[^\]]*(A\.\s?M\.?|Anno Mundi)[^\]]*\]/gi, '') // chronology notes such as [2172 A.M.]
        .replace(/\b\d[\d\s,-]*A\.\s?M\.?\]/gi, ''), // a chronology note whose "[" sits in the previous verse
    )
      .replace(/[[\]]/g, '') // brackets left open across verses
      .replace(/<([^>]*)>/g, '$1')
      .replace(/[~`]/g, '')
      .replace(/--/g, '—'),
  );
