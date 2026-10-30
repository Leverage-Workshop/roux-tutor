// Test helpers: draws a fake camera snapshot of one side of a cube (stickers
// on a dark body, on a background, with noise), and fake camera colors.
import type { Rgb } from "./color";
import { SNAPSHOT_SIZE, type Snapshot } from "./grid";
import type { Face } from "@/lib/cube/model";

/** Roughly how a phone camera sees each sticker color indoors. */
export const CAMERA_RGB: Record<Face, Rgb> = {
  U: [205, 208, 200],
  R: [178, 28, 42],
  F: [18, 150, 82],
  D: [212, 196, 38],
  L: [236, 104, 28],
  B: [22, 68, 168],
};

export interface SideOptions {
  cx?: number;
  cy?: number;
  size?: number;
  /** Degrees, clockwise. */
  angle?: number;
  /** Gap between stickers, as a share of a cell (0.12 black-body cube, ~0.03 stickerless). */
  gap?: number;
  body?: Rgb;
  background?: (x: number, y: number) => Rgb;
  /** Noise amplitude (0-255), per channel. */
  noise?: number;
  /** A bright glare spot: center and radius in pixels. */
  glare?: { x: number; y: number; r: number };
  /** Something (a thumb) covering part of the side: center and radius in pixels. */
  thumb?: { x: number; y: number; r: number };
  seed?: number;
}

/** A small seeded random number generator (mulberry32). */
export function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const clamp = (v: number) => Math.max(0, Math.min(255, v));

/** Draw a snapshot of a side whose stickers (row by row, as seen) have these colors. */
export function drawSide(stickers: readonly Rgb[], options: SideOptions = {}): Snapshot {
  const n = SNAPSHOT_SIZE;
  const {
    cx = n / 2,
    cy = n / 2,
    size = 100,
    angle = 0,
    gap = 0.12,
    body = [22, 22, 24],
    background = (x, y) => [120 + (x % 17), 110 + (y % 13), 100] as Rgb,
    noise = 6,
    glare,
    thumb,
    seed = 1,
  } = options;
  const rand = seeded(seed);
  const data = new Uint8ClampedArray(n * n * 4);
  const c = Math.cos((angle * Math.PI) / 180);
  const s = Math.sin((angle * Math.PI) / 180);
  const cell = size / 3;
  // Supersample 3x3 per pixel, so edges blend like a real camera's.
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const acc = [0, 0, 0];
      for (let sy = 0; sy < 3; sy++) {
        for (let sx = 0; sx < 3; sx++) {
          const px = x + (sx + 0.5) / 3 - cx;
          const py = y + (sy + 0.5) / 3 - cy;
          const u = px * c + py * s + size / 2;
          const v = -px * s + py * c + size / 2;
          let color: Rgb;
          if (u < 0 || v < 0 || u >= size || v >= size) {
            color = background(x, y);
          } else {
            const col = Math.min(2, Math.floor(u / cell));
            const row = Math.min(2, Math.floor(v / cell));
            const du = u - col * cell;
            const dv = v - row * cell;
            const g = (gap * cell) / 2;
            color = du < g || dv < g || du > cell - g || dv > cell - g ? body : stickers[row * 3 + col];
          }
          acc[0] += color[0];
          acc[1] += color[1];
          acc[2] += color[2];
        }
      }
      let rgb = acc.map((v) => v / 9);
      if (glare && Math.hypot(x - glare.x, y - glare.y) < glare.r) rgb = rgb.map((v) => v + (255 - v) * 0.85);
      if (thumb && Math.hypot(x - thumb.x, y - thumb.y) < thumb.r) rgb = [214, 160, 130];
      const i = (y * n + x) * 4;
      for (let ch = 0; ch < 3; ch++) data[i + ch] = clamp(rgb[ch] + (rand() * 2 - 1) * noise);
      data[i + 3] = 255;
    }
  }
  return { data, width: n, height: n };
}

/** A plain snapshot filled by `color` (x, y) (a wall, a table). */
export function drawPlain(color: (x: number, y: number) => Rgb, noise = 6, seed = 1): Snapshot {
  const n = SNAPSHOT_SIZE;
  const rand = seeded(seed);
  const data = new Uint8ClampedArray(n * n * 4);
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const rgb = color(x, y);
      const i = (y * n + x) * 4;
      for (let ch = 0; ch < 3; ch++) data[i + ch] = clamp(rgb[ch] + (rand() * 2 - 1) * noise);
      data[i + 3] = 255;
    }
  }
  return { data, width: n, height: n };
}
