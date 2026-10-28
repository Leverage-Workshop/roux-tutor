import { describe, expect, it } from "vitest";
import { CUBELETS, STICKERS, isInTurn, rotateVec, turnSpec, type Vec3 } from "./geometry";
import { applyMoves, solvedState, toFacelets } from "./model";
import { FACE_TURNS, ROTATIONS, SLICE_TURNS, WIDE_TURNS, type Move } from "./notation";

const key = (cubelet: Vec3, normal: Vec3) => `${cubelet}|${normal}`;
const BY_PLACE = new Map(STICKERS.map((s) => [key(s.cubelet, s.normal), s.index]));

/** Apply a move by physically turning sticker positions, as the renderer does. */
function turnFacelets(facelets: string, move: Move): string {
  const spec = turnSpec(move);
  const out: string[] = [];
  for (const s of STICKERS) {
    const moves = isInTurn(s.cubelet, spec);
    const cubelet = moves ? rotateVec(s.cubelet, spec.axis, spec.quarterTurns) : s.cubelet;
    const normal = moves ? rotateVec(s.normal, spec.axis, spec.quarterTurns) : s.normal;
    const target = BY_PLACE.get(key(cubelet, normal));
    if (target === undefined) throw new Error(`No sticker at ${key(cubelet, normal)}`);
    out[target] = facelets[s.index];
  }
  return out.join("");
}

const ALL_MOVES: Move[] = [...FACE_TURNS, ...SLICE_TURNS, ...WIDE_TURNS, ...ROTATIONS].flatMap(
  (base) => [base, `${base}'`, `${base}2`] as Move[],
);

describe("cube geometry", () => {
  it("places 54 stickers on distinct outer cubelet faces and 27 cubelets", () => {
    expect(STICKERS).toHaveLength(54);
    expect(BY_PLACE.size).toBe(54);
    for (const s of STICKERS) {
      // The sticker's cubelet touches the face its normal points at.
      const axis = s.normal.findIndex((n) => n !== 0);
      expect(s.cubelet[axis]).toBe(s.normal[axis]);
    }
    expect(new Set(CUBELETS.map(String)).size).toBe(27);
  });

  it("puts the corner stickers where Kociemba's layout says", () => {
    // U1 = ULB, U9 = URF, F1 = UFL, D1 = DFL, B1 = UBR.
    expect(STICKERS[0].cubelet).toEqual([-1, 1, -1]);
    expect(STICKERS[8].cubelet).toEqual([1, 1, 1]);
    expect(STICKERS[18].cubelet).toEqual([-1, 1, 1]);
    expect(STICKERS[27].cubelet).toEqual([-1, -1, 1]);
    expect(STICKERS[45].cubelet).toEqual([1, 1, -1]);
  });

  it("rotates vectors by the right-hand rule", () => {
    expect(rotateVec([0, 1, 0], "x", 1)).toEqual([0, 0, 1]);
    expect(rotateVec([0, 0, 1], "y", 1)).toEqual([1, 0, 0]);
    expect(rotateVec([1, 0, 0], "z", 1)).toEqual([0, 1, 0]);
    expect(rotateVec([1, 2, 3], "y", -1)).toEqual(rotateVec([1, 2, 3], "y", 3));
  });

  // The renderer animates a turn on the old state, then swaps to the store's
  // new state. This proves the swap is seamless for every move.
  it.each(ALL_MOVES)("turning layers for %s matches cubejs", (move) => {
    const scrambled = applyMoves(solvedState(), "R U2 F' L D B2 M r' u E S2 x y'");
    const before = toFacelets(scrambled);
    expect(turnFacelets(before, move)).toBe(toFacelets(applyMoves(scrambled, [move])));
  });

  it("turns the slices and wide layers the right way", () => {
    expect(turnSpec("M")).toEqual({ axis: "x", layers: [0], quarterTurns: 1 });
    expect(turnSpec("r'")).toEqual({ axis: "x", layers: [0, 1], quarterTurns: 1 });
    expect(turnSpec("U2").quarterTurns).toBe(-2);
    expect(turnSpec("x").layers).toEqual([-1, 0, 1]);
  });
});
