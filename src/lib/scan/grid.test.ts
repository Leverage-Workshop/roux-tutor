import { describe, expect, it } from "vitest";
import { FACES, type Face } from "@/lib/cube/model";
import { colorDistance, rgbToLab, type Rgb } from "./color";
import { findFace, SNAPSHOT_SIZE } from "./grid";
import { CAMERA_RGB, drawPlain, drawSide, seeded, type SideOptions } from "./testImages";

const nearest = (rgb: Rgb): Face => {
  const lab = rgbToLab(rgb);
  return FACES.reduce((a, b) =>
    colorDistance(lab, rgbToLab(CAMERA_RGB[a])) <= colorDistance(lab, rgbToLab(CAMERA_RGB[b])) ? a : b,
  );
};

function randomSide(rand: () => number): Face[] {
  return Array.from({ length: 9 }, () => FACES[Math.floor(rand() * 6)]);
}

function readBack(side: Face[], options: SideOptions) {
  const read = findFace(drawSide(side.map((f) => CAMERA_RGB[f]), options));
  return read && read.rgb.map(nearest);
}

describe("findFace", () => {
  it("reads a centered side", () => {
    const side: Face[] = ["U", "R", "F", "D", "L", "B", "U", "R", "F"];
    expect(readBack(side, {})).toEqual(side);
  });

  it("reads sides that are off-center, bigger or smaller, and tilted", () => {
    const rand = seeded(7);
    for (let k = 0; k < 40; k++) {
      const side = randomSide(rand);
      const options: SideOptions = {
        cx: SNAPSHOT_SIZE / 2 + (rand() * 2 - 1) * 10,
        cy: SNAPSHOT_SIZE / 2 + (rand() * 2 - 1) * 10,
        size: 74 + rand() * 34,
        angle: (rand() * 2 - 1) * 13,
        seed: k,
      };
      expect(readBack(side, options), JSON.stringify(options)).toEqual(side);
    }
  });

  it("reads stickerless cubes (thin gaps) and white-plastic cubes", () => {
    const rand = seeded(11);
    for (let k = 0; k < 20; k++) {
      const side = randomSide(rand);
      const stickerless = k % 2 === 0;
      const options: SideOptions = stickerless
        ? { gap: 0.04, body: [40, 40, 40], angle: (rand() * 2 - 1) * 8, seed: k }
        : { body: [235, 235, 230], angle: (rand() * 2 - 1) * 8, seed: k };
      expect(readBack(side, options), JSON.stringify(options)).toEqual(side);
    }
  });

  it("reads a solved side, a side with a glare spot, and a noisy dim one", () => {
    const solved: Face[] = Array(9).fill("F");
    expect(readBack(solved, {})).toEqual(solved);
    const side: Face[] = ["B", "B", "R", "U", "L", "D", "F", "U", "R"];
    expect(readBack(side, { glare: { x: 52, y: 50, r: 6 } })).toEqual(side);
    const dim = findFace(drawSide(side.map((f) => CAMERA_RGB[f].map((v) => v * 0.55) as unknown as Rgb), { noise: 12 }));
    expect(dim).not.toBeNull();
  });

  it("reads through a thumb over part of a sticker", () => {
    const side: Face[] = ["B", "B", "R", "U", "L", "D", "F", "U", "R"];
    expect(readBack(side, { thumb: { x: 76, y: 93, r: 12 } })).toEqual(side);
    expect(readBack(side, { thumb: { x: 45, y: 45, r: 12 } })).toEqual(side);
  });

  it("returns the side's outline", () => {
    const read = findFace(drawSide(Array(9).fill(CAMERA_RGB.U), { gap: 0.12, size: 96, cx: 64, cy: 58 }))!;
    const [tl, , br] = read.corners;
    expect(Math.abs(tl.x - (64 - 48))).toBeLessThan(3);
    expect(Math.abs(tl.y - (58 - 48))).toBeLessThan(3);
    expect(Math.abs(br.x - (64 + 48))).toBeLessThan(3);
    expect(Math.abs(br.y - (58 + 48))).toBeLessThan(3);
  });

  it("finds nothing on a plain surface, a textured one, or a smooth gradient", () => {
    expect(findFace(drawPlain(() => [200, 200, 195]))).toBeNull();
    expect(findFace(drawPlain(() => [120, 90, 60], 3))).toBeNull();
    const rand = seeded(3);
    expect(findFace(drawPlain(() => [rand() * 255, rand() * 255, rand() * 255], 0))).toBeNull();
    expect(findFace(drawPlain((x, y) => [x * 2, y * 2, 128]))).toBeNull();
  });

  it("is fast enough for several frames a second", () => {
    const side = drawSide(randomSide(seeded(5)).map((f) => CAMERA_RGB[f]));
    findFace(side);
    const start = performance.now();
    for (let k = 0; k < 10; k++) findFace(side);
    expect((performance.now() - start) / 10).toBeLessThan(60);
  });
});
