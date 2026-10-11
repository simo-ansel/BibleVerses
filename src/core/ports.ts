/**
 * Ports: what the app needs from the outside world, expressed without naming any library.
 * Implementations live in src/infrastructure and are wired together in src/composition.
 * Replacing a library (database, notifications, image rendering…) means writing a new
 * adapter for one of these interfaces; nothing else in the app changes.
 */
import type { PaintingRecipe } from './art/painting';
import type { Passage, SectionId, Verse } from './bible/types';
import type { ReminderTime } from './settings';

export interface TextSegment {
  readonly text: string;
  readonly isMatch: boolean;
}

export interface SearchHit {
  readonly verse: Verse;
  /** The verse text split into plain and matching runs, for highlighting. */
  readonly segments: readonly TextSegment[];
}

export interface SearchResult {
  readonly hits: readonly SearchHit[];
  readonly total: number;
}

export interface SearchQuery {
  readonly text: string;
  readonly section: SectionId | null;
  readonly limit: number;
}

/** Read-only access to the Bible text. */
export interface BibleRepository {
  getChapter(bookId: number, chapter: number): Promise<Verse[]>;
  getPassageText(passage: Passage): Promise<string>;
  /** The verse-of-the-day entry at a position of the curated list. */
  getDailyPassage(index: number): Promise<Passage | null>;
  search(query: SearchQuery): Promise<SearchResult>;
}

/** Small synchronous key-value storage for the user's own data. */
export interface KeyValueStore {
  get(key: string): string | null;
  set(key: string, value: string): void;
}

export type Unsubscribe = () => void;

/** A daily local notification that opens the app. */
export interface ReminderScheduler {
  /** Asks the user for permission if needed. Resolves to whether notifications are allowed. */
  requestPermission(): Promise<boolean>;
  hasPermission(): Promise<boolean>;
  /** Schedules (or reschedules) the single daily reminder. */
  scheduleDaily(time: ReminderTime): Promise<void>;
  cancel(): Promise<void>;
  /** Called when the user taps the reminder. */
  onOpened(listener: () => void): Unsubscribe;
}

export interface VerseCard {
  readonly text: string;
  readonly reference: string;
  readonly recipe: PaintingRecipe;
}

/** Renders a verse as an image and opens the system share sheet. */
export interface VerseCardSharer {
  share(card: VerseCard): Promise<void>;
}

export interface Clipboard {
  copy(text: string): Promise<void>;
}

/** Light physical feedback for user actions. */
export interface Feedback {
  selection(): void;
  success(): void;
}
