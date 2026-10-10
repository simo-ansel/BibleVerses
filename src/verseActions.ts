import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { useCallback, useState } from 'react';
import { Alert } from 'react-native';

import { recipeForDay, type PaintingRecipe } from './art/painting';
import { shareCard } from './art/share';
import { useSkiaFonts } from './art/SkiaFonts';
import { formatPassage, getBook, provenance } from './data/books';
import { passageSeed } from './data/daily';
import { toggleSaved } from './data/store';
import type { PassageWithText } from './data/types';

/** The painting a verse gets when shared from the reader, search or saved list. */
export function recipeForPassage(p: PassageWithText): PaintingRecipe {
  return recipeForDay(passageSeed(p.bookId, p.chapter, p.verseStart));
}

export function useShareVerse() {
  const fonts = useSkiaFonts();
  const [busy, setBusy] = useState(false);
  const share = useCallback(
    async (p: PassageWithText, recipe?: PaintingRecipe) => {
      if (!fonts || busy) return;
      setBusy(true);
      try {
        await shareCard(
          {
            text: p.text,
            reference: formatPassage(p),
            provenance: provenance(getBook(p.bookId)),
            recipe: recipe ?? recipeForPassage(p),
          },
          fonts,
        );
      } catch (e) {
        Alert.alert('Could not share the image', e instanceof Error ? e.message : String(e));
      } finally {
        setBusy(false);
      }
    },
    [fonts, busy],
  );
  return { share, ready: fonts !== null && !busy };
}

export async function copyVerse(p: PassageWithText) {
  const version = getBook(p.bookId).section === 'ethiopian' ? 'tr. R. H. Charles' : 'KJV';
  await Clipboard.setStringAsync(`${p.text}\n${formatPassage(p)} (${version})`);
  Haptics.selectionAsync().catch(() => {});
}

export function toggleSave(p: PassageWithText): boolean {
  const saved = toggleSaved(p);
  Haptics.impactAsync(saved ? Haptics.ImpactFeedbackStyle.Light : Haptics.ImpactFeedbackStyle.Soft).catch(() => {});
  return saved;
}
