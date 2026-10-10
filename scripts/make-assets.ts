/**
 * Draws the app icon, splash, notification icon and Play Store graphics with the
 * same painting shader the app uses (CanvasKit, CPU — slow but exact).
 *
 *   npx tsx scripts/make-assets.ts            # everything, full size (a few minutes)
 *   SCALE=0.25 npx tsx scripts/make-assets.ts # quick low-resolution preview
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

import { PALETTES } from '../src/art/palettes';
import { flattenUniforms, PAINTING_SKSL, paintingUniforms, type PaintingRecipe } from '../src/art/painting';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const OUT_IMG = path.join(ROOT, 'assets/images');
const OUT_STORE = path.join(ROOT, 'store');
const SCALE = Number(process.env.SCALE || 1);
const FONT = path.join(ROOT, 'node_modules/@expo-google-fonts');

const lapis = PALETTES.find((p) => p.name === 'Lapis')!;
const ICON_RECIPE: PaintingRecipe = { palette: lapis, seed: 3.1, warp: 3.4, scale: 0.9, angle: 0.6, layers: 5 };
const CREAM = '#F3EEDC';
const LAPIS_INK = '#2B3F86';

async function main() {
  const CK = await require('canvaskit-wasm/bin/full/canvaskit.js')({
    locateFile: (f: string) => require.resolve('canvaskit-wasm/bin/full/' + f),
  });
  const effect = CK.RuntimeEffect.Make(PAINTING_SKSL, (e: string) => console.error(e));
  if (!effect) throw new Error('shader did not compile');

  const fonts = CK.TypefaceFontProvider.Make();
  fonts.registerFont(fs.readFileSync(`${FONT}/im-fell-english/400Regular/IMFellEnglish_400Regular.ttf`), 'Fell');
  fonts.registerFont(fs.readFileSync(`${FONT}/im-fell-english/400Regular_Italic/IMFellEnglish_400Regular_Italic.ttf`), 'Fell');
  fonts.registerFont(fs.readFileSync(`${FONT}/jost/400Regular/Jost_400Regular.ttf`), 'Jost');

  const color = (hex: string, a = 1) => {
    const c = CK.parseColorString(hex);
    c[3] = a;
    return c;
  };

  /** Lancet window with a four-pointed star of light cut out of it. Box is the arch's bounds. */
  function markPath(x: number, y: number, w: number, h: number) {
    const r = w / 2;
    const arch = new CK.PathBuilder();
    arch.moveTo(x, y + h);
    arch.lineTo(x, y + r);
    arch.arcToTangent(x, y, x + r, y, r);
    arch.arcToTangent(x + w, y, x + w, y + r, r);
    arch.lineTo(x + w, y + h);
    arch.close();
    const cx = x + r;
    const cy = y + h * 0.43;
    const R = w * 0.3;
    const k = w * 0.045;
    const star = new CK.PathBuilder();
    star.moveTo(cx, cy - R);
    star.quadTo(cx + k, cy - k, cx + R, cy);
    star.quadTo(cx + k, cy + k, cx, cy + R);
    star.quadTo(cx - k, cy + k, cx - R, cy);
    star.quadTo(cx - k, cy - k, cx, cy - R);
    star.close();
    const result = CK.Path.MakeFromOp(arch.snapshot(), star.snapshot(), CK.PathOp.Difference);
    arch.delete();
    star.delete();
    return result;
  }

  function surface(w: number, h: number) {
    const s = CK.MakeSurface(Math.round(w * SCALE), Math.round(h * SCALE));
    if (!s) throw new Error('surface');
    s.getCanvas().scale(SCALE, SCALE);
    return s;
  }

  function painting(canvas: any, recipe: PaintingRecipe, w: number, h: number, veil = 0, veilY = 0.5) {
    const paint = new CK.Paint();
    const shader = effect.makeShader(
      flattenUniforms(paintingUniforms(recipe, w * SCALE, h * SCALE, { veil, veilY, veilH: 0.3 })),
    );
    paint.setShader(shader);
    canvas.save();
    canvas.scale(1 / SCALE, 1 / SCALE);
    canvas.drawRect(CK.XYWHRect(0, 0, w * SCALE, h * SCALE), paint);
    canvas.restore();
    paint.delete();
    shader.delete();
  }

  function fill(hex: string, a = 1) {
    const p = new CK.Paint();
    p.setAntiAlias(true);
    p.setColor(color(hex, a));
    return p;
  }

  function save(s: any, file: string) {
    const bytes = s.makeImageSnapshot().encodeToBytes();
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, bytes);
    s.delete();
    console.log('wrote', path.relative(ROOT, file));
  }

  function text(canvas: any, str: string, o: { family: string; size: number; color: string; italic?: boolean; x: number; y: number; width: number; spacing?: number }) {
    const b = CK.ParagraphBuilder.MakeFromFontProvider(
      new CK.ParagraphStyle({
        textStyle: {
          color: color(o.color),
          fontFamilies: [o.family],
          fontSize: o.size,
          letterSpacing: o.spacing ?? 0,
          fontStyle: o.italic ? { slant: CK.FontSlant.Italic } : undefined,
        },
        textAlign: CK.TextAlign.Left,
      }),
      fonts,
    );
    b.addText(str);
    const p = b.build();
    p.layout(o.width);
    canvas.drawParagraph(p, o.x, o.y);
    return p.getHeight();
  }

  const only = process.argv.slice(2);
  const want = (name: string) => only.length === 0 || only.includes(name);

  // Adaptive icon: the mark sits inside Android's 66% safe zone.
  const markBox = (size: number, frac = 0.36) => {
    const w = size * frac;
    const h = w * 1.36;
    return { x: (size - w) / 2, y: (size - h) / 2 + size * 0.01, w, h };
  };

  if (want('icon')) {
    const s = surface(1024, 1024);
    const c = s.getCanvas();
    painting(c, ICON_RECIPE, 1024, 1024);
    const m = markBox(1024, 0.4);
    c.drawPath(markPath(m.x, m.y, m.w, m.h), fill(CREAM));
    save(s, path.join(OUT_IMG, 'icon.png'));
  }
  if (want('adaptive')) {
    const bg = surface(1024, 1024);
    painting(bg.getCanvas(), ICON_RECIPE, 1024, 1024);
    save(bg, path.join(OUT_IMG, 'android-icon-background.png'));

    const fg = surface(1024, 1024);
    const m = markBox(1024);
    fg.getCanvas().drawPath(markPath(m.x, m.y, m.w, m.h), fill(CREAM));
    save(fg, path.join(OUT_IMG, 'android-icon-foreground.png'));

    const mono = surface(1024, 1024);
    mono.getCanvas().drawPath(markPath(m.x, m.y, m.w, m.h), fill('#FFFFFF'));
    save(mono, path.join(OUT_IMG, 'android-icon-monochrome.png'));
  }
  if (want('splash')) {
    for (const [file, hex] of [
      ['splash-icon.png', LAPIS_INK],
      ['splash-icon-dark.png', CREAM],
    ] as const) {
      const s = surface(512, 512);
      const m = markBox(512, 0.62);
      s.getCanvas().drawPath(markPath(m.x, m.y, m.w, m.h), fill(hex));
      save(s, path.join(OUT_IMG, file));
    }
  }
  if (want('notification')) {
    const s = surface(96, 96);
    const m = markBox(96, 0.56);
    s.getCanvas().drawPath(markPath(m.x, m.y, m.w, m.h), fill('#FFFFFF'));
    save(s, path.join(OUT_IMG, 'notification-icon.png'));
  }
  if (want('favicon')) {
    const s = surface(48, 48);
    s.getCanvas().drawRect(CK.XYWHRect(0, 0, 48, 48), fill(lapis.c1));
    const m = markBox(48, 0.5);
    s.getCanvas().drawPath(markPath(m.x, m.y, m.w, m.h), fill(CREAM));
    save(s, path.join(OUT_IMG, 'favicon.png'));
  }
  if (want('store-icon')) {
    // Play Store listing icon: 512×512, full square (Google applies its own mask).
    const s = surface(512, 512);
    const c = s.getCanvas();
    painting(c, ICON_RECIPE, 512, 512);
    const m = markBox(512, 0.4);
    c.drawPath(markPath(m.x, m.y, m.w, m.h), fill(CREAM));
    save(s, path.join(OUT_STORE, 'play-icon-512.png'));
  }
  if (want('feature')) {
    // Play Store feature graphic: 1024×500.
    const W = 1024;
    const H = 500;
    const s = surface(W, H);
    const c = s.getCanvas();
    painting(c, { ...ICON_RECIPE, seed: 12.7, scale: 1.1, angle: 2.2 }, W, H, 0.5, 0.5);
    const m = { x: 92, y: 150, w: 120, h: 163 };
    c.drawPath(markPath(m.x, m.y, m.w, m.h), fill(CREAM));
    text(c, 'BibleVerses', { family: 'Fell', size: 92, color: CREAM, x: 262, y: 150, width: 700 });
    text(c, 'A verse and a painting for every day', { family: 'Fell', size: 34, color: CREAM, italic: true, x: 266, y: 262, width: 700 });
    save(s, path.join(OUT_STORE, 'feature-graphic-1024x500.png'));
  }
}

main();
