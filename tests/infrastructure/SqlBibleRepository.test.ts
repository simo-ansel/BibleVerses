import assert from 'node:assert/strict';
import { after, describe, test } from 'node:test';

import { BOOKS, DAILY_POOL_SIZE } from '@/core/bible/catalog';
import { toFtsQuery } from '@/infrastructure/sqlite/fullTextSearch';
import { SqlBibleRepository } from '@/infrastructure/sqlite/SqlBibleRepository';

import { openBibleDatabase } from '../support/nodeSqlite';

const { db, executor } = openBibleDatabase();
const bible = new SqlBibleRepository(executor);
after(() => db.close());

const bookId = (name: string) => {
  const book = BOOKS.find((b) => b.name === name);
  assert.ok(book, name);
  return book.id;
};

describe('bundled database', () => {
  test('matches the generated catalog chapter for chapter', () => {
    const chapters = db.prepare('SELECT DISTINCT chapter FROM verses WHERE book_id = ? ORDER BY chapter');
    for (const book of BOOKS) {
      const rows = chapters.all(book.id) as { chapter: number }[];
      assert.deepEqual(
        rows.map((r) => r.chapter),
        book.chapters,
        book.name,
      );
    }
  });

  test('contains plain text only, without editorial markup', () => {
    const marked = db
      .prepare(
        `SELECT book_id, chapter, verse FROM verses
         WHERE text GLOB '*[[]*' OR text GLOB '*]*' OR text LIKE '%**%' OR text LIKE '%†%'
            OR text LIKE '%~%' OR text LIKE '%A.M.%' OR length(text) < 3`,
      )
      .all();
    assert.deepEqual(marked, []);
  });
});

describe('SqlBibleRepository', () => {
  test('reads chapters in verse order', async () => {
    const verses = await bible.getChapter(bookId('Psalms'), 23);
    assert.equal(verses.length, 6);
    assert.match(verses[0].text, /The Lord is my shepherd; I shall not want\.$/);
    assert.deepEqual(
      verses.map((v) => v.verse),
      [1, 2, 3, 4, 5, 6],
    );
  });

  test('joins the verses of a passage', async () => {
    const text = await bible.getPassageText({ bookId: bookId('Numbers'), chapter: 6, verseStart: 24, verseEnd: 26 });
    assert.match(text, /^The Lord bless thee, and keep thee: The Lord make his face shine/);
  });

  test('every verse-of-the-day entry resolves to text', async () => {
    for (let index = 0; index < DAILY_POOL_SIZE; index++) {
      const passage = await bible.getDailyPassage(index);
      assert.ok(passage, `entry ${index}`);
      assert.ok((await bible.getPassageText(passage)).length > 20, `entry ${index}`);
    }
    assert.equal(await bible.getDailyPassage(DAILY_POOL_SIZE), null);
  });

  test('finds phrases and marks the matching words', async () => {
    const result = await bible.search({ text: 'still small voice', section: null, limit: 10 });
    assert.equal(result.total, 1);
    const [hit] = result.hits;
    assert.equal(hit.verse.bookId, bookId('1 Kings'));
    assert.deepEqual(
      hit.segments.filter((s) => s.isMatch).map((s) => s.text),
      ['still', 'small', 'voice'],
    );
  });

  test('limits results and reports the full count', async () => {
    const result = await bible.search({ text: 'love', section: null, limit: 25 });
    assert.equal(result.hits.length, 25);
    assert.ok(result.total > 400);
  });

  test('filters by section', async () => {
    const result = await bible.search({ text: 'wisdom', section: 'apocrypha', limit: 200 });
    assert.ok(result.total > 50);
    const apocrypha = new Set(BOOKS.filter((b) => b.section === 'apocrypha').map((b) => b.id));
    for (const hit of result.hits) assert.ok(apocrypha.has(hit.verse.bookId));
  });

  test('never breaks on unusual input', async () => {
    for (const text of ['love" OR', '***', "god's", 'NEAR(', '"', 'a-b', '   ', '"still small"', 'Râkê']) {
      await bible.search({ text, section: null, limit: 5 });
    }
    assert.equal(toFtsQuery('   '), null);
    assert.equal(toFtsQuery('still small'), '"still" "small"*');
    assert.equal(toFtsQuery('"still small"'), '"still small"');
  });
});
