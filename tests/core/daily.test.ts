import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { recipeForDay, recipeForPassage } from '@/core/art/painting';
import { PALETTES } from '@/core/art/palettes';
import { DAILY_POOL_SIZE } from '@/core/bible/catalog';
import { dayNumber, formatDay, startOfDay } from '@/core/daily/calendar';
import { dailyVerseIndex } from '@/core/daily/dailyVerse';

describe('calendar', () => {
  test('the day changes at local midnight', () => {
    const day = dayNumber(new Date(2026, 9, 10, 23, 59));
    assert.equal(dayNumber(new Date(2026, 9, 10, 0, 1)), day);
    assert.equal(dayNumber(new Date(2026, 9, 11, 0, 1)), day + 1);
    assert.equal(startOfDay(new Date(2026, 9, 10, 15, 30)).getHours(), 0);
    assert.equal(formatDay(new Date(2026, 9, 10)), 'Saturday, 10 October');
  });
});

describe('verse of the day', () => {
  test('every day of a cycle shows a different verse', () => {
    const start = dayNumber(new Date(2026, 0, 1));
    const seen = new Set(Array.from({ length: DAILY_POOL_SIZE }, (_, i) => dailyVerseIndex(start + i)));
    assert.equal(seen.size, DAILY_POOL_SIZE);
    for (const index of seen) assert.ok(index >= 0 && index < DAILY_POOL_SIZE);
  });
});

describe('paintings', () => {
  test('are stable, and neighbouring days never share a palette', () => {
    const start = dayNumber(new Date(2026, 0, 1));
    assert.deepEqual(recipeForDay(start), recipeForDay(start));
    for (let day = start; day < start + 2000; day++) {
      assert.notEqual(recipeForDay(day).palette.name, recipeForDay(day + 1).palette.name, `day ${day}`);
    }
  });

  test('every palette appears once per cycle', () => {
    const cycleStart = Math.ceil(dayNumber(new Date(2026, 0, 1)) / PALETTES.length) * PALETTES.length;
    const names = new Set(Array.from({ length: PALETTES.length }, (_, i) => recipeForDay(cycleStart + i).palette.name));
    assert.equal(names.size, PALETTES.length);
  });

  test('a passage always gets the same painting', () => {
    const passage = { bookId: 43, chapter: 3, verseStart: 16, verseEnd: 16 };
    assert.deepEqual(recipeForPassage(passage), recipeForPassage({ ...passage }));
  });
});
