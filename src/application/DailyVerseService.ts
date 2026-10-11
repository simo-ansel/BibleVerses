import { recipeForDay, type PaintingRecipe } from '@/core/art/painting';
import type { PassageText } from '@/core/bible/types';
import { dayNumber } from '@/core/daily/calendar';
import { dailyVerseIndex } from '@/core/daily/dailyVerse';
import type { BibleRepository } from '@/core/ports';

export interface DailyVerse {
  readonly passage: PassageText;
  readonly recipe: PaintingRecipe;
}

/** Today's painting depends only on the date, so any screen can draw it without loading the verse. */
export function paintingForDate(date: Date): PaintingRecipe {
  return recipeForDay(dayNumber(date));
}

export class DailyVerseService {
  private readonly bible: BibleRepository;

  constructor(bible: BibleRepository) {
    this.bible = bible;
  }

  /** The verse and painting for a calendar date. Same date, same result on every phone. */
  async forDate(date: Date): Promise<DailyVerse | null> {
    const day = dayNumber(date);
    const passage = await this.bible.getDailyPassage(dailyVerseIndex(day));
    if (!passage) return null;
    const text = await this.bible.getPassageText(passage);
    return { passage: { ...passage, text }, recipe: paintingForDate(date) };
  }
}
