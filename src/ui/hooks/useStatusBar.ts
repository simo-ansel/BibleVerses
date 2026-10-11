import { useFocusEffect } from 'expo-router';
import { setStatusBarStyle } from 'expo-status-bar';
import { useCallback } from 'react';

import { useIsDark } from '@/ui/theme';

/** Sets the status bar icons while the screen is focused: light on dark backgrounds, dark on light ones. */
export function useStatusBar(darkBackground?: boolean): void {
  const systemDark = useIsDark();
  const dark = darkBackground ?? systemDark;
  useFocusEffect(useCallback(() => setStatusBarStyle(dark ? 'light' : 'dark'), [dark]));
}
