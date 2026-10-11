import assert from 'node:assert/strict';
import { after, beforeEach, describe, test } from 'node:test';

import { createAppServices, type AppServices } from '@/application/AppServices';
import { BOOKS } from '@/core/bible/catalog';
import { DEFAULT_SETTINGS } from '@/core/settings';
import { SqlBibleRepository } from '@/infrastructure/sqlite/SqlBibleRepository';

import { FakeClipboard, FakeFeedback, FakeReminders, FakeSharer, MemoryStore } from '../support/fakes';
import { openBibleDatabase } from '../support/nodeSqlite';

const { db, executor } = openBibleDatabase();
after(() => db.close());

let storage: MemoryStore;
let reminders: FakeReminders;
let sharer: FakeSharer;
let clipboard: FakeClipboard;
let feedback: FakeFeedback;
let services: AppServices;

const build = () =>
  createAppServices({ bible: new SqlBibleRepository(executor), storage, reminders, sharer, clipboard, feedback });

beforeEach(() => {
  storage = new MemoryStore();
  reminders = new FakeReminders();
  sharer = new FakeSharer();
  clipboard = new FakeClipboard();
  feedback = new FakeFeedback();
  services = build();
});

const JOHN = BOOKS.find((book) => book.name === 'John')?.id ?? 0;
const john316 = { bookId: JOHN, chapter: 3, verseStart: 16, verseEnd: 16, text: 'For God so loved the world' };

describe('daily verse', () => {
  test('is the same for the same date and has text', async () => {
    const a = await services.dailyVerse.forDate(new Date(2026, 9, 10, 8));
    const b = await services.dailyVerse.forDate(new Date(2026, 9, 10, 22));
    assert.ok(a && b);
    assert.deepEqual(a, b);
    assert.ok(a.passage.text.length > 20);
  });
});

describe('saved verses', () => {
  test('toggle, persist and survive a restart', () => {
    assert.equal(services.verseActions.toggleSaved(john316), true);
    assert.equal(services.savedVerses.has(john316), true);
    assert.deepEqual(feedback.events, ['success']);

    const restarted = build();
    assert.equal(restarted.savedVerses.has(john316), true);

    assert.equal(restarted.verseActions.toggleSaved(john316), false);
    assert.equal(build().savedVerses.getSnapshot().length, 0);
  });

  test('ignore corrupted storage', () => {
    storage.set('saved-verses', '{not json');
    assert.deepEqual(build().savedVerses.getSnapshot(), []);
    storage.set(
      'saved-verses',
      JSON.stringify([{ bookId: 'x' }, { bookId: 1, chapter: 1, verseStart: 1, verseEnd: 1, savedAt: 1 }]),
    );
    assert.equal(build().savedVerses.getSnapshot().length, 1);
  });

  test('notify subscribers', () => {
    let calls = 0;
    const unsubscribe = services.savedVerses.subscribe(() => calls++);
    services.savedVerses.toggle(john316);
    unsubscribe();
    services.savedVerses.toggle(john316);
    assert.equal(calls, 1);
  });
});

describe('verse actions', () => {
  test('share an image card with the reference', async () => {
    await services.verseActions.share(john316);
    assert.equal(sharer.shared.length, 1);
    assert.equal(sharer.shared[0].reference, 'John 3:16');
    assert.equal(sharer.shared[0].text, john316.text);
  });

  test('copy the text with its reference', async () => {
    await services.verseActions.copy(john316);
    assert.equal(clipboard.text, 'For God so loved the world\nJohn 3:16');
  });
});

describe('daily reminder', () => {
  test('is off by default', () => {
    assert.deepEqual(services.settings.getSnapshot(), DEFAULT_SETTINGS);
  });

  test('schedules when enabled and follows time changes', async () => {
    assert.equal(await services.settings.enableReminder(), 'enabled');
    assert.deepEqual(reminders.scheduled, DEFAULT_SETTINGS.reminderTime);
    await services.settings.setReminderTime({ hour: 7, minute: 30 });
    assert.deepEqual(reminders.scheduled, { hour: 7, minute: 30 });
    await services.settings.disableReminder();
    assert.equal(reminders.scheduled, null);
    assert.deepEqual(build().settings.getSnapshot().reminderTime, { hour: 7, minute: 30 });
  });

  test('stays off when permission is denied', async () => {
    reminders.permission = 'denied';
    assert.equal(await services.settings.enableReminder(), 'permission-denied');
    assert.equal(services.settings.getSnapshot().reminderEnabled, false);
    assert.equal(reminders.scheduled, null);
  });

  test('startup sync repairs the schedule and respects revoked permission', async () => {
    await services.settings.enableReminder();
    reminders.scheduled = null; // e.g. the app was reinstalled from a backup
    await build().settings.syncReminder();
    assert.deepEqual(reminders.scheduled, DEFAULT_SETTINGS.reminderTime);

    reminders.permission = 'denied';
    const afterRevoke = build();
    await afterRevoke.settings.syncReminder();
    assert.equal(afterRevoke.settings.getSnapshot().reminderEnabled, false);
    assert.equal(reminders.scheduled, null);
  });
});
