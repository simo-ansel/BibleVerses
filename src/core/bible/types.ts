/** The four parts of the collection, in reading order. */
export type SectionId = 'ot' | 'apocrypha' | 'nt' | 'ethiopian';

export interface Section {
  readonly id: SectionId;
  readonly title: string;
}

export interface Book {
  readonly id: number;
  readonly name: string;
  readonly abbr: string;
  readonly section: SectionId;
  /** Chapter numbers present in the text. Not always 1..n: Additions to Esther starts at 10. */
  readonly chapters: readonly number[];
  /** Lowercase lookup keys without spaces or punctuation, used to parse references. */
  readonly aliases: readonly string[];
}

export interface Verse {
  readonly id: number;
  readonly bookId: number;
  readonly chapter: number;
  readonly verse: number;
  readonly text: string;
}

/** A single verse or a run of verses within one chapter. */
export interface Passage {
  readonly bookId: number;
  readonly chapter: number;
  readonly verseStart: number;
  readonly verseEnd: number;
}

export interface PassageText extends Passage {
  readonly text: string;
}

export interface ChapterRef {
  readonly bookId: number;
  readonly chapter: number;
}
