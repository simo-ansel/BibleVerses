/**
 * The daily painting: a watercolour-like abstract built from domain-warped noise.
 * Pure data + SkSL source, shared by the app (React Native Skia) and by the
 * preview/asset scripts (CanvasKit in Node), so both draw exactly the same picture.
 */
import { hexToRgb, PALETTES, type Palette } from './palettes';

export const PAINTING_SKSL = `
uniform float2 uSize;
uniform float uSeed;
uniform float uDevelop;
uniform float3 uC0;
uniform float3 uC1;
uniform float3 uC2;
uniform float3 uC3;
uniform float3 uPaper;
uniform float uWarp;
uniform float uScale;
uniform float uAngle;
uniform float uLayers;
uniform float uVeil;
uniform float uVeilY;
uniform float uVeilH;

float hash(float2 p) {
  p = fract(p * float2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise(float2 p) {
  float2 i = floor(p);
  float2 f = fract(p);
  float2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + float2(1.0, 0.0)), u.x),
             mix(hash(i + float2(0.0, 1.0)), hash(i + float2(1.0, 1.0)), u.x), u.y);
}

float fbm(float2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p = float2(1.6 * p.x + 1.2 * p.y, -1.2 * p.x + 1.6 * p.y) + 3.1;
    a *= 0.5;
  }
  return v;
}

float3 ramp(float t) {
  t = clamp(t, 0.0, 1.0) * 3.0;
  if (t < 1.0) return mix(uC0, uC1, smoothstep(0.0, 1.0, t));
  if (t < 2.0) return mix(uC1, uC2, smoothstep(0.0, 1.0, t - 1.0));
  return mix(uC2, uC3, smoothstep(0.0, 1.0, t - 2.0));
}

half4 main(float2 fc) {
  float2 uv = fc / uSize.y;
  float ca = cos(uAngle);
  float sa = sin(uAngle);
  float2 p = float2(ca * uv.x - sa * uv.y, sa * uv.x + ca * uv.y) * uScale;
  p += float2(uSeed * 0.731, uSeed * 0.379);

  float2 q = float2(fbm(p), fbm(p + float2(5.2, 1.3)));
  float2 r = float2(fbm(p + uWarp * q + float2(1.7, 9.2)), fbm(p + uWarp * q + float2(8.3, 2.8)));
  float f = fbm(p + uWarp * r);

  // Washes: the field is split into a few soft-edged layers, like glazes of watercolour.
  float fl = clamp((f - 0.18) * 1.6, 0.0, 0.999) * uLayers;
  float k = floor(fl);
  float fr = fract(fl);
  float wash = (k + smoothstep(0.30, 0.70, fr)) / uLayers;
  float3 col = ramp(wash);

  // Accent pigment blooming where the second warp is strong.
  float bloom = smoothstep(0.62, 0.86, r.x * 0.6 + length(q) * 0.5);
  col = mix(col, uC3, bloom * 0.55);

  // Pigment gathers at the edge of each wash.
  float rim = smoothstep(0.22, 0.34, fr) * (1.0 - smoothstep(0.34, 0.48, fr));
  col *= 1.0 - 0.09 * rim;

  // Granulation and paper tooth, sized to the picture so they look the same at any resolution.
  float2 g = fc / uSize.y * 1600.0;
  float gran = noise(g * 0.21 + r * 13.0) - 0.5;
  float tooth = noise(g * 0.85) - 0.5;
  col += gran * 0.045 + tooth * 0.03;

  // A quiet veil behind the text so it always reads.
  float dy = (fc.y / uSize.y - uVeilY) / uVeilH;
  float band = exp(-dy * dy);
  col = mix(col, uPaper, band * uVeil);

  // Calm the very top and bottom, where the date and the tab bar sit.
  float yy = fc.y / uSize.y;
  col = mix(col, uPaper, (smoothstep(0.84, 1.0, yy) * 0.45 + smoothstep(0.10, 0.0, yy) * 0.35) * uVeil);

  // Soft vignette.
  float2 c = fc / uSize - 0.5;
  col = mix(col, uPaper, smoothstep(0.55, 0.95, length(c * float2(1.1, 0.9))) * 0.35);

  // Develop: the paint soaks into the paper, darker washes first.
  float t = 1.0 - smoothstep(f - 0.08, f + 0.08, 1.15 - uDevelop * 1.35);
  col = mix(uPaper, col, t);

  return half4(half3(clamp(col, 0.0, 1.0)), 1.0);
}
`;

/** Uniform names in declaration order (CanvasKit takes a flat array in this order). */
const UNIFORM_ORDER = [
  'uSize',
  'uSeed',
  'uDevelop',
  'uC0',
  'uC1',
  'uC2',
  'uC3',
  'uPaper',
  'uWarp',
  'uScale',
  'uAngle',
  'uLayers',
  'uVeil',
  'uVeilY',
  'uVeilH',
] as const;

export type PaintingUniforms = {
  uSize: [number, number];
  uSeed: number;
  uDevelop: number;
  uC0: [number, number, number];
  uC1: [number, number, number];
  uC2: [number, number, number];
  uC3: [number, number, number];
  uPaper: [number, number, number];
  uWarp: number;
  uScale: number;
  uAngle: number;
  uLayers: number;
  uVeil: number;
  uVeilY: number;
  uVeilH: number;
};

export interface PaintingRecipe {
  palette: Palette;
  seed: number;
  warp: number;
  scale: number;
  angle: number;
  layers: number;
}

/** Small deterministic PRNG (mulberry32). */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function paletteOrder(cycle: number): number[] {
  const order = PALETTES.map((_, i) => i);
  const rand = rng(cycle * 7919 + 13);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

/** The painting for a given day: same day → same painting on every phone. */
export function recipeForDay(dayNumber: number): PaintingRecipe {
  const rand = rng(dayNumber * 2654435761 + 97);
  // Walk the palettes in shuffled cycles so neighbouring days never repeat a palette.
  const n = PALETTES.length;
  const cycle = Math.floor(dayNumber / n);
  const order = paletteOrder(cycle);
  const previous = paletteOrder(cycle - 1);
  if (order[0] === previous[n - 1]) [order[0], order[1]] = [order[1], order[0]];
  const palette = PALETTES[order[((dayNumber % n) + n) % n]];
  return {
    palette,
    seed: rand() * 100,
    warp: 2.6 + rand() * 1.6,
    scale: 1.2 + rand() * 1.0,
    angle: rand() * Math.PI * 2,
    layers: 4 + Math.floor(rand() * 3),
  };
}

export function paintingUniforms(
  recipe: PaintingRecipe,
  width: number,
  height: number,
  opts: { develop?: number; veil?: number; veilY?: number; veilH?: number } = {},
): PaintingUniforms {
  const { palette } = recipe;
  return {
    uSize: [width, height],
    uSeed: recipe.seed,
    uDevelop: opts.develop ?? 1,
    uC0: hexToRgb(palette.c0),
    uC1: hexToRgb(palette.c1),
    uC2: hexToRgb(palette.c2),
    uC3: hexToRgb(palette.c3),
    uPaper: hexToRgb(palette.paper),
    uWarp: recipe.warp,
    uScale: recipe.scale,
    uAngle: recipe.angle,
    uLayers: recipe.layers,
    uVeil: opts.veil ?? 0.55,
    uVeilY: opts.veilY ?? 0.5,
    uVeilH: opts.veilH ?? 0.26,
  };
}

export function flattenUniforms(u: PaintingUniforms): number[] {
  const out: number[] = [];
  for (const key of UNIFORM_ORDER) {
    const v = u[key];
    if (Array.isArray(v)) out.push(...v);
    else out.push(v);
  }
  return out;
}
