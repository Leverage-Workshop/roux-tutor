// Color math for the camera scanner: sRGB to CIE Lab, and a distance that
// cares less about lightness than about hue, since a sticker's brightness
// changes a lot with how the cube is held while its hue barely does.
import { FACE_COLOR, STICKER_HEX, type Face } from "@/lib/cube/model";

export type Rgb = readonly [number, number, number];
export type Lab = readonly [number, number, number];

const toLinear = (c: number) => {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};
const f = (t: number) => (t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116);

/** sRGB (0-255) to CIE Lab (D65). */
export function rgbToLab([r, g, b]: Rgb): Lab {
  const lr = toLinear(r);
  const lg = toLinear(g);
  const lb = toLinear(b);
  const x = (0.4124 * lr + 0.3576 * lg + 0.1805 * lb) / 0.95047;
  const y = 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
  const z = (0.0193 * lr + 0.1192 * lg + 0.9505 * lb) / 1.08883;
  const fy = f(y);
  return [116 * fy - 16, 500 * (f(x) - fy), 200 * (fy - f(z))];
}

/** Lab distance with lightness counted at half weight. */
export function colorDistance(a: Lab, b: Lab): number {
  const dl = (a[0] - b[0]) * 0.5;
  return Math.hypot(dl, a[1] - b[1], a[2] - b[2]);
}

const hexToRgb = (hex: string): Rgb => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as unknown as Rgb;

/** The sticker colors the app draws, in Lab: the starting guess for which center is which. */
export const REFERENCE_LAB: Record<Face, Lab> = Object.fromEntries(
  (Object.keys(FACE_COLOR) as Face[]).map((face) => [face, rgbToLab(hexToRgb(STICKER_HEX[FACE_COLOR[face]]))]),
) as Record<Face, Lab>;

/** CSS color for a sampled sticker. */
export const rgbCss = ([r, g, b]: Rgb) => `rgb(${Math.round(r)} ${Math.round(g)} ${Math.round(b)})`;
