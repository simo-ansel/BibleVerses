/**
 * The user's own data — saved verses, settings, last reading place — kept on the phone
 * in a small key-value store (separate from the Bible database, so updates to the
 * Bible text never touch it).
 */
import { useSyncExternalStore } from 'react';
import Storage from 'expo-sqlite/kv-store';

import type { Passage } from './types';

export interface SavedVerse extends Passage {
  savedAt: number;
}

export type ReaderFont = 'fell' | 'garamond';
export type TextSize = 's' | 'm' | 'l';

export interface Settings {
  notify: boolean;
  notifyHour: number;
  notifyMinute: number;
  readerFont: ReaderFont;
  textSize: TextSize;
}

export interface LastRead {
  bookId: number;
  chapter: number;
}

const DEFAULT_SETTINGS: Settings = {
  notify: false,
  notifyHour: 8,
  notifyMinute: 0,
  readerFont: 'fell',
  textSize: 'm',
};

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = Storage.getItemSync(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  try {
    Storage.setItemSync(key, JSON.stringify(value));
  } catch {
    // Storage is best-effort; the app keeps working with in-memory state.
  }
}

function createStore<T>(key: string, fallback: T) {
  let state: T = readJson(key, fallback);
  const listeners = new Set<() => void>();
  return {
    get: () => state,
    set(next: T) {
      state = next;
      writeJson(key, next);
      listeners.forEach((l) => l());
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

// ───────────────────────── saved verses ─────────────────────────

const savedStore = createStore<SavedVerse[]>('saved-verses', []);

const samePassage = (a: Passage, b: Passage) =>
  a.bookId === b.bookId && a.chapter === b.chapter && a.verseStart === b.verseStart && a.verseEnd === b.verseEnd;

export function useSavedVerses(): SavedVerse[] {
  return useSyncExternalStore(savedStore.subscribe, savedStore.get);
}

export function isSaved(list: SavedVerse[], p: Passage): boolean {
  return list.some((s) => samePassage(s, p));
}

/** Saves the passage, or removes it if already saved. Returns the new saved state. */
export function toggleSaved(p: Passage): boolean {
  const list = savedStore.get();
  if (list.some((s) => samePassage(s, p))) {
    savedStore.set(list.filter((s) => !samePassage(s, p)));
    return false;
  }
  const entry: SavedVerse = {
    bookId: p.bookId,
    chapter: p.chapter,
    verseStart: p.verseStart,
    verseEnd: p.verseEnd,
    savedAt: Date.now(),
  };
  savedStore.set([entry, ...list]);
  return true;
}

// ───────────────────────── settings ─────────────────────────

const settingsStore = createStore<Settings>('settings', DEFAULT_SETTINGS);

export function useSettings(): Settings {
  const s = useSyncExternalStore(settingsStore.subscribe, settingsStore.get);
  return { ...DEFAULT_SETTINGS, ...s };
}

export function getSettings(): Settings {
  return { ...DEFAULT_SETTINGS, ...settingsStore.get() };
}

export function updateSettings(patch: Partial<Settings>) {
  settingsStore.set({ ...getSettings(), ...patch });
}

// ───────────────────────── last reading place ─────────────────────────

const lastReadStore = createStore<LastRead | null>('last-read', null);

export function useLastRead(): LastRead | null {
  return useSyncExternalStore(lastReadStore.subscribe, lastReadStore.get);
}

export function setLastRead(value: LastRead) {
  const cur = lastReadStore.get();
  if (cur && cur.bookId === value.bookId && cur.chapter === value.chapter) return;
  lastReadStore.set(value);
}

// ───────────────────────── Today screen chrome ─────────────────────────
// The tab bar takes its colours from the painting while Today is visible.

export interface TodayChrome {
  ink: string;
  dark: boolean;
}

let chrome: TodayChrome = { ink: '#F3EEDC', dark: true };
const chromeListeners = new Set<() => void>();

export function setTodayChrome(next: TodayChrome) {
  if (next.ink === chrome.ink && next.dark === chrome.dark) return;
  chrome = next;
  chromeListeners.forEach((l) => l());
}

export function useTodayChrome(): TodayChrome {
  return useSyncExternalStore(
    (l) => {
      chromeListeners.add(l);
      return () => chromeListeners.delete(l);
    },
    () => chrome,
  );
}
