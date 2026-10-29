import Cube from "cubejs";
import { describe, expect, it } from "vitest";
import { SOLVED_FACELETS, applyMoves, solvedState, toFacelets } from "./model";
import {
  BLANK,
  CORNER_FACELETS,
  EDGE_FACELETS,
  EMPTY_DRAFT,
  checkFacelets,
  parseDraft,
  type FaceletProblemKind,
} from "./validate";

/** Change stickers: pairs of [facelet index, new letter]. */
function edit(facelets: string, ...changes: [number, string][]): string {
  const chars = [...facelets];
  for (const [i, ch] of changes) chars[i] = ch;
  return chars.join("");
}

/** Swap the stickers at two facelet indexes. */
function swap(facelets: string, a: number, b: number): string {
  return edit(facelets, [a, facelets[b]], [b, facelets[a]]);
}

const kinds = (facelets: string): FaceletProblemKind[] => checkFacelets(facelets).problems.map((p) => p.kind);

const SCRAMBLED = toFacelets(applyMoves(solvedState(), "F U R' D R' L' D' R' U F D' U F D L' B D2 U D' F L U2 L' D R2"));

describe("facelet tables", () => {
  it("match cubejs: every slot of a solved cube reads its own piece", () => {
    // URF = U R F and so on (cubejs cornerColor / edgeColor).
    const corners = CORNER_FACELETS.map((slot) => slot.map((i) => SOLVED_FACELETS[i]).join(""));
    expect(corners).toEqual(["URF", "UFL", "ULB", "UBR", "DFR", "DLF", "DBL", "DRB"]);
    const edges = EDGE_FACELETS.map((slot) => slot.map((i) => SOLVED_FACELETS[i]).join(""));
    expect(edges).toEqual(["UR", "UF", "UL", "UB", "DR", "DF", "DL", "DB", "FR", "FL", "BL", "BR"]);
  });

  it("cover every non-center facelet exactly once", () => {
    const all = [...CORNER_FACELETS.flat(), ...EDGE_FACELETS.flat()].sort((a, b) => a - b);
    const expected = Array.from({ length: 54 }, (_, i) => i).filter((i) => i % 9 !== 4);
    expect(all).toEqual(expected);
  });

  it("agree with cubejs on random cubes", () => {
    for (let n = 0; n < 50; n++) {
      const state = Cube.random().toJSON();
      const check = checkFacelets(toFacelets(state));
      expect(check.problems).toEqual([]);
      expect(check.state).toEqual(state);
    }
  });
});

describe("checkFacelets", () => {
  it("accepts the solved cube and a scrambled cube", () => {
    for (const facelets of [SOLVED_FACELETS, SCRAMBLED]) {
      const check = checkFacelets(facelets);
      expect(check).toMatchObject({ blanks: 0, problems: [] });
      expect(toFacelets(check.state!)).toBe(facelets);
    }
  });

  it("accepts 500 random legal cubes", () => {
    for (let n = 0; n < 500; n++) {
      expect(kinds(Cube.random().asString())).toEqual([]);
    }
  });

  it("counts blanks and placed colors, and has no state until complete", () => {
    const check = checkFacelets(EMPTY_DRAFT);
    expect(check.blanks).toBe(48);
    expect(check.counts).toEqual({ U: 1, R: 1, F: 1, D: 1, L: 1, B: 1 });
    expect(check.problems).toEqual([]);
    expect(check.state).toBeNull();

    const oneBlank = edit(SCRAMBLED, [0, BLANK]);
    expect(checkFacelets(oneBlank)).toMatchObject({ blanks: 1, problems: [], state: null });
  });

  it("flags a color used more than 9 times, after the piece problems", () => {
    const tenWhite = edit(SOLVED_FACELETS, [37, "U"]); // UL edge's left sticker
    const check = checkFacelets(tenWhite);
    expect(check.problems.map((p) => p.kind)).toEqual(["repeated-color", "count"]);
    expect(check.problems[1]).toEqual({
      kind: "count",
      message: "There are 10 white stickers, but a cube has 9.",
      facelets: [],
    });
    expect(check.state).toBeNull();
  });

  it("flags too many of a color even while stickers are blank", () => {
    const draft = edit(EMPTY_DRAFT, ...[0, 2, 6, 8, 9, 11, 15, 17, 18, 20].map((i): [number, string] => [i, "U"]));
    expect(kinds(draft)).toContain("count");
  });

  it("flags two stickers of one color on a piece as soon as both are placed", () => {
    // UF edge: white + white, rest of the cube still blank.
    const draft = edit(EMPTY_DRAFT, [7, "U"], [19, "U"]);
    const [problem] = checkFacelets(draft).problems;
    expect(problem).toMatchObject({ kind: "repeated-color", facelets: [7, 19] });
    expect(problem.message).toBe("The top front edge has two white stickers; every piece has different colors.");
  });

  it("flags opposite colors on a part-filled corner", () => {
    const draft = edit(EMPTY_DRAFT, [8, "U"], [20, "D"]); // URF: white top, yellow front
    const [problem] = checkFacelets(draft).problems;
    expect(problem).toMatchObject({ kind: "opposite-colors", facelets: [8, 9, 20] });
    expect(problem.message).toContain("top front right corner has white and yellow");
  });

  it("flags a corner whose colors are a mirror image of a real corner", () => {
    // URF with its R and F stickers swapped: white, green, red clockwise.
    const draft = swap(SOLVED_FACELETS, 9, 20);
    const check = checkFacelets(draft);
    expect(check.problems).toEqual([
      expect.objectContaining({ kind: "mirrored-corner", facelets: [8, 9, 20] }),
    ]);
    expect(check.problems[0].message).toContain("mirror image of the white-green-red corner");
  });

  it("flags a piece that appears twice, marking both", () => {
    // Paint UL's stickers like UR's: two white-red edges (and 10 red / 8 orange).
    const draft = edit(SOLVED_FACELETS, [3, "U"], [37, "R"]);
    const dup = checkFacelets(draft).problems.find((p) => p.kind === "duplicate-piece")!;
    expect(dup.message).toBe("There are 2 white-red edges, but a cube has one. One of them has a wrong sticker.");
    expect(dup.facelets.sort((a, b) => a - b)).toEqual([3, 5, 10, 37]);
  });

  it("flags a twisted corner", () => {
    // Turn URF's three stickers one step.
    const [a, b, c] = CORNER_FACELETS[0];
    const draft = edit(SCRAMBLED, [a, SCRAMBLED[c]], [b, SCRAMBLED[a]], [c, SCRAMBLED[b]]);
    expect(kinds(draft)).toEqual(["corner-twist"]);
  });

  it("flags a flipped edge", () => {
    const [a, b] = EDGE_FACELETS[5];
    expect(kinds(swap(SCRAMBLED, a, b))).toEqual(["edge-flip"]);
  });

  it("flags two swapped pieces (parity)", () => {
    // Swap the UF and UB edges whole.
    const [f1, f2] = EDGE_FACELETS[1];
    const [b1, b2] = EDGE_FACELETS[3];
    expect(kinds(swap(swap(SCRAMBLED, f1, b1), f2, b2))).toEqual(["parity"]);
    // Two corners swapped, likewise.
    const [x1, x2, x3] = CORNER_FACELETS[4];
    const [y1, y2, y3] = CORNER_FACELETS[6];
    expect(kinds(swap(swap(swap(SCRAMBLED, x1, y1), x2, y2), x3, y3))).toEqual(["parity"]);
  });

  it("accepts a cube with two edges and two corners swapped (even overall)", () => {
    const [f1, f2] = EDGE_FACELETS[1];
    const [b1, b2] = EDGE_FACELETS[3];
    const [x1, x2, x3] = CORNER_FACELETS[0];
    const [y1, y2, y3] = CORNER_FACELETS[1];
    const draft = swap(swap(swap(swap(swap(SOLVED_FACELETS, f1, b1), f2, b2), x1, y1), x2, y2), x3, y3);
    expect(kinds(draft)).toEqual([]);
  });

  it("reports every combination of twist, flip and parity together", () => {
    const [a, b, c] = CORNER_FACELETS[2];
    let draft = edit(SOLVED_FACELETS, [a, SOLVED_FACELETS[c]], [b, SOLVED_FACELETS[a]], [c, SOLVED_FACELETS[b]]);
    draft = swap(draft, ...EDGE_FACELETS[0]);
    const [f1, f2] = EDGE_FACELETS[8];
    const [b1, b2] = EDGE_FACELETS[9];
    draft = swap(swap(draft, f1, b1), f2, b2);
    expect(kinds(draft)).toEqual(["corner-twist", "edge-flip", "parity"]);
  });

  it("requires the standard centers", () => {
    const draft = swap(EMPTY_DRAFT, 4, 22);
    expect(checkFacelets(draft).problems[0]).toMatchObject({ kind: "centers", facelets: [4, 22] });
  });
});

describe("parseDraft", () => {
  it("accepts full and part-filled drafts", () => {
    expect(parseDraft(SCRAMBLED)).toBe(SCRAMBLED);
    expect(parseDraft(EMPTY_DRAFT)).toBe(EMPTY_DRAFT);
  });

  it("rejects anything else", () => {
    expect(parseDraft(undefined)).toBeNull();
    expect(parseDraft("")).toBeNull();
    expect(parseDraft(SCRAMBLED.slice(1))).toBeNull();
    expect(parseDraft(SCRAMBLED.toLowerCase())).toBeNull();
    expect(parseDraft(edit(SCRAMBLED, [0, "X"]))).toBeNull();
    expect(parseDraft(swap(SOLVED_FACELETS, 4, 13))).toBeNull(); // centers moved
  });
});
