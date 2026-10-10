import { DAILY_POOL_SIZE } from './books.generated';

const MS_PER_DAY = 86_400_000;

/** Days since 1970-01-01 for the phone's local calendar date. */
export function dayNumber(date: Date): number {
  return Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / MS_PER_DAY);
}

export function dateFromDayNumber(day: number): Date {
  const utc = new Date(day * MS_PER_DAY);
  return new Date(utc.getUTCFullYear(), utc.getUTCMonth(), utc.getUTCDate());
}

/** Row of the `daily` table shown on a given day (the table is already shuffled). */
export function dailyPosition(day: number): number {
  return ((day % DAILY_POOL_SIZE) + DAILY_POOL_SIZE) % DAILY_POOL_SIZE;
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/** "Saturday, 10 October" */
export function formatDay(date: Date): string {
  return `${WEEKDAYS[date.getDay()]}, ${date.getDate()} ${MONTHS[date.getMonth()]}`;
}

/** A stable painting seed for verses that are not the verse of the day (so a verse always gets the same picture). */
export function passageSeed(bookId: number, chapter: number, verse: number): number {
  return 100_000 + bookId * 10_000 + chapter * 200 + verse;
}
