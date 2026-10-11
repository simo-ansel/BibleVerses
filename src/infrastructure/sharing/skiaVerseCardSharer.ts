/**
 * VerseCardSharer that draws the card offscreen with Skia (same shader as the Today screen),
 * writes a PNG to the cache folder and opens the system share sheet.
 */
import {
  FontSlant,
  Skia,
  TextAlign,
  type SkRuntimeEffect,
  type SkTextStyle,
  type SkTypefaceFontProvider,
} from '@shopify/react-native-skia';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Image } from 'react-native';

import { CARD_TEXT_CENTER, cardMetrics } from '@/core/art/cardLayout';
import { flattenUniforms, PAINTING_SKSL, paintingUniforms } from '@/core/art/painting';
import type { VerseCard, VerseCardSharer } from '@/core/ports';

const WIDTH = 1080;
const HEIGHT = 1920;
const WATERMARK = 'BibleVerses';

/** Font files are passed in by the composition root, so this adapter does not own asset paths. */
export interface CardFonts {
  readonly serif: readonly number[];
  readonly sans: readonly number[];
}

interface TextStyle {
  family: 'Serif' | 'Sans';
  size: number;
  color: string;
  leading?: number;
  italic?: boolean;
  align?: TextAlign;
  spacing?: number;
}

export function createSkiaVerseCardSharer(fontModules: CardFonts): VerseCardSharer {
  let fontsPromise: Promise<SkTypefaceFontProvider> | null = null;
  let effect: SkRuntimeEffect | null = null;

  const loadFonts = () => {
    fontsPromise ??= (async () => {
      const provider = Skia.TypefaceFontProvider.Make();
      const register = async (modules: readonly number[], family: string) => {
        for (const module of modules) {
          const data = await Skia.Data.fromURI(Image.resolveAssetSource(module).uri);
          const typeface = Skia.Typeface.MakeFreeTypeFaceFromData(data);
          if (typeface) provider.registerFont(typeface, family);
        }
      };
      await register(fontModules.serif, 'Serif');
      await register(fontModules.sans, 'Sans');
      return provider;
    })().catch((error: unknown) => {
      fontsPromise = null; // let the next share try again
      throw error;
    });
    return fontsPromise;
  };

  const paragraph = (fonts: SkTypefaceFontProvider, text: string, style: TextStyle, width: number) => {
    const textStyle: SkTextStyle = {
      color: Skia.Color(style.color),
      fontFamilies: [style.family],
      fontSize: style.size,
    };
    if (style.leading) textStyle.heightMultiplier = style.leading;
    if (style.spacing) textStyle.letterSpacing = style.spacing;
    if (style.italic) textStyle.fontStyle = { slant: FontSlant.Italic };
    const builder = Skia.ParagraphBuilder.Make({ textAlign: style.align ?? TextAlign.Left, textStyle }, fonts);
    builder.addText(text);
    const result = builder.build();
    result.layout(width);
    return result;
  };

  const render = (card: VerseCard, fonts: SkTypefaceFontProvider) => {
    effect ??= Skia.RuntimeEffect.Make(PAINTING_SKSL);
    const surface = Skia.Surface.MakeOffscreen(WIDTH, HEIGHT) ?? Skia.Surface.Make(WIDTH, HEIGHT);
    if (!effect || !surface) throw new Error('This device could not draw the image.');
    const canvas = surface.getCanvas();

    const paint = Skia.Paint();
    const uniforms = paintingUniforms(card.recipe, WIDTH, HEIGHT, { veilY: CARD_TEXT_CENTER });
    paint.setShader(effect.makeShader(flattenUniforms(uniforms)));
    canvas.drawRect(Skia.XYWHRect(0, 0, WIDTH, HEIGHT), paint);

    const ink = card.recipe.palette.ink;
    const metrics = cardMetrics(card.text.length, WIDTH);
    const width = WIDTH - 2 * metrics.margin;
    const verse = paragraph(
      fonts,
      card.text,
      { family: 'Serif', size: metrics.verseSize, color: ink, leading: metrics.leading },
      width,
    );
    const reference = paragraph(
      fonts,
      card.reference,
      { family: 'Serif', size: metrics.refSize, color: ink, italic: true },
      width,
    );
    const gap = metrics.refSize * 1.1;
    const top = HEIGHT * CARD_TEXT_CENTER - (verse.getHeight() + gap + reference.getHeight()) / 2;
    verse.paint(canvas, metrics.margin, top);
    reference.paint(canvas, metrics.margin, top + verse.getHeight() + gap);

    const watermark = paragraph(
      fonts,
      WATERMARK,
      { family: 'Sans', size: 26, color: ink, align: TextAlign.Center, spacing: 0.6 },
      WIDTH,
    );
    watermark.paint(canvas, 0, HEIGHT - 112);

    surface.flush();
    return surface.makeImageSnapshot();
  };

  return {
    async share(card) {
      const image = render(card, await loadFonts());
      const file = new File(Paths.cache, `verse-${Date.now()}.png`);
      file.write(image.encodeToBytes());
      await Sharing.shareAsync(file.uri, { mimeType: 'image/png', dialogTitle: card.reference });
    },
  };
}
