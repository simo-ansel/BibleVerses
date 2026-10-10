export type SectionId = 'ot' | 'apocrypha' | 'nt' | 'ethiopian';

export interface BookInfo {
  id: number;
  name: string;
  abbr: string;
  section: SectionId;
  /** Chapter numbers that exist in the text (not always 1..n: Additions to Esther starts at 10). */
  chapters: number[];
  /** Lowercase keys with spaces and punctuation removed, used by the reference parser. */
  aliases: string[];
}

export interface Verse {
  id: number;
  bookId: number;
  chapter: number;
  verse: number;
  text: string;
}

/** A verse or a short run of verses in one chapter. */
export interface Passage {
  bookId: number;
  chapter: number;
  verseStart: number;
  verseEnd: number;
}

export interface PassageWithText extends Passage {
  text: string;
}
