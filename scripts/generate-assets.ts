/**
 * Draws the launcher icons, splash images, notification icon and Play Store graphics with the
 * same painting shader the app uses, rendered on the CPU with CanvasKit (slow but exact).
 *
 *   npm run assets:generate               everything at full size (a few minutes)
 *   npm run assets:generate -- icon       only some targets: icon adaptive splash notification store-icon feature
 *   SCALE=0.25 npm run assets:generate    quick low-resolution preview
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import type CanvasKitInit from 'canvaskit-wasm';
import type { Canvas, CanvasKit, Path, PathBuilder, Surface } from 'canvaskit-wasm';

import { flattenUniforms, PAINTING_SKSL, paintingUniforms, type PaintingRecipe } from '../src/core/art/painting';
import { PALETTES } from '../src/core/art/palettes';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const IMAGES = path.join(ROOT, 'assets/images');
const STORE = path.join(ROOT, 'store');
const FONTS = path.join(ROOT, 'node_modules/@expo-google-fonts');
const SCALE = Number(process.env.SCALE ?? 1);

const CREAM = '#F3EEDC';
const LAPIS_INK = '#2B3F86';
const lapis = PALETTES.find((palette) => palette.name === 'Lapis') ?? PALETTES[0];
const ICON_RECIPE: PaintingRecipe = { palette: lapis, seed: 3.1, warp: 3.4, scale: 0.9, angle: 0.6, layers: 5 };

type Target = 'icon' | 'adaptive' | 'splash' | 'notification' | 'store-icon' | 'feature';

async function loadCanvasKit(): Promise<CanvasKit> {
  // The "full" build includes paragraph layout; the package's typings describe the same API.
  const init = require('canvaskit-wasm/bin/full/canvaskit.js') as typeof CanvasKitInit;
  return init({ locateFile: (file: string) => require.resolve(`canvaskit-wasm/bin/full/${file}`) });
}

async function main(targets: Set<Target> | null) {
  const CK = await loadCanvasKit();
  const effect = CK.RuntimeEffect.Make(PAINTING_SKSL, (error) => console.error(error));
  if (!effect) throw new Error('The painting shader did not compile.');

  const fonts = CK.TypefaceFontProvider.Make();
  fonts.registerFont(readFileSync(`${FONTS}/im-fell-english/400Regular/IMFellEnglish_400Regular.ttf`), 'Fell');
  fonts.registerFont(
    readFileSync(`${FONTS}/im-fell-english/400Regular_Italic/IMFellEnglish_400Regular_Italic.ttf`),
    'Fell',
  );

  const want = (target: Target) => targets === null || targets.has(target);

  const shape = (draw: (builder: PathBuilder) => void): Path => {
    const builder = new CK.PathBuilder();
    draw(builder);
    const result = builder.snapshot();
    builder.delete();
    return result;
  };

  const combine = (a: Path, b: Path, op: 'union' | 'difference'): Path => {
    const result = CK.Path.MakeFromOp(a, b, op === 'union' ? CK.PathOp.Union : CK.PathOp.Difference);
    if (!result) throw new Error('Path operation failed.');
    return result;
  };

  /**
   * The mark: a Celtic cross (cross and ring of eternity) with flared ends and a round boss at the
   * crossing, from which a four-pointed star of light is cut.
   * (x, y) is the centre of its bounding box; s is the scale (the box is 0.5s wide and 0.64s tall).
   */
  const mark = (x: number, y: number, s: number): Path => {
    const cx = x;
    const cy = y - 0.1 * s;
    const thickness = 0.085 * s;
    const flare = 1.45;
    const circle = (radius: number) => shape((b) => b.addCircle(cx, cy, radius));

    const arms = shape((b) => {
      const arm = (dx: number, dy: number, length: number) => {
        const [px, py] = [-dy, dx];
        const inner = thickness / 2;
        const outer = (thickness * flare) / 2;
        const [ex, ey] = [cx + dx * length, cy + dy * length];
        const [mx, my] = [cx + dx * length * 0.6, cy + dy * length * 0.6];
        b.moveTo(cx + px * inner, cy + py * inner);
        b.quadTo(mx + px * inner * 0.98, my + py * inner * 0.98, ex + px * outer, ey + py * outer);
        b.lineTo(ex - px * outer, ey - py * outer);
        b.quadTo(mx - px * inner * 0.98, my - py * inner * 0.98, cx - px * inner, cy - py * inner);
        b.close();
      };
      arm(0, -1, 0.22 * s);
      arm(1, 0, 0.25 * s);
      arm(0, 1, 0.42 * s);
      arm(-1, 0, 0.25 * s);
      b.addRect(CK.XYWHRect(cx - thickness / 2, cy - thickness / 2, thickness, thickness));
    });

    const ringRadius = 0.165 * s;
    const ringWidth = 0.04 * s;
    const ring = combine(circle(ringRadius + ringWidth / 2), circle(ringRadius - ringWidth / 2), 'difference');
    const body = combine(combine(arms, ring, 'union'), circle(thickness * 0.95), 'union');

    const k = thickness * 0.1;
    const r = thickness * 0.78;
    const star = shape((b) => {
      b.moveTo(cx, cy - r);
      b.quadTo(cx + k, cy - k, cx + r, cy);
      b.quadTo(cx + k, cy + k, cx, cy + r);
      b.quadTo(cx - k, cy + k, cx - r, cy);
      b.quadTo(cx - k, cy - k, cx, cy - r);
      b.close();
    });
    return combine(body, star, 'difference');
  };

  const surface = (width: number, height: number): Surface => {
    const result = CK.MakeSurface(Math.round(width * SCALE), Math.round(height * SCALE));
    if (!result) throw new Error('Could not create a drawing surface.');
    result.getCanvas().scale(SCALE, SCALE);
    return result;
  };

  const fill = (hex: string) => {
    const paint = new CK.Paint();
    paint.setAntiAlias(true);
    paint.setColor(CK.parseColorString(hex));
    return paint;
  };

  const painting = (canvas: Canvas, recipe: PaintingRecipe, width: number, height: number, veil = 0) => {
    const paint = new CK.Paint();
    const uniforms = paintingUniforms(recipe, width * SCALE, height * SCALE, { veil, veilY: 0.5, veilH: 0.3 });
    const shader = effect.makeShader(flattenUniforms(uniforms));
    paint.setShader(shader);
    canvas.save();
    canvas.scale(1 / SCALE, 1 / SCALE);
    canvas.drawRect(CK.XYWHRect(0, 0, width * SCALE, height * SCALE), paint);
    canvas.restore();
    paint.delete();
    shader.delete();
  };

  const text = (canvas: Canvas, content: string, o: { size: number; italic?: boolean; x: number; y: number }) => {
    const builder = CK.ParagraphBuilder.MakeFromFontProvider(
      new CK.ParagraphStyle({
        textStyle: {
          color: CK.parseColorString(CREAM),
          fontFamilies: ['Fell'],
          fontSize: o.size,
          fontStyle: o.italic ? { slant: CK.FontSlant.Italic } : undefined,
        },
        textAlign: CK.TextAlign.Left,
      }),
      fonts,
    );
    builder.addText(content);
    const paragraph = builder.build();
    paragraph.layout(700);
    canvas.drawParagraph(paragraph, o.x, o.y);
  };

  const save = (drawn: Surface, file: string) => {
    mkdirSync(path.dirname(file), { recursive: true });
    const bytes = drawn.makeImageSnapshot().encodeToBytes();
    if (!bytes) throw new Error(`Could not encode ${file}.`);
    writeFileSync(file, bytes);
    drawn.delete();
    console.log(`wrote ${path.relative(ROOT, file)}`);
  };

  if (want('icon')) {
    const s = surface(1024, 1024);
    painting(s.getCanvas(), ICON_RECIPE, 1024, 1024);
    s.getCanvas().drawPath(mark(512, 512, 1000), fill(CREAM));
    save(s, path.join(IMAGES, 'icon.png'));
  }
  if (want('adaptive')) {
    const background = surface(1024, 1024);
    painting(background.getCanvas(), ICON_RECIPE, 1024, 1024);
    save(background, path.join(IMAGES, 'android-icon-background.png'));
    // Android masks the outer third of adaptive icons, so the mark stays inside the safe circle.
    const foreground = surface(1024, 1024);
    foreground.getCanvas().drawPath(mark(512, 512, 860), fill(CREAM));
    save(foreground, path.join(IMAGES, 'android-icon-foreground.png'));
    const monochrome = surface(1024, 1024);
    monochrome.getCanvas().drawPath(mark(512, 512, 860), fill('#FFFFFF'));
    save(monochrome, path.join(IMAGES, 'android-icon-monochrome.png'));
  }
  if (want('splash')) {
    for (const [file, hex] of [
      ['splash-icon.png', LAPIS_INK],
      ['splash-icon-dark.png', CREAM],
    ] as const) {
      const s = surface(512, 512);
      s.getCanvas().drawPath(mark(256, 256, 740), fill(hex));
      save(s, path.join(IMAGES, file));
    }
  }
  if (want('notification')) {
    const s = surface(96, 96);
    s.getCanvas().drawPath(mark(48, 48, 138), fill('#FFFFFF'));
    save(s, path.join(IMAGES, 'notification-icon.png'));
  }
  if (want('store-icon')) {
    // Play Store listing icon: a full 512×512 square; Google applies its own mask.
    const s = surface(512, 512);
    painting(s.getCanvas(), ICON_RECIPE, 512, 512);
    s.getCanvas().drawPath(mark(256, 256, 500), fill(CREAM));
    save(s, path.join(STORE, 'play-icon-512.png'));
  }
  if (want('feature')) {
    // Play Store feature graphic: 1024×500.
    const s = surface(1024, 500);
    painting(s.getCanvas(), { ...ICON_RECIPE, seed: 12.7, scale: 1.1, angle: 2.2 }, 1024, 500, 0.5);
    s.getCanvas().drawPath(mark(160, 236, 330), fill(CREAM));
    text(s.getCanvas(), 'BibleVerses', { size: 92, x: 292, y: 150 });
    text(s.getCanvas(), 'A verse and a painting for every day', { size: 34, italic: true, x: 296, y: 262 });
    save(s, path.join(STORE, 'feature-graphic-1024x500.png'));
  }
}

const args = process.argv.slice(2) as Target[];
main(args.length ? new Set(args) : null).catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
