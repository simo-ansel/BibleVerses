import assert from 'node:assert/strict';
import { test } from 'node:test';

import { recipeForDay } from '../src/art/painting';
import { PALETTES } from '../src/art/palettes';
import { DAILY_POOL_SIZE } from '../src/data/books.generated';
import { dailyPosition, dateFromDayNumber, dayNumber, formatDay } from '../src/data/daily';

test('day numbers follow the local calendar date', () => {
  const d = new Date(2026, 9, 10, 23, 59);
  const n = dayNumber(d);
  assert.equal(dayNumber(new Date(2026, 9, 10, 0, 1)), n);
  assert.equal(dayNumber(new Date(2026, 9, 11, 0, 1)), n + 1);
  const back = dateFromDayNumber(n);
  assert.equal(back.getFullYear(), 2026);
  assert.equal(back.getMonth(), 9);
  assert.equal(back.getDate(), 10);
  assert.equal(formatDay(back), 'Saturday, 10 October');
});

test('each day of a cycle gets a different verse', () => {
  const start = dayNumber(new Date(2026, 0, 1));
  const seen = new Set<number>();
  for (let i = 0; i < DAILY_POOL_SIZE; i++) {
    const p = dailyPosition(start + i);
    assert.ok(p >= 0 && p < DAILY_POOL_SIZE);
    seen.add(p);
  }
  assert.equal(seen.size, DAILY_POOL_SIZE);
});

test('paintings are stable and neighbouring days never share a palette', () => {
  const start = dayNumber(new Date(2026, 0, 1));
  assert.deepEqual(recipeForDay(start), recipeForDay(start));
  for (let d = start; d < start + 2000; d++) {
    assert.notEqual(recipeForDay(d).palette.name, recipeForDay(d + 1).palette.name, `day ${d}`);
  }
  const cycleStart = Math.ceil(start / PALETTES.length) * PALETTES.length;
  const used = new Set(Array.from({ length: PALETTES.length }, (_, i) => recipeForDay(cycleStart + i).palette.name));
  assert.equal(used.size, PALETTES.length, 'every palette appears once in each cycle');
});
