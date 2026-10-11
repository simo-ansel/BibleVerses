/**
 * Pigment palettes for the daily paintings.
 * c0 → c3 run from the dominant wash to the accent; `paper` is the ground the paint
 * develops from (and the colour of the veil behind the text); `ink` is the text colour.
 * Light palettes take dark ink, dark palettes take light ink.
 */
export interface Palette {
  name: string;
  dark: boolean;
  c0: string;
  c1: string;
  c2: string;
  c3: string;
  paper: string;
  ink: string;
}

export const PALETTES: Palette[] = [
  {
    name: 'Lapis',
    dark: true,
    c0: '#14204A',
    c1: '#23408E',
    c2: '#3E6CC0',
    c3: '#D9A94A',
    paper: '#0F1630',
    ink: '#F3EEDC',
  },
  {
    name: 'Dawn',
    dark: false,
    c0: '#F7D9C4',
    c1: '#EFA8A0',
    c2: '#B9A2D6',
    c3: '#9CC3E6',
    paper: '#FBF3EC',
    ink: '#2A2238',
  },
  {
    name: 'Olive grove',
    dark: false,
    c0: '#E5E3C9',
    c1: '#B7BF8E',
    c2: '#7E8F57',
    c3: '#D7B25C',
    paper: '#F4F2E3',
    ink: '#263022',
  },
  {
    name: 'Verdigris',
    dark: true,
    c0: '#0E2E2C',
    c1: '#1F5E57',
    c2: '#4E9E8E',
    c3: '#A7D8C6',
    paper: '#0B2221',
    ink: '#EAF5EE',
  },
  {
    name: 'Rose madder',
    dark: false,
    c0: '#F6DCE0',
    c1: '#E3A1AE',
    c2: '#B9586E',
    c3: '#F2C9A8',
    paper: '#FBF1F1',
    ink: '#3A1A24',
  },
  {
    name: 'Vespers',
    dark: true,
    c0: '#1B1638',
    c1: '#4A2C6E',
    c2: '#A04C7A',
    c3: '#F08A5D',
    paper: '#140F2A',
    ink: '#F7E9E4',
  },
  {
    name: 'Sandstone',
    dark: false,
    c0: '#F1E2C6',
    c1: '#E1BD8A',
    c2: '#C78B5E',
    c3: '#8DA9B8',
    paper: '#F8F0E1',
    ink: '#3A2A1C',
  },
  {
    name: 'Sea of glass',
    dark: false,
    c0: '#E3F1F1',
    c1: '#A9D3D6',
    c2: '#6FA7BD',
    c3: '#E9E3F0',
    paper: '#F3F9F9',
    ink: '#17323D',
  },
  {
    name: 'Ember',
    dark: true,
    c0: '#220B0B',
    c1: '#6E1A16',
    c2: '#C2491E',
    c3: '#F2B04A',
    paper: '#1A0909',
    ink: '#FBEBD7',
  },
  {
    name: 'Hyssop',
    dark: false,
    c0: '#ECE6F2',
    c1: '#C6B9DD',
    c2: '#9FB49A',
    c3: '#F3E7C6',
    paper: '#F7F4F8',
    ink: '#2B2737',
  },
  {
    name: 'Night watch',
    dark: true,
    c0: '#070D1C',
    c1: '#13284A',
    c2: '#2C5C78',
    c3: '#C9D6E3',
    paper: '#060B17',
    ink: '#EEF2F8',
  },
  {
    name: 'Pomegranate',
    dark: true,
    c0: '#2A0A1A',
    c1: '#7A1734',
    c2: '#C23B4E',
    c3: '#E8B07A',
    paper: '#210815',
    ink: '#FBE9E6',
  },
  {
    name: 'Myrrh',
    dark: false,
    c0: '#F5E6CC',
    c1: '#E2B872',
    c2: '#B4783C',
    c3: '#7C8B6A',
    paper: '#FAF2E2',
    ink: '#33230F',
  },
  {
    name: 'Snow of Lebanon',
    dark: false,
    c0: '#F4F7FA',
    c1: '#D5E2EC',
    c2: '#9DB7C9',
    c3: '#5E7F6E',
    paper: '#FAFCFD',
    ink: '#1C2B33',
  },
  {
    name: 'Iris',
    dark: false,
    c0: '#E7ECF8',
    c1: '#AFC0EA',
    c2: '#6F86D1',
    c3: '#F4D58A',
    paper: '#F5F7FC',
    ink: '#1E2546',
  },
  {
    name: 'Cedar',
    dark: true,
    c0: '#14170F',
    c1: '#2F3B22',
    c2: '#6B7A3E',
    c3: '#D7C27A',
    paper: '#10130C',
    ink: '#F2EEDC',
  },
];

export function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

export function withAlpha(hex: string, alpha: number): string {
  const a = Math.round(Math.max(0, Math.min(1, alpha)) * 255)
    .toString(16)
    .padStart(2, '0');
  return `${hex}${a}`;
}
