/**
 * Type scale and geometry of the verse card (the shared image and the Today screen).
 * Pure functions so the app and the asset scripts lay text out the same way.
 */
export interface CardMetrics {
  /** Verse text size in px. */
  verseSize: number;
  /** Line height multiplier for the verse. */
  leading: number;
  /** Reference line size in px. */
  refSize: number;
  /** Left/right margin in px. */
  margin: number;
}

/** Bigger type for short verses, smaller for long ones. `width` is the card width in px. */
export function cardMetrics(textLength: number, width: number): CardMetrics {
  const unit = width / 1080; // designed at 1080 px wide
  let size: number;
  if (textLength <= 70) size = 82;
  else if (textLength <= 120) size = 70;
  else if (textLength <= 180) size = 60;
  else if (textLength <= 250) size = 52;
  else if (textLength <= 330) size = 46;
  else size = 40;
  return {
    verseSize: Math.round(size * unit),
    leading: size >= 60 ? 1.18 : 1.24,
    refSize: Math.round(40 * unit),
    margin: Math.round(104 * unit),
  };
}

/** Where the text block sits (as a fraction of height) — also the centre of the painting's veil. */
export const CARD_TEXT_CENTER = 0.5;
