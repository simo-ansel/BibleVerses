import type {
  BibleRepository,
  Clipboard,
  Feedback,
  KeyValueStore,
  ReminderScheduler,
  VerseCardSharer,
} from '@/core/ports';

import { DailyVerseService } from './DailyVerseService';
import { ReadingProgress } from './ReadingProgress';
import { SavedVerses } from './SavedVerses';
import { SettingsService } from './SettingsService';
import { VerseActions } from './VerseActions';

/** The adapters the app runs on. Production ones are built in src/composition; tests pass fakes. */
export interface Adapters {
  readonly bible: BibleRepository;
  readonly storage: KeyValueStore;
  readonly reminders: ReminderScheduler;
  readonly sharer: VerseCardSharer;
  readonly clipboard: Clipboard;
  readonly feedback: Feedback;
}

/** Everything the screens use. */
export interface AppServices {
  readonly bible: BibleRepository;
  readonly dailyVerse: DailyVerseService;
  readonly savedVerses: SavedVerses;
  readonly readingProgress: ReadingProgress;
  readonly settings: SettingsService;
  readonly verseActions: VerseActions;
  readonly reminders: ReminderScheduler;
}

export function createAppServices(adapters: Adapters): AppServices {
  const savedVerses = new SavedVerses(adapters.storage);
  return {
    bible: adapters.bible,
    dailyVerse: new DailyVerseService(adapters.bible),
    savedVerses,
    readingProgress: new ReadingProgress(adapters.storage),
    settings: new SettingsService(adapters.storage, adapters.reminders),
    verseActions: new VerseActions({
      sharer: adapters.sharer,
      clipboard: adapters.clipboard,
      feedback: adapters.feedback,
      saved: savedVerses,
    }),
    reminders: adapters.reminders,
  };
}
