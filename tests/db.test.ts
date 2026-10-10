// Runs the app's queries against the real bundled database, using Node's built-in SQLite.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import type { SQLiteDatabase } from 'expo-sqlite';

import { BOOKS } from '../src/data/books';
import { DAILY_POOL_SIZE } from '../src/data/books.generated';
import { getChapter, getDailyPassage, MATCH_START, searchVerses, toFtsQuery } from '../src/data/db';

const raw = new DatabaseSync(new URL('../assets/db/bible.db', import.meta.url).pathname, { readOnly: true });
const db = {
  getAllAsync: async (sql: string, params: unknown[] = []) => raw.prepare(sql).all(...(params as never[])),
  getFirstAsync: async (sql: string, params: unknown[] = []) => raw.prepare(sql).get(...(params as never[])) ?? null,
} as unknown as SQLiteDatabase;

test('every book and chapter in the index exists in the database', () => {
  for (const book of BOOKS) {
    const rows = raw.prepare('SELECT DISTINCT chapter FROM verses WHERE book_id = ? ORDER BY chapter').all(book.id) as { chapter: number }[];
    assert.deepEqual(rows.map((r) => r.chapter), book.chapters, book.name);
  }
  const total = raw.prepare('SELECT COUNT(*) AS n FROM verses').get() as { n: number };
  assert.ok(total.n > 39000);
});

test('verse texts carry no editorial markup', () => {
  const bad = raw
    .prepare("SELECT book_id, chapter, verse, text FROM verses WHERE text GLOB '*[[]*' OR text LIKE '%**%' OR text LIKE '%†%' OR text LIKE '%~%' OR text LIKE '%A.M.]%' OR length(text) < 3")
    .all();
  assert.deepEqual(bad, []);
});

test('every verse of the day resolves to text', async () => {
  for (let i = 0; i < DAILY_POOL_SIZE; i++) {
    const p = await getDailyPassage(db, i);
    assert.ok(p && p.text.length > 20, `daily position ${i}`);
  }
});

test('Additions to Esther starts at 10:4, like the KJV', async () => {
  const verses = await getChapter(db, BOOKS.find((b) => b.name === 'Additions to Esther')!.id, 10);
  assert.equal(verses[0].verse, 4);
});

test('search finds phrases and words, best match first', async () => {
  const res = await searchVerses(db, 'still small voice', null);
  assert.equal(res.total, 1);
  assert.equal(res.hits[0].chapter, 19);
  assert.equal(res.hits[0].verse, 12);
  assert.ok(res.hits[0].marked.includes(`${MATCH_START}still`));

  const love = await searchVerses(db, 'love', null);
  assert.ok(love.total > 400);
  assert.ok(love.hits.length <= 150);
});

test('search can be limited to one part of the Bible', async () => {
  const res = await searchVerses(db, 'wisdom', 'apocrypha');
  assert.ok(res.total > 50);
  const apocrypha = new Set(BOOKS.filter((b) => b.section === 'apocrypha').map((b) => b.id));
  for (const hit of res.hits) assert.ok(apocrypha.has(hit.bookId));
  const enoch = await searchVerses(db, 'watchers', 'ethiopian');
  assert.ok(enoch.total > 5);
});

test('odd input never breaks the query', async () => {
  for (const input of ['love" OR', '***', "god's", 'NEAR(', '"', 'a-b', '  ', 'Râkê\'êl', '"still small"']) {
    const q = toFtsQuery(input);
    if (q) await searchVerses(db, input, null);
  }
  assert.equal(toFtsQuery('   '), null);
  assert.equal(toFtsQuery('still small'), '"still" "small"*');
});
