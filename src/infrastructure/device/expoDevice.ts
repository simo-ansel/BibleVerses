import * as ExpoClipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';

import type { Clipboard, Feedback } from '@/core/ports';

export function createExpoClipboard(): Clipboard {
  return {
    async copy(text) {
      await ExpoClipboard.setStringAsync(text);
    },
  };
}

export function createHapticFeedback(): Feedback {
  // Haptics are a nicety: devices without a vibration motor simply ignore them.
  const ignore = () => {};
  return {
    selection: () => void Haptics.selectionAsync().catch(ignore),
    success: () => void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(ignore),
  };
}
