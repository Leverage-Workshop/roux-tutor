// Finds one side of the cube in a small, square snapshot of the camera video
// and reads its 9 sticker colors.
//
// The user holds a side inside a square guide, so the side is roughly in the
// middle of the snapshot at roughly the guide's size. We try 3x3 grids of
// different positions, sizes and small tilts and keep the one whose cells are
// most uniform and whose lines (the gaps between stickers) stand out most from
// the cells. Then we check that it really looks like stickers: every cell one
// color, and not a plain surface.
import { rgbToLab, type Lab, type Rgb } from "./color";

/** Width and height of the snapshot the scanner analyzes, in pixels. */
export const SNAPSHOT_SIZE = 120;
/** How big the guide square is inside the snapshot (the snapshot has some margin around it). */
export const GUIDE_IN_SNAPSHOT = 100 / 120;

export interface Snapshot {
  /** RGBA, row by row, like ImageData. */
  data: ArrayLike<number>;
  width: number;
  height: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface FaceRead {
  /** The side's outline in snapshot pixels: top-left, top-right, bottom-right, bottom-left (as seen). */
  corners: [Point, Point, Point, Point];
  /** Sticker colors row by row, as seen in the snapshot. */
  rgb: Rgb[];
  lab: Lab[];
  /** How much the lines between stickers stand out (luminance, 0-255). */
  contrast: number;
}

interface Grid {
  cx: number;
  cy: number;
  size: number;
  angle: number;
}

interface Planes {
  n: number;
  r: Float32Array;
  g: Float32Array;
  b: Float32Array;
  y: Float32Array;
}

function toPlanes(img: Snapshot): Planes {
  const n = img.width;
  if (img.height !== n) throw new RangeError("Snapshot must be square");
  const r = new Float32Array(n * n);
  const g = new Float32Array(n * n);
  const b = new Float32Array(n * n);
  const y = new Float32Array(n * n);
  for (let i = 0; i < n * n; i++) {
    r[i] = img.data[i * 4];
    g[i] = img.data[i * 4 + 1];
    b[i] = img.data[i * 4 + 2];
    y[i] = 0.299 * r[i] + 0.587 * g[i] + 0.114 * b[i];
  }
  return { n, r, g, b, y };
}

const clampIndex = (v: number, n: number) => Math.min(n - 1, Math.max(0, Math.round(v)));
const at = (p: Planes, x: number, y: number) => clampIndex(y, p.n) * p.n + clampIndex(x, p.n);

/** Where a point given in the grid's own units (-0.5..0.5 across the side) lands in the snapshot. */
function place(grid: Grid, u: number, v: number): Point {
  const c = Math.cos(grid.angle);
  const s = Math.sin(grid.angle);
  return {
    x: grid.cx + (u * c - v * s) * grid.size,
    y: grid.cy + (u * s + v * c) * grid.size,
  };
}

/** Offsets (in side units) for samples inside a cell: the middle 60% of it. */
function cellOffsets(per: number): number[] {
  if (per === 1) return [0];
  return Array.from({ length: per }, (_, i) => (-0.3 + (0.6 * i) / (per - 1)) / 3);
}

/** How uniform a grid's cells are (variance) and how much its lines differ from them (contrast). */
function measure(p: Planes, grid: Grid, per: number, lineSamples: number, reach: number) {
  const offsets = cellOffsets(per);
  let variance = 0;
  let cellLum = 0;
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      let sr = 0, sg = 0, sb = 0, qr = 0, qg = 0, qb = 0;
      for (const dv of offsets) {
        for (const du of offsets) {
          const pt = place(grid, (col - 1) / 3 + du, (row - 1) / 3 + dv);
          const i = at(p, pt.x, pt.y);
          sr += p.r[i]; sg += p.g[i]; sb += p.b[i];
          qr += p.r[i] ** 2; qg += p.g[i] ** 2; qb += p.b[i] ** 2;
          cellLum += p.y[i];
        }
      }
      const k = offsets.length ** 2;
      variance += qr / k - (sr / k) ** 2 + qg / k - (sg / k) ** 2 + qb / k - (sb / k) ** 2;
    }
  }
  cellLum /= 9 * offsets.length ** 2;
  variance /= 9;

  // The 4 inner lines. Each sample takes the darkest (or, for white-plastic
  // cubes, brightest) pixel across the line, since gaps can be 1-2 pixels.
  let dark = 0;
  let bright = 0;
  let count = 0;
  for (const line of [-1 / 6, 1 / 6]) {
    for (let k = 0; k < lineSamples; k++) {
      const t = -0.45 + (0.9 * k) / (lineSamples - 1);
      for (const vertical of [true, false]) {
        let lo = Infinity;
        let hi = -Infinity;
        for (let d = -reach; d <= reach; d++) {
          const off = d / grid.size;
          const pt = vertical ? place(grid, line + off, t) : place(grid, t, line + off);
          const lum = p.y[at(p, pt.x, pt.y)];
          if (lum < lo) lo = lum;
          if (lum > hi) hi = lum;
        }
        dark += lo;
        bright += hi;
        count++;
      }
    }
  }
  const contrast = Math.max(cellLum - dark / count, bright / count - cellLum);
  return { contrast, variance: Math.max(0, variance) };
}

/** How well a grid fits: high when cells are uniform and lines differ from cells. */
function score(p: Planes, grid: Grid, per: number, lineSamples: number, reach: number): number {
  const { contrast, variance } = measure(p, grid, per, lineSamples, reach);
  return contrast - 0.5 * Math.sqrt(variance);
}

function best(p: Planes, grids: Grid[], per: number, lineSamples: number, reach: number): Grid {
  let top = grids[0];
  let topScore = -Infinity;
  for (const grid of grids) {
    const s = score(p, grid, per, lineSamples, reach);
    if (s > topScore) {
      topScore = s;
      top = grid;
    }
  }
  return top;
}

const range = (from: number, to: number, steps: number) =>
  Array.from({ length: steps }, (_, i) => from + ((to - from) * i) / (steps - 1));

function search(p: Planes): Grid {
  const n = p.n;
  const guide = n * GUIDE_IN_SNAPSHOT;
  const coarse: Grid[] = [];
  for (const size of range(guide * 0.7, guide * 1.12, 7)) {
    for (const cy of range(n / 2 - n * 0.12, n / 2 + n * 0.12, 7)) {
      for (const cx of range(n / 2 - n * 0.12, n / 2 + n * 0.12, 7)) {
        for (const deg of [-14, -7, 0, 7, 14]) {
          coarse.push({ cx, cy, size, angle: (deg * Math.PI) / 180 });
        }
      }
    }
  }
  let grid = best(p, coarse, 3, 6, 2);
  // Two rounds of refining around the best grid, each finer than the last.
  for (const [move, grow, turn] of [
    [n * 0.025, guide * 0.035, 4],
    [n * 0.01, guide * 0.015, 2],
  ]) {
    const fine: Grid[] = [];
    for (const ds of [-grow, 0, grow]) {
      for (const dy of [-move, 0, move]) {
        for (const dx of [-move, 0, move]) {
          for (const dd of [-turn, 0, turn]) {
            fine.push({
              cx: grid.cx + dx,
              cy: grid.cy + dy,
              size: grid.size + ds,
              angle: grid.angle + (dd * Math.PI) / 180,
            });
          }
        }
      }
    }
    grid = best(p, fine, 4, 10, 1);
  }
  return grid;
}

function bilinear(plane: Float32Array, n: number, x: number, y: number): number {
  const fx = Math.min(n - 1.001, Math.max(0, x));
  const fy = Math.min(n - 1.001, Math.max(0, y));
  const x0 = Math.floor(fx);
  const y0 = Math.floor(fy);
  const tx = fx - x0;
  const ty = fy - y0;
  const i = y0 * n + x0;
  return (
    plane[i] * (1 - tx) * (1 - ty) + plane[i + 1] * tx * (1 - ty) + plane[i + n] * (1 - tx) * ty + plane[i + n + 1] * tx * ty
  );
}

const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
};

/** Most of a cell's samples must be within this RGB distance of its median color. */
const SAME_COLOR = 42;
/** Share of a cell's samples that must be its color (the center may carry a logo). */
const MIN_UNIFORM = 0.6;
const MIN_UNIFORM_CENTER = 0.35;
/** Lines between stickers must stand out this much (luminance, 0-255)... */
const MIN_CONTRAST = 14;
/** ...and more when all 9 cells are one color. */
const MIN_PLAIN_CONTRAST = 18;

/** Look for one side of the cube in the snapshot. Null when there isn't a clear one. */
export function findFace(img: Snapshot): FaceRead | null {
  const p = toPlanes(img);
  const grid = search(p);
  const offsets = cellOffsets(7);
  const rgb: Rgb[] = [];
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      const samples: Rgb[] = [];
      for (const dv of offsets) {
        for (const du of offsets) {
          const pt = place(grid, (col - 1) / 3 + du, (row - 1) / 3 + dv);
          samples.push([bilinear(p.r, p.n, pt.x, pt.y), bilinear(p.g, p.n, pt.x, pt.y), bilinear(p.b, p.n, pt.x, pt.y)]);
        }
      }
      const mid: Rgb = [0, 1, 2].map((ch) => median(samples.map((s) => s[ch]))) as unknown as Rgb;
      const uniform = samples.filter((s) => Math.hypot(s[0] - mid[0], s[1] - mid[1], s[2] - mid[2]) < SAME_COLOR).length;
      if (uniform / samples.length < (row === 1 && col === 1 ? MIN_UNIFORM_CENTER : MIN_UNIFORM)) return null;
      rgb.push(mid);
    }
  }

  // A plain surface (a wall, a table) fits a grid of uniform cells too, but
  // has no lines between them.
  const allSame = rgb.every((c) => Math.hypot(c[0] - rgb[0][0], c[1] - rgb[0][1], c[2] - rgb[0][2]) < 30);
  const { contrast } = measure(p, grid, 4, 10, 1);
  if (contrast < (allSame ? MIN_PLAIN_CONTRAST : MIN_CONTRAST)) return null;

  const corners = [place(grid, -0.5, -0.5), place(grid, 0.5, -0.5), place(grid, 0.5, 0.5), place(grid, -0.5, 0.5)] as FaceRead["corners"];
  return { corners, rgb, lab: rgb.map(rgbToLab), contrast };
}
