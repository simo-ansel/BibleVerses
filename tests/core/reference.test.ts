import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { describeReference, parseReference } from '@/core/bible/reference';

const parse = (input: string) => {
  const ref = parseReference(input);
  return ref ? describeReference(ref) : null;
};

describe('parseReference', () => {
  test('reads common ways of writing a reference', () => {
    assert.equal(parse('John 3:16'), 'John 3:16');
    assert.equal(parse('jn 3 16'), 'John 3:16');
    assert.equal(parse('1 Cor 13'), '1 Corinthians 13');
    assert.equal(parse('I Samuel 3:4-10'), '1 Samuel 3:4-10');
    assert.equal(parse('first john 4:8'), '1 John 4:8');
    assert.equal(parse('Ps 119:105'), 'Psalms 119:105');
    assert.equal(parse('Psalm 23'), 'Psalms 23');
    assert.equal(parse('song of songs 8:6'), 'Song of Solomon 8:6');
    assert.equal(parse('rev. 21.4'), 'Revelation 21:4');
    assert.equal(parse('Revelation'), 'Revelation');
  });

  test('knows the Apocrypha and the Ethiopian canon', () => {
    assert.equal(parse('ecclesiasticus 43:11'), 'Sirach 43:11');
    assert.equal(parse('wisdom 7:26'), 'Wisdom of Solomon 7:26');
    assert.equal(parse('1 macc 3:19'), '1 Maccabees 3:19');
    assert.equal(parse('Enoch 1'), '1 Enoch 1');
    assert.equal(parse('jub 1:23'), 'Jubilees 1:23');
    assert.equal(parse('Additions to Esther 13'), 'Additions to Esther 13');
    assert.equal(parse('Additions to Esther 2'), null, 'the KJV text of Additions to Esther starts at chapter 10');
  });

  test('reads a lone number in a one-chapter book as a verse', () => {
    assert.equal(parse('Jude 3'), 'Jude 3');
    assert.equal(parse('Jude 24-25'), 'Jude 24-25');
    assert.equal(parse('Obadiah 1:4'), 'Obadiah 4');
    assert.equal(parse('Prayer of Manasseh'), 'Prayer of Manasseh');
  });

  test('rejects text that is not a reference', () => {
    assert.equal(parse('love'), null);
    assert.equal(parse('still small voice'), null);
    assert.equal(parse('jo'), null, 'too short to be unambiguous');
    assert.equal(parse('macc 3'), null, 'which Maccabees?');
    assert.equal(parse('John 99'), null, 'no such chapter');
    assert.equal(parse(''), null);
  });
});
