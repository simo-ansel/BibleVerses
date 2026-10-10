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

  /**
   * The mark: a Celtic cross (cross + ring of eternity) with flared ends and a round boss
   * at the crossing, from which a four-pointed star of light is cut.
   * (x, y) is the centre of its bounding box; s is the scale (the box is 0.5s wide, 0.64s tall).
   */
  function markPath(x: number, y: number, s: number) {
    const op = (a: any, b: any, o: any) => CK.Path.MakeFromOp(a, b, o)!;
    const shape = (draw: (b: any) => void) => {
      const b = new CK.PathBuilder();
      draw(b);
      const path = b.snapshot();
      b.delete();
      return path;
    };
    const circle = (r: number) => shape((b) => b.addCircle(cx, cy, r));
    const cx = x;
    const cy = y - 0.1 * s;
    const t = 0.085 * s;
    const flare = 1.45;

    const arms = shape((b) => {
      const arm = (dx: number, dy: number, len: number) => {
        const px = -dy;
        const py = dx;
        const h0 = t / 2;
        const h1 = (t * flare) / 2;
        const ex = cx + dx * len;
        const ey = cy + dy * len;
        const mx = cx + dx * len * 0.6;
        const my = cy + dy * len * 0.6;
        b.moveTo(cx + px * h0, cy + py * h0);
        b.quadTo(mx + px * h0 * 0.98, my + py * h0 * 0.98, ex + px * h1, ey + py * h1);
        b.lineTo(ex - px * h1, ey - py * h1);
        b.quadTo(mx - px * h0 * 0.98, my - py * h0 * 0.98, cx - px * h0, cy - py * h0);
        b.close();
      };
      arm(0, -1, 0.22 * s);
      arm(1, 0, 0.25 * s);
      arm(0, 1, 0.42 * s);
      arm(-1, 0, 0.25 * s);
      b.addRect(CK.XYWHRect(cx - t / 2, cy - t / 2, t, t));
    });
    const R = 0.165 * s;
    const w = 0.04 * s;
    const ring = op(circle(R + w / 2), circle(R - w / 2), CK.PathOp.Difference);
    let mark = op(op(arms, ring, CK.PathOp.Union), circle(t * 0.95), CK.PathOp.Union);

    const k = t * 0.1;
    const r = t * 0.78;
    const star = shape((b) => {
      b.moveTo(cx, cy - r);
      b.quadTo(cx + k, cy - k, cx + r, cy);
      b.quadTo(cx + k, cy + k, cx, cy + r);
      b.quadTo(cx - k, cy + k, cx - r, cy);
      b.quadTo(cx - k, cy - k, cx, cy - r);
      b.close();
    });
    mark = op(mark, star, CK.PathOp.Difference);
    return mark;
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

  if (want('icon')) {
    const s = surface(1024, 1024);
    const c = s.getCanvas();
    painting(c, ICON_RECIPE, 1024, 1024);
    c.drawPath(markPath(512, 512, 1000), fill(CREAM));
    save(s, path.join(OUT_IMG, 'icon.png'));
  }
  if (want('adaptive')) {
    const bg = surface(1024, 1024);
    painting(bg.getCanvas(), ICON_RECIPE, 1024, 1024);
    save(bg, path.join(OUT_IMG, 'android-icon-background.png'));

    const fg = surface(1024, 1024);
    // Android masks the outer third of an adaptive icon: keep the mark inside the safe circle.
    fg.getCanvas().drawPath(markPath(512, 512, 860), fill(CREAM));
    save(fg, path.join(OUT_IMG, 'android-icon-foreground.png'));

    const mono = surface(1024, 1024);
    mono.getCanvas().drawPath(markPath(512, 512, 860), fill('#FFFFFF'));
    save(mono, path.join(OUT_IMG, 'android-icon-monochrome.png'));
  }
  if (want('splash')) {
    for (const [file, hex] of [
      ['splash-icon.png', LAPIS_INK],
      ['splash-icon-dark.png', CREAM],
    ] as const) {
      const s = surface(512, 512);
      s.getCanvas().drawPath(markPath(256, 256, 740), fill(hex));
      save(s, path.join(OUT_IMG, file));
    }
  }
  if (want('notification')) {
    const s = surface(96, 96);
    s.getCanvas().drawPath(markPath(48, 48, 138), fill('#FFFFFF'));
    save(s, path.join(OUT_IMG, 'notification-icon.png'));
  }
  if (want('favicon')) {
    const s = surface(48, 48);
    s.getCanvas().drawRect(CK.XYWHRect(0, 0, 48, 48), fill(lapis.c1));
    s.getCanvas().drawPath(markPath(24, 24, 62), fill(CREAM));
    save(s, path.join(OUT_IMG, 'favicon.png'));
  }
  if (want('store-icon')) {
    // Play Store listing icon: 512×512, full square (Google applies its own mask).
    const s = surface(512, 512);
    const c = s.getCanvas();
    painting(c, ICON_RECIPE, 512, 512);
    c.drawPath(markPath(256, 256, 500), fill(CREAM));
    save(s, path.join(OUT_STORE, 'play-icon-512.png'));
  }
  if (want('feature')) {
    // Play Store feature graphic: 1024×500.
    const W = 1024;
    const H = 500;
    const s = surface(W, H);
    const c = s.getCanvas();
    painting(c, { ...ICON_RECIPE, seed: 12.7, scale: 1.1, angle: 2.2 }, W, H, 0.5, 0.5);
    c.drawPath(markPath(160, 236, 330), fill(CREAM));
    text(c, 'BibleVerses', { family: 'Fell', size: 92, color: CREAM, x: 292, y: 150, width: 700 });
    text(c, 'A verse and a painting for every day', { family: 'Fell', size: 34, color: CREAM, italic: true, x: 296, y: 262, width: 700 });
    save(s, path.join(OUT_STORE, 'feature-graphic-1024x500.png'));
  }
}

main();
