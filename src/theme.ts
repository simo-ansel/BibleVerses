import { useColorScheme } from 'react-native';

/**
 * Pigment-named tokens. The paintings carry the colour; the chrome around them stays quiet:
 * a cool gesso ground, iron-gall ink, lapis for actions, ochre for verse numbers.
 */
const light = {
  ground: '#ECEEE9', // gesso
  surface: '#F5F6F2',
  ink: '#1A2033', // iron-gall ink
  inkSoft: '#5B6275',
  rule: 'rgba(26, 32, 51, 0.12)',
  lapis: '#2B3F86',
  ochre: '#9A6F1E',
  rose: '#A84860',
  highlight: 'rgba(185, 138, 47, 0.22)',
  selection: 'rgba(43, 63, 134, 0.10)',
};

const dark: typeof light = {
  ground: '#0F1424',
  surface: '#161C30',
  ink: '#E4E6EE',
  inkSoft: '#9AA1B5',
  rule: 'rgba(228, 230, 238, 0.12)',
  lapis: '#93A6EC',
  ochre: '#D9AE58',
  rose: '#E07D93',
  highlight: 'rgba(217, 174, 88, 0.26)',
  selection: 'rgba(147, 166, 236, 0.14)',
};

export type Colors = typeof light;

export function useColors(): Colors {
  return useColorScheme() === 'dark' ? dark : light;
}

export function useIsDark(): boolean {
  return useColorScheme() === 'dark';
}

/** Font family names registered in the root layout. */
export const Fonts = {
  fell: 'IMFellEnglish',
  fellItalic: 'IMFellEnglish-Italic',
  garamond: 'EBGaramond',
  garamondItalic: 'EBGaramond-Italic',
  sans: 'Jost',
  sansMedium: 'Jost-Medium',
} as const;

export const FONT_FILES = {
  [Fonts.fell]: require('@expo-google-fonts/im-fell-english/400Regular/IMFellEnglish_400Regular.ttf'),
  [Fonts.fellItalic]: require('@expo-google-fonts/im-fell-english/400Regular_Italic/IMFellEnglish_400Regular_Italic.ttf'),
  [Fonts.garamond]: require('@expo-google-fonts/eb-garamond/400Regular/EBGaramond_400Regular.ttf'),
  [Fonts.garamondItalic]: require('@expo-google-fonts/eb-garamond/400Regular_Italic/EBGaramond_400Regular_Italic.ttf'),
  [Fonts.sans]: require('@expo-google-fonts/jost/400Regular/Jost_400Regular.ttf'),
  [Fonts.sansMedium]: require('@expo-google-fonts/jost/500Medium/Jost_500Medium.ttf'),
};

export const Space = { xs: 4, s: 8, m: 16, l: 24, xl: 32, xxl: 48 } as const;
