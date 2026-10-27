import { describe, expect, it } from "vitest";
import {
  applyMoves,
  faceColors,
  faceletColors,
  faceletPosition,
  fromFacelets,
  InvalidFaceletsError,
  isSolved,
  SOLVED_FACELETS,
  solvedState,
  toFacelets,
} from "./model";
import { invertAlgorithm, parseAlgorithm } from "./notation";

const faces = (facelets: string) => facelets.match(/.{9}/g);

describe("cube model", () => {
  it("starts solved", () => {
    expect(toFacelets(solvedState())).toBe(SOLVED_FACELETS);
    expect(isSolved(solvedState())).toBe(true);
  });

  it("R moves the right column of U, F, D and B", () => {
    expect(faces(toFacelets(applyMoves(solvedState(), "R")))).toEqual([
      "UUFUUFUUF", "RRRRRRRRR", "FFDFFDFFD", "DDBDDBDDB", "LLLLLLLLL", "UBBUBBUBB",
    ]);
  });

  it("M turns like L and moves the U and F centers", () => {
    const [u, , f] = faces(toFacelets(applyMoves(solvedState(), "M")))!;
    expect(u).toBe("UBUUBUUBU");
    expect(f).toBe("FUFFUFFUF");
  });

  it("r equals R M' and Rw", () => {
    const r = toFacelets(applyMoves(solvedState(), "r"));
    expect(toFacelets(applyMoves(solvedState(), "R M'"))).toBe(r);
    expect(toFacelets(applyMoves(solvedState(), "Rw"))).toBe(r);
  });

  it("x turns the whole cube, which still counts as solved", () => {
    const state = applyMoves(solvedState(), "x");
    expect(faces(toFacelets(state))![0]).toBe("FFFFFFFFF");
    expect(isSolved(state)).toBe(true);
  });

  it("undoes any algorithm with its inverse", () => {
    const alg = parseAlgorithm("R U' F2 M' E S2 r u' l d2 b f' x y2 z' L D B'");
    const scrambled = applyMoves(solvedState(), alg);
    expect(isSolved(scrambled)).toBe(false);
    expect(toFacelets(applyMoves(scrambled, invertAlgorithm(alg)))).toBe(SOLVED_FACELETS);
  });

  it("returns to solved after six sexy moves and four M2s", () => {
    expect(isSolved(applyMoves(solvedState(), "(R U R' U') ".repeat(6)))).toBe(true);
    expect(toFacelets(applyMoves(solvedState(), "M2 M2"))).toBe(SOLVED_FACELETS);
  });

  it("does not change the input state", () => {
    const start = solvedState();
    applyMoves(start, "R U M");
    expect(toFacelets(start)).toBe(SOLVED_FACELETS);
  });

  it("reads sticker colors per facelet and per face", () => {
    const state = applyMoves(solvedState(), "R");
    expect(faceletColors(state)).toHaveLength(54);
    expect(faceColors(state, "U")).toEqual([
      "white", "white", "green", "white", "white", "green", "white", "white", "green",
    ]);
  });

  it("locates facelets by face, row and column", () => {
    expect(faceletPosition(0)).toEqual({ face: "U", row: 0, col: 0 });
    expect(faceletPosition(22)).toEqual({ face: "F", row: 1, col: 1 });
    expect(faceletPosition(53)).toEqual({ face: "B", row: 2, col: 2 });
    expect(() => faceletPosition(54)).toThrow(RangeError);
  });
});

describe("fromFacelets", () => {
  it("round-trips a scrambled cube, including moved centers", () => {
    const facelets = toFacelets(applyMoves(solvedState(), "R U' M F2 r' x D S"));
    const state = fromFacelets(facelets);
    expect(toFacelets(state)).toBe(facelets);
    expect(toFacelets(applyMoves(state, "S' D' x' r F2 M' U R'"))).toBe(SOLVED_FACELETS);
  });

  it.each([
    ["wrong length", SOLVED_FACELETS.slice(1)],
    ["unknown letter", "X" + SOLVED_FACELETS.slice(1)],
    ["wrong color count", "R" + SOLVED_FACELETS.slice(1)],
    // Swap a white and a yellow sticker: the URF corner becomes yellow-red-green.
    ["impossible piece", SOLVED_FACELETS.replace("UUUUUUUUU", "UUUUUUUUD").replace("DDDDDDDDD", "UDDDDDDDD")],
  ])("rejects %s", (_, facelets) => {
    expect(() => fromFacelets(facelets)).toThrow(InvalidFaceletsError);
  });
});
