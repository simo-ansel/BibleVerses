import { useCallback, useRef, useState } from 'react';
import { Alert } from 'react-native';

import type { PaintingRecipe } from '@/core/art/painting';
import type { PassageText } from '@/core/bible/types';
import { useServices } from '@/ui/services';

/** Shares a verse as an image, ignoring taps while an image is being prepared. */
export function useShareVerse() {
  const { verseActions } = useServices();
  const [sharing, setSharing] = useState(false);
  const busy = useRef(false);

  const share = useCallback(
    async (passage: PassageText, recipe?: PaintingRecipe) => {
      if (busy.current) return;
      busy.current = true;
      setSharing(true);
      try {
        await verseActions.share(passage, recipe);
      } catch {
        Alert.alert('Could not share the image', 'Please try again.');
      } finally {
        busy.current = false;
        setSharing(false);
      }
    },
    [verseActions],
  );

  return { share, sharing };
}
