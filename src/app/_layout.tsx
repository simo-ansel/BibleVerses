import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { View } from 'react-native';

import { ServicesProvider } from '@/composition/ServicesProvider';
import { openToday } from '@/ui/navigation';
import { useServices } from '@/ui/services';
import { FONT_FILES, useColors, useIsDark } from '@/ui/theme';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(FONT_FILES);
  const colors = useColors();
  const dark = useIsDark();

  if (!fontsLoaded && !fontError) return null;

  const base = dark ? DarkTheme : DefaultTheme;
  const theme = {
    ...base,
    colors: {
      ...base.colors,
      background: colors.ground,
      card: colors.ground,
      text: colors.ink,
      border: colors.rule,
      primary: colors.lapis,
    },
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.ground }}>
      <ThemeProvider value={theme}>
        <ServicesProvider>
          <AppReady />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.ground },
              animation: 'fade_from_bottom',
            }}>
            <Stack.Screen name="(tabs)" options={{ animation: 'none' }} />
          </Stack>
        </ServicesProvider>
      </ThemeProvider>
    </View>
  );
}

/** Rendered once the services are ready: hides the splash screen and opens Today when the reminder is tapped. */
function AppReady() {
  const { reminders } = useServices();
  useEffect(() => {
    void SplashScreen.hideAsync();
    return reminders.onOpened(openToday);
  }, [reminders]);
  return null;
}
