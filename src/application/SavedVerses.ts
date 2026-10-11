import { samePassage } from '@/core/bible/passage';
import type { Passage } from '@/core/bible/types';
import type { KeyValueStore } from '@/core/ports';

import { PersistedStore } from './observableStore';

export interface SavedVerse extends Passage {
  readonly savedAt: number;
}

const isSavedVerse = (value: unknown): value is SavedVerse => {
  const v = value as Record<string, unknown> | null;
  return (
    typeof v === 'object' &&
    v !== null &&
    ['bookId', 'chapter', 'verseStart', 'verseEnd', 'savedAt'].every((k) => typeof v[k] === 'number')
  );
};

/** The user's saved verses, newest first. */
export class SavedVerses extends PersistedStore<readonly SavedVerse[]> {
  private readonly now: () => number;

  constructor(storage: KeyValueStore, now: () => number = Date.now) {
    super(storage, 'saved-verses', (raw) => (Array.isArray(raw) ? raw.filter(isSavedVerse) : []));
    this.now = now;
  }

  has(passage: Passage): boolean {
    return this.getSnapshot().some((saved) => samePassage(saved, passage));
  }

  /** Saves the passage, or removes it if already saved. Returns whether it is now saved. */
  toggle(passage: Passage): boolean {
    const list = this.getSnapshot();
    if (this.has(passage)) {
      this.set(list.filter((saved) => !samePassage(saved, passage)));
      return false;
    }
    const { bookId, chapter, verseStart, verseEnd } = passage;
    this.set([{ bookId, chapter, verseStart, verseEnd, savedAt: this.now() }, ...list]);
    return true;
  }
}
