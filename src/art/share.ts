/**
 * Renders a verse as a 1080×1920 image (story format) with its painting, then opens
 * the Android share sheet. Everything is drawn offscreen with Skia, so the image
 * matches the Today screen and does not depend on what is on screen.
 */
import { FontSlant, Skia, TextAlign, type SkTextStyle, type SkTypefaceFontProvider } from '@shopify/react-native-skia';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { cardMetrics, CARD_TEXT_CENTER } from './card';
import { flattenUniforms, PAINTING_SKSL, paintingUniforms, type PaintingRecipe } from './painting';

const W = 1080;
const H = 1920;

let effect: ReturnType<typeof Skia.RuntimeEffect.Make> | undefined;
export function paintingEffect() {
  if (effect === undefined) effect = Skia.RuntimeEffect.Make(PAINTING_SKSL);
  return effect;
}

export interface ShareCard {
  text: string;
  reference: string;
  provenance: string | null;
  recipe: PaintingRecipe;
}

function paragraph(
  fonts: SkTypefaceFontProvider,
  text: string,
  opts: { family: string; size: number; color: string; leading?: number; italic?: boolean; align?: TextAlign; spacing?: number },
  width: number,
) {
  const textStyle: SkTextStyle = { color: Skia.Color(opts.color), fontFamilies: [opts.family], fontSize: opts.size };
  if (opts.leading) textStyle.heightMultiplier = opts.leading;
  if (opts.spacing) textStyle.letterSpacing = opts.spacing;
  if (opts.italic) textStyle.fontStyle = { slant: FontSlant.Italic };
  const builder = Skia.ParagraphBuilder.Make({ textAlign: opts.align ?? TextAlign.Left, textStyle }, fonts);
  builder.addText(text);
  const p = builder.build();
  p.layout(width);
  return p;
}

export function renderCardPng(card: ShareCard, fonts: SkTypefaceFontProvider) {
  const fx = paintingEffect();
  const surface = Skia.Surface.MakeOffscreen(W, H) ?? Skia.Surface.Make(W, H);
  if (!fx || !surface) throw new Error('Could not draw the image on this device.');
  const canvas = surface.getCanvas();

  const paint = Skia.Paint();
  paint.setShader(fx.makeShader(flattenUniforms(paintingUniforms(card.recipe, W, H, { veilY: CARD_TEXT_CENTER }))));
  canvas.drawRect(Skia.XYWHRect(0, 0, W, H), paint);

  const ink = card.recipe.palette.ink;
  const m = cardMetrics(card.text.length, W);
  const width = W - 2 * m.margin;
  const verse = paragraph(fonts, card.text, { family: 'Fell', size: m.verseSize, color: ink, leading: m.leading }, width);
  const refText = card.provenance ? `${card.reference}\n${card.provenance}` : card.reference;
  const ref = paragraph(fonts, refText, { family: 'Fell', size: m.refSize, color: ink, italic: true, leading: 1.3 }, width);
  const gap = m.refSize * 1.1;
  const blockH = verse.getHeight() + gap + ref.getHeight();
  const top = H * CARD_TEXT_CENTER - blockH / 2;
  verse.paint(canvas, m.margin, top);
  ref.paint(canvas, m.margin, top + verse.getHeight() + gap);

  const mark = paragraph(fonts, 'BibleVerses', { family: 'Jost', size: 26, color: ink, align: TextAlign.Center, spacing: 0.6 }, W);
  mark.paint(canvas, 0, H - 112);

  surface.flush();
  return surface.makeImageSnapshot();
}

export async function shareCard(card: ShareCard, fonts: SkTypefaceFontProvider) {
  const image = renderCardPng(card, fonts);
  const file = new File(Paths.cache, `verse-${Date.now()}.png`);
  try {
    file.write(image.encodeToBytes());
  } catch {
    file.write(image.encodeToBase64(), { encoding: 'base64' });
  }
  await Sharing.shareAsync(file.uri, { mimeType: 'image/png', dialogTitle: card.reference });
}
