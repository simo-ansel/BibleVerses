import { DAILY_POOL_SIZE } from '../bible/catalog';

/**
 * Position in the curated verse-of-the-day list for a given day.
 * The list is shuffled when the database is built, so walking it in order gives variety,
 * and every phone shows the same verse on the same date.
 */
export function dailyVerseIndex(day: number, poolSize: number = DAILY_POOL_SIZE): number {
  return ((day % poolSize) + poolSize) % poolSize;
}
