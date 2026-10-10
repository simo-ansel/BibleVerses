import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { SQLiteProvider, useSQLiteContext } from 'expo-sqlite';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { SkiaFontsProvider } from '@/art/SkiaFonts';
import { DB_FILE } from '@/data/books.generated';
import { rescheduleVerses } from '@/notifications';
import { FONT_FILES, useColors, useIsDark } from '@/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(FONT_FILES);
  const c = useColors();
  const dark = useIsDark();

  if (!fontsLoaded && !fontError) return null;

  const navTheme = dark ? DarkTheme : DefaultTheme;
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: c.ground }}>
      <ThemeProvider value={{ ...navTheme, colors: { ...navTheme.colors, background: c.ground, card: c.ground, text: c.ink, border: c.rule, primary: c.lapis } }}>
        <SQLiteProvider
          databaseName={DB_FILE}
          assetSource={{ assetId: require('@/assets/db/bible.db') }}
          options={{ enableChangeListener: false }}>
          <SkiaFontsProvider>
            <Startup />
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.ground }, animation: 'fade_from_bottom' }}>
              <Stack.Screen name="(tabs)" options={{ animation: 'none' }} />
            </Stack>
          </SkiaFontsProvider>
        </SQLiteProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

/** Runs once the database is ready: hides the splash and tops up the morning notifications. */
function Startup() {
  const db = useSQLiteContext();
  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
    rescheduleVerses(db).catch(() => {});
  }, [db]);
  return null;
}
