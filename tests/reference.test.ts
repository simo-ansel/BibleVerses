import assert from 'node:assert/strict';
import { test } from 'node:test';

import { describeReference, parseReference } from '../src/data/reference';

function ref(input: string) {
  const r = parseReference(input);
  return r ? describeReference(r) : null;
}

test('common references', () => {
  assert.equal(ref('John 3:16'), 'John 3:16');
  assert.equal(ref('jn 3 16'), 'John 3:16');
  assert.equal(ref('1 Cor 13'), '1 Corinthians 13');
  assert.equal(ref('I Samuel 3:4-10'), '1 Samuel 3:4-10');
  assert.equal(ref('first john 4:8'), '1 John 4:8');
  assert.equal(ref('Ps 119:105'), 'Psalms 119:105');
  assert.equal(ref('Psalm 23'), 'Psalms 23');
  assert.equal(ref('phil 4:13'), 'Philippians 4:13');
  assert.equal(ref('isaiah 40:31'), 'Isaiah 40:31');
  assert.equal(ref('is 40'), 'Isaiah 40');
  assert.equal(ref('song of songs 8:6'), 'Song of Solomon 8:6');
  assert.equal(ref('Revelation'), 'Revelation');
  assert.equal(ref('rev. 21.4'), 'Revelation 21:4');
});

test('apocrypha and the Ethiopian canon', () => {
  assert.equal(ref('Sirach 2'), 'Sirach 2');
  assert.equal(ref('ecclesiasticus 43:11'), 'Sirach 43:11');
  assert.equal(ref('wisdom 7:26'), 'Wisdom of Solomon 7:26');
  assert.equal(ref('1 macc 3:19'), '1 Maccabees 3:19');
  assert.equal(ref('Enoch 1'), '1 Enoch 1');
  assert.equal(ref('jub 1:23'), 'Jubilees 1:23');
  assert.equal(ref('Additions to Esther 13'), 'Additions to Esther 13');
  assert.equal(ref('Additions to Esther 2'), null, 'the KJV text of Additions to Esther starts at chapter 10');
  assert.equal(ref('Prayer of Manasseh'), 'Prayer of Manasseh');
});

test('one-chapter books read a single number as a verse', () => {
  assert.equal(ref('Jude 3'), 'Jude 3');
  const r = parseReference('Jude 24-25');
  assert.equal(r?.chapter, 1);
  assert.equal(r?.verseStart, 24);
  assert.equal(r?.verseEnd, 25);
  assert.equal(ref('Obadiah 1:4'), 'Obadiah 4');
});

test('words that are not references', () => {
  assert.equal(ref('love'), null);
  assert.equal(ref('still small voice'), null);
  assert.equal(ref('jo'), null, 'too ambiguous');
  assert.equal(ref('macc 3'), null, 'which Maccabees?');
  assert.equal(ref('John 99'), null, 'no such chapter');
  assert.equal(ref(''), null);
});
