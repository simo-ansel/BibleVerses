import { useFonts, type SkTypefaceFontProvider } from '@shopify/react-native-skia';
import { createContext, useContext, type ReactNode } from 'react';

/** Fonts loaded into Skia for drawing share images (separate from the React Native text fonts). */
const SkiaFontsContext = createContext<SkTypefaceFontProvider | null>(null);

export function SkiaFontsProvider({ children }: { children: ReactNode }) {
  const fonts = useFonts({
    Fell: [
      require('@expo-google-fonts/im-fell-english/400Regular/IMFellEnglish_400Regular.ttf'),
      require('@expo-google-fonts/im-fell-english/400Regular_Italic/IMFellEnglish_400Regular_Italic.ttf'),
    ],
    Jost: [require('@expo-google-fonts/jost/400Regular/Jost_400Regular.ttf')],
  });
  return <SkiaFontsContext.Provider value={fonts}>{children}</SkiaFontsContext.Provider>;
}

export function useSkiaFonts() {
  return useContext(SkiaFontsContext);
}
