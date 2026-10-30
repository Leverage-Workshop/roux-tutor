// Turns six scanned sides into a draft for the facelet editor (validate.ts).
//
// 1. Which side is which: the six centers are matched to the six colors all
//    at once, so e.g. the redder of two red-looking centers is red.
// 2. Every other sticker gets the color whose stickers it looks most like,
//    with each color used exactly 9 times (a real cube has 9 of each). The
//    colors are learned from the scan itself, starting from the centers, so
//    they match the user's lighting.
// 3. Which way up each side was held: a side alone doesn't say, so we try
//    every rotation of every side (and a mirror image of all of them, in case
//    the camera flips its picture) and keep the ones that make real pieces
//    and a legal cube. Stickers that still differ between the best choices
//    are left blank for the user to fill in.
import { FACES, type Face } from "@/lib/cube/model";
import { BLANK, CORNER_FACELETS, EDGE_FACELETS, checkFacelets } from "@/lib/cube/validate";
import { minCostAssignment } from "./assignment";
import { REFERENCE_LAB, colorDistance, type Lab } from "./color";

export interface AssembledCube {
  /** 54 letters in facelet order, "." where the scan couldn't be sure. */
  draft: string;
  /** Facelet indexes left blank because more than one reading fit. */
  unsure: number[];
  /** True when the draft is a complete, legal cube. */
  legal: boolean;
}

/** All orderings of the six faces, for matching centers to colors. */
function permutations<T>(items: readonly T[]): T[][] {
  if (items.length <= 1) return [[...items]];
  return items.flatMap((item, i) =>
    permutations([...items.slice(0, i), ...items.slice(i + 1)]).map((rest) => [item, ...rest]),
  );
}
const FACE_ORDERS = permutations(FACES);

/** Which color each scanned side's center is. */
function matchCenters(centers: readonly Lab[]): Face[] {
  let top = FACE_ORDERS[0];
  let topCost = Infinity;
  for (const order of FACE_ORDERS) {
    const cost = order.reduce((sum, face, i) => sum + colorDistance(centers[i], REFERENCE_LAB[face]), 0);
    if (cost < topCost) {
      topCost = cost;
      top = order;
    }
  }
  return top;
}

const meanLab = (colors: readonly Lab[]): Lab =>
  [0, 1, 2].map((ch) => colors.reduce((sum, c) => sum + c[ch], 0) / colors.length) as unknown as Lab;

/** A color letter for each sticker of each side (sides as scanned, stickers as seen). */
export function classifyStickers(sides: readonly (readonly Lab[])[]): Face[][] {
  if (sides.length !== 6 || sides.some((s) => s.length !== 9)) throw new RangeError("Need 6 sides of 9 stickers");
  const centerFaces = matchCenters(sides.map((s) => s[4]));
  const others = sides.flatMap((side, s) => side.flatMap((lab, i) => (i === 4 ? [] : [{ s, i, lab }])));
  let palette: Record<Face, Lab> = Object.fromEntries(centerFaces.map((face, s) => [face, sides[s][4]])) as Record<Face, Lab>;
  let letters: Face[] = [];
  // Assign with 8 slots per color, then learn each color from all 9 of its
  // stickers and assign again, until nothing changes.
  for (let round = 0; round < 4; round++) {
    const slots = FACES.flatMap((face) => Array<Face>(8).fill(face));
    const cost = others.map(({ lab }) => slots.map((face) => colorDistance(lab, palette[face])));
    const next = minCostAssignment(cost).map((slot) => slots[slot]);
    if (next.every((face, k) => face === letters[k])) break;
    letters = next;
    palette = Object.fromEntries(
      FACES.map((face) => {
        const members = others.filter((_, k) => letters[k] === face).map((o) => o.lab);
        const center = sides[centerFaces.indexOf(face)][4];
        return [face, meanLab([center, ...members])];
      }),
    ) as Record<Face, Lab>;
  }
  const result = sides.map((_, s) => Array<Face>(9).fill(centerFaces[s]));
  others.forEach(({ s, i }, k) => (result[s][i] = letters[k]));
  return result;
}

/** A 3x3 grid (row by row) turned a quarter turn clockwise. */
const turn = <T,>(g: readonly T[]): T[] => [6, 3, 0, 7, 4, 1, 8, 5, 2].map((i) => g[i]);
const mirror = <T,>(g: readonly T[]): T[] => [2, 1, 0, 5, 4, 3, 8, 7, 6].map((i) => g[i]);

// Every way a solved piece can read in its slot, to its piece number.
const SOLVED = FACES.map((f) => f.repeat(9)).join("");
function pieceTable(slots: readonly (readonly number[])[]): Map<string, number> {
  const table = new Map<string, number>();
  slots.forEach((slot, piece) => {
    const colors = slot.map((i) => SOLVED[i]);
    for (let t = 0; t < colors.length; t++) {
      table.set(colors.map((_, k) => colors[(k + t) % colors.length]).join(""), piece);
    }
  });
  return table;
}
const CORNERS = pieceTable(CORNER_FACELETS);
const EDGES = pieceTable(EDGE_FACELETS);

/** How many different real pieces a facelet string has (20 for a cube of real pieces). */
function realPieces(facelets: string): number {
  const seen = new Set<string>();
  for (const [slots, table, tag] of [
    [CORNER_FACELETS, CORNERS, "c"],
    [EDGE_FACELETS, EDGES, "e"],
  ] as const) {
    for (const slot of slots) {
      const piece = table.get(slot.map((i) => facelets[i]).join(""));
      if (piece !== undefined) seen.add(tag + piece);
    }
  }
  return seen.size;
}

/** Build the editor draft from six classified sides (any order, any rotation). */
export function orientSides(sides: readonly (readonly Face[])[]): AssembledCube {
  const views = sides.map((side) => {
    const flat = [[...side]];
    for (let k = 1; k < 4; k++) flat.push(turn(flat[k - 1]));
    const flipped = [mirror(side)];
    for (let k = 1; k < 4; k++) flipped.push(turn(flipped[k - 1]));
    return [flat, flipped];
  });
  const starts = sides.map((side) => FACES.indexOf(side[4]) * 9);
  if (new Set(starts).size !== 6) throw new RangeError("Sides must have six different centers");

  let topScore = -1;
  let tops: string[] = [];
  const chars = new Array<string>(54);
  for (let flip = 0; flip < 2; flip++) {
    for (let combo = 0; combo < 4 ** 6; combo++) {
      for (let s = 0; s < 6; s++) {
        const view = views[s][flip][(combo >> (2 * s)) & 3];
        for (let i = 0; i < 9; i++) chars[starts[s] + i] = view[i];
      }
      const facelets = chars.join("");
      const score = realPieces(facelets);
      if (score > topScore) {
        topScore = score;
        tops = [facelets];
      } else if (score === topScore && !tops.includes(facelets)) {
        tops.push(facelets);
      }
    }
  }
  const legal = tops.filter((f) => checkFacelets(f).state !== null);
  const choices = legal.length > 0 ? legal : tops;
  const unsure: number[] = [];
  const draft = [...choices[0]]
    .map((ch, i) => {
      if (i % 9 === 4 || choices.every((c) => c[i] === ch)) return ch;
      unsure.push(i);
      return BLANK;
    })
    .join("");
  return { draft, unsure, legal: unsure.length === 0 && legal.length > 0 };
}

/** Six scanned sides (9 Lab colors each, as seen, in any order) to an editor draft. */
export function assembleCube(sides: readonly (readonly Lab[])[]): AssembledCube {
  return orientSides(classifyStickers(sides));
}
