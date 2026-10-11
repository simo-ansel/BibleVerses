import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { adjacentChapter, BOOKS, booksInSection, getBook, SECTIONS } from '@/core/bible/catalog';
import { formatChapter, formatPassage } from '@/core/bible/passage';

const bookId = (name: string) => {
  const book = BOOKS.find((b) => b.name === name);
  assert.ok(book, name);
  return book.id;
};

describe('catalog', () => {
  test('holds 82 books in four sections', () => {
    assert.equal(BOOKS.length, 82);
    const counts = SECTIONS.map((section) => booksInSection(section.id).length);
    assert.deepEqual(counts, [39, 14, 27, 2]);
  });

  test('aliases never point to two books', () => {
    const seen = new Map<string, string>();
    for (const book of BOOKS) {
      for (const alias of book.aliases) {
        assert.equal(seen.get(alias) ?? book.name, book.name, `alias "${alias}"`);
        seen.set(alias, book.name);
      }
    }
  });

  test('moves between chapters and across books', () => {
    assert.deepEqual(adjacentChapter({ bookId: bookId('Genesis'), chapter: 1 }, 1), {
      bookId: bookId('Genesis'),
      chapter: 2,
    });
    assert.deepEqual(adjacentChapter({ bookId: bookId('Malachi'), chapter: 4 }, 1), {
      bookId: bookId('1 Esdras'),
      chapter: 1,
    });
    assert.deepEqual(adjacentChapter({ bookId: bookId('Matthew'), chapter: 1 }, -1), {
      bookId: bookId('2 Maccabees'),
      chapter: 15,
    });
    assert.equal(adjacentChapter({ bookId: bookId('Genesis'), chapter: 1 }, -1), null);
    assert.equal(adjacentChapter({ bookId: bookId('Jubilees'), chapter: 50 }, 1), null);
  });

  test('formats references', () => {
    assert.equal(formatPassage({ bookId: bookId('John'), chapter: 3, verseStart: 16, verseEnd: 16 }), 'John 3:16');
    assert.equal(
      formatPassage({ bookId: bookId('Psalms'), chapter: 121, verseStart: 1, verseEnd: 2 }),
      'Psalms 121:1-2',
    );
    assert.equal(formatPassage({ bookId: bookId('Jude'), chapter: 1, verseStart: 24, verseEnd: 25 }), 'Jude 24-25');
    assert.equal(formatChapter({ bookId: bookId('Jude'), chapter: 1 }), 'Jude');
    assert.equal(formatChapter({ bookId: bookId('Sirach'), chapter: 43 }), 'Sirach 43');
    assert.throws(() => getBook(999));
  });
});
