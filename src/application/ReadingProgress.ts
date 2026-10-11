import { findBook } from '@/core/bible/catalog';
import type { ChapterRef } from '@/core/bible/types';
import type { KeyValueStore } from '@/core/ports';

import { PersistedStore } from './observableStore';

const parseChapterRef = (raw: unknown): ChapterRef | null => {
  const ref = raw as Partial<ChapterRef> | null;
  if (typeof ref?.bookId !== 'number' || typeof ref.chapter !== 'number') return null;
  return findBook(ref.bookId)?.chapters.includes(ref.chapter) ? { bookId: ref.bookId, chapter: ref.chapter } : null;
};

/** The last chapter the user opened, to offer "continue reading". */
export class ReadingProgress extends PersistedStore<ChapterRef | null> {
  constructor(storage: KeyValueStore) {
    super(storage, 'last-read', parseChapterRef);
  }

  markRead(ref: ChapterRef): void {
    const current = this.getSnapshot();
    if (current?.bookId === ref.bookId && current.chapter === ref.chapter) return;
    this.set({ bookId: ref.bookId, chapter: ref.chapter });
  }
}
