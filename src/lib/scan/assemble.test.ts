import Cube from "cubejs";
import { describe, expect, it } from "vitest";
import { FACES, SOLVED_FACELETS, toFacelets, type Face } from "@/lib/cube/model";
import { checkFacelets } from "@/lib/cube/validate";
import { minCostAssignment } from "./assignment";
import { assembleCube, orientSides } from "./assemble";
import { rgbToLab, type Lab, type Rgb } from "./color";
import { CAMERA_RGB, seeded } from "./testImages";

const turn = <T,>(g: readonly T[]): T[] => [6, 3, 0, 7, 4, 1, 8, 5, 2].map((i) => g[i]);
const mirror = <T,>(g: readonly T[]): T[] => [2, 1, 0, 5, 4, 3, 8, 7, 6].map((i) => g[i]);

type Light = (rgb: Rgb) => Rgb;
const LIGHTS: Record<string, Light> = {
  plain: (c) => c,
  dim: (c) => c.map((v) => v * 0.5) as unknown as Rgb,
  warm: ([r, g, b]) => [Math.min(255, r * 1.08), g * 0.95, b * 0.7],
  cool: ([r, g, b]) => [r * 0.8, g * 0.95, Math.min(255, b * 1.12)],
};

/** Split a cube into six "scanned" sides: shuffled, each turned at random, colors as a camera sees them. */
function scan(facelets: string, rand: () => number, light: Light = LIGHTS.plain, flip = false): Lab[][] {
  const sides = FACES.map((_, f) => {
    let side = [...facelets.slice(f * 9, f * 9 + 9)] as Face[];
    if (flip) side = mirror(side);
    for (let k = Math.floor(rand() * 4); k > 0; k--) side = turn(side);
    return side.map((face) => {
      const [r, g, b] = light(CAMERA_RGB[face]);
      const jitter = () => (rand() * 2 - 1) * 8;
      return rgbToLab([r + jitter(), g + jitter(), b + jitter()].map((v) => Math.max(0, Math.min(255, v))) as unknown as Rgb);
    });
  });
  for (let i = sides.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [sides[i], sides[j]] = [sides[j], sides[i]];
  }
  return sides;
}

function randomCube(rand: () => number): string {
  const moves = Array.from({ length: 25 }, () => "URFDLB"[Math.floor(rand() * 6)] + ["", "'", "2"][Math.floor(rand() * 3)]);
  const cube = new Cube();
  cube.move(moves.join(" "));
  return toFacelets(cube.toJSON());
}

describe("minCostAssignment", () => {
  it("matches brute force on small matrices", () => {
    const rand = seeded(2);
    const perms = (n: number): number[][] =>
      n === 0 ? [[]] : perms(n - 1).flatMap((p) => Array.from({ length: n }, (_, i) => [...p.slice(0, i), n - 1, ...p.slice(i)]));
    for (let k = 0; k < 30; k++) {
      const n = 1 + (k % 6);
      const cost = Array.from({ length: n }, () => Array.from({ length: n }, () => Math.round(rand() * 50)));
      const total = (a: number[]) => a.reduce((sum, j, i) => sum + cost[i][j], 0);
      const bestTotal = Math.min(...perms(n).map(total));
      const got = minCostAssignment(cost);
      expect(new Set(got).size).toBe(n);
      expect(total(got)).toBe(bestTotal);
    }
  });
});

describe("assembleCube", () => {
  it("rebuilds the solved cube", () => {
    const result = assembleCube(scan(SOLVED_FACELETS, seeded(1)));
    expect(result).toEqual({ draft: SOLVED_FACELETS, unsure: [], legal: true });
  });

  it("rebuilds random cubes scanned in any order and rotation, under different lighting", () => {
    const rand = seeded(42);
    for (const [name, light] of Object.entries(LIGHTS)) {
      for (let k = 0; k < 15; k++) {
        const facelets = randomCube(rand);
        const result = assembleCube(scan(facelets, rand, light));
        expect(result.draft, `${name} #${k}`).toBe(facelets);
        expect(result.legal).toBe(true);
      }
    }
  });

  it("rebuilds a cube from a mirrored camera picture", () => {
    const rand = seeded(9);
    const facelets = randomCube(rand);
    expect(assembleCube(scan(facelets, rand, LIGHTS.plain, true)).draft).toBe(facelets);
  });

  it("with a misread sticker, keeps the rest and lets the editor point at the problem", () => {
    const rand = seeded(5);
    for (let k = 0; k < 10; k++) {
      const facelets = randomCube(rand);
      const sides = scan(facelets, rand);
      // Paint one non-center sticker of one side with another color.
      const s = k % 6;
      const i = [0, 1, 2, 3, 5, 6, 7, 8][k % 8];
      const other = FACES.find((f) => Math.abs(rgbToLab(CAMERA_RGB[f])[2] - sides[s][i][2]) > 40)!;
      sides[s][i] = rgbToLab(CAMERA_RGB[other]);
      const result = assembleCube(sides);
      expect(result.legal).toBe(false);
      const wrong = [...result.draft].filter((ch, j) => ch !== "." && ch !== facelets[j]).length;
      // The balanced color count moves the misread elsewhere: at most a couple of stickers are off.
      expect(wrong).toBeLessThanOrEqual(3);
      expect(checkFacelets(result.draft).problems.length + result.unsure.length).toBeGreaterThan(0);
    }
  });

  it("finds exactly one legal way to turn the sides of random cubes", () => {
    const rand = seeded(77);
    for (let k = 0; k < 60; k++) {
      const facelets = randomCube(rand);
      const sides = FACES.map((_, f) => {
        let side = [...facelets.slice(f * 9, f * 9 + 9)] as Face[];
        for (let t = Math.floor(rand() * 4); t > 0; t--) side = turn(side);
        return side;
      });
      expect(orientSides(sides)).toEqual({ draft: facelets, unsure: [], legal: true });
    }
  });

  it("leaves stickers blank where the best readings disagree", () => {
    // A cube that can't be legal: every side's edge stickers the same color as
    // its center but the corners scrambled. Several rotations score the same.
    const sides = FACES.map((f, n) => [FACES[(n + 1) % 6], f, FACES[(n + 2) % 6], f, f, f, FACES[(n + 4) % 6], f, FACES[(n + 5) % 6]] as Face[]);
    const result = orientSides(sides);
    expect(result.legal).toBe(false);
    for (const i of result.unsure) expect(result.draft[i]).toBe(".");
    for (let f = 0; f < 6; f++) expect(result.draft[f * 9 + 4]).toBe(FACES[f]);
  });
});
