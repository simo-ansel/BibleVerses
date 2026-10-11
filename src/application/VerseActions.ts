import { recipeForPassage, type PaintingRecipe } from '@/core/art/painting';
import { formatPassage } from '@/core/bible/passage';
import type { PassageText } from '@/core/bible/types';
import type { Clipboard, Feedback, VerseCardSharer } from '@/core/ports';

import type { SavedVerses } from './SavedVerses';

/** What the user can do with a verse, wherever it appears. */
export class VerseActions {
  private readonly sharer: VerseCardSharer;
  private readonly clipboard: Clipboard;
  private readonly feedback: Feedback;
  private readonly saved: SavedVerses;

  constructor(deps: { sharer: VerseCardSharer; clipboard: Clipboard; feedback: Feedback; saved: SavedVerses }) {
    this.sharer = deps.sharer;
    this.clipboard = deps.clipboard;
    this.feedback = deps.feedback;
    this.saved = deps.saved;
  }

  /** Shares the verse as an image. Without a recipe, the verse gets its own stable painting. */
  async share(passage: PassageText, recipe: PaintingRecipe = recipeForPassage(passage)): Promise<void> {
    await this.sharer.share({ text: passage.text, reference: formatPassage(passage), recipe });
  }

  async copy(passage: PassageText): Promise<void> {
    await this.clipboard.copy(`${passage.text}\n${formatPassage(passage)}`);
    this.feedback.selection();
  }

  /** Saves or unsaves the verse. Returns whether it is now saved. */
  toggleSaved(passage: PassageText): boolean {
    const isSaved = this.saved.toggle(passage);
    if (isSaved) this.feedback.success();
    else this.feedback.selection();
    return isSaved;
  }
}
