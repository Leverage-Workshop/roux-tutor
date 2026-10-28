import { describe, expect, it } from "vitest";
import { applyMoves, solvedState, type CubeState } from "@/lib/cube/model";
import { invertAlgorithm, parseAlgorithm, type Move } from "@/lib/cube/notation";
import { CMLL_SETS, cmllCases, type CmllSet } from "./cmllCases";
import { isFirstBlockSolved } from "./firstBlock";
import { isSecondBlockSolved } from "./secondBlock";

const AUFS: Move[][] = [[], ["U"], ["U'"], ["U2"]];
const cornerKey = (s: CubeState) => [0, 1, 2, 3].map((i) => `${s.cp[i]}${s.co[i]}`).join("");
const cornersSolved = (s: CubeState) => cornerKey(s) === "00102030";

/**
 * The same case seen with any top-layer turn before and after: the smallest
 * corner key over all 16 ways (U^b, then the case, then U^a).
 */
function caseClass(moves: readonly Move[]): string {
  const start = invertAlgorithm(moves);
  return AUFS.flatMap((b) => AUFS.map((a) => cornerKey(applyMoves(solvedState(), [...b, ...start, ...a])))).sort()[0];
}

/**
 * The set a case belongs to, from how its corners are twisted alone (cubejs
 * corner orientation: 0 = top color on top). Corners in cubejs order go
 * round the top layer, so patterns are compared up to rotation.
 */
function setOf(co: readonly number[]): CmllSet {
  const twists = co.slice(0, 4);
  const rotations = [0, 1, 2, 3].map((r) => [...twists.slice(r), ...twists.slice(0, r)].join(""));
  const zeros = twists.filter((t) => t === 0).length;
  if (zeros === 4) return "O";
  if (zeros === 1) return twists.filter((t) => t === 2).length === 3 ? "S" : "AS";
  if (zeros === 0) return twists[0] === twists[2] ? "H" : "Pi";
  if (twists[0] === twists[2] || twists[1] === twists[3]) return "L";
  return rotations.includes("2100") ? "U" : "T";
}

describe("CMLL case table", () => {
  const cases = cmllCases();

  it("has the 42 cases in the usual 8 sets, with unique ids and names", () => {
    const perSet = Object.fromEntries(Object.keys(CMLL_SETS).map((set) => [set, cases.filter((c) => c.set === set).length]));
    expect(perSet).toEqual({ O: 2, H: 4, Pi: 6, U: 6, T: 6, S: 6, AS: 6, L: 6 });
    expect(new Set(cases.map((c) => c.id)).size).toBe(42);
    expect(new Set(cases.map((c) => c.name)).size).toBe(42);
    for (const c of cases) expect(c.moves).toEqual(parseAlgorithm(c.alg));
  });

  it("every algorithm keeps both blocks solved and turns no whole cube", () => {
    for (const c of cases) {
      expect(c.moves.some((m) => /^[xyz]/.test(m)), c.alg).toBe(false);
      const after = applyMoves(solvedState(), c.moves);
      expect(isFirstBlockSolved(after), c.alg).toBe(true);
      expect(isSecondBlockSolved(after), c.alg).toBe(true);
      // Left and right centers stay put (also part of the two block checks).
      expect([after.center[1], after.center[4]], c.alg).toEqual([1, 4]);
      // Only the top layer's corners move.
      expect(after.cp.slice(4), c.alg).toEqual([4, 5, 6, 7]);
    }
  });

  it("every algorithm solves its case, also with the middle slice turned", () => {
    for (const c of cases) {
      for (const slice of ["", "M", "M2", "M'"]) {
        const start = applyMoves(solvedState(), [...parseAlgorithm(slice), ...invertAlgorithm(c.moves)]);
        expect(cornersSolved(start), c.alg).toBe(false);
        const end = applyMoves(start, c.moves);
        expect(cornersSolved(end) && isFirstBlockSolved(end) && isSecondBlockSolved(end), `${slice} ${c.alg}`).toBe(true);
      }
    }
  });

  it("puts every algorithm in the set its corner twists belong to", () => {
    for (const c of cases) {
      expect(setOf(applyMoves(solvedState(), invertAlgorithm(c.moves)).co), `${c.name}: ${c.alg}`).toBe(c.set);
    }
  });

  it("solves 42 different cases, none of them a turned solved layer", () => {
    const classes = cases.map((c) => caseClass(c.moves));
    expect(new Set(classes).size).toBe(42);
    expect(classes).not.toContain(caseClass([]));
  });

  it("names the swap cases and well-known algorithms", () => {
    const byId = new Map(cases.map((c) => [c.id, c]));
    expect(byId.get("s-1")).toMatchObject({ set: "S", name: "S 1", nickname: "Sune", alg: "R U R' U R U2 R'" });
    expect(byId.get("as-1")).toMatchObject({ set: "AS", name: "AS 1", nickname: "Anti-Sune" });
    // Adjacent swap: up to a top-layer turn, two neighboring corners trade
    // places (cubejs lists the top corners in order around the layer).
    const swapped = (id: string) =>
      [[], ["U"], ["U'"], ["U2"]].map((auf) => {
        const cp = applyMoves(solvedState(), [...invertAlgorithm(byId.get(id)!.moves), ...(auf as Move[])]).cp;
        return [0, 1, 2, 3].filter((i) => cp[i] !== i);
      });
    expect(swapped("o-adjacent").some((moved) => moved.length === 2 && (moved[1] - moved[0]) % 2 === 1)).toBe(true);
    // Diagonal swap: two opposite corners trade places, the others stay.
    expect(swapped("o-diagonal").some((moved) => moved.length === 2 && moved[1] - moved[0] === 2)).toBe(true);
  });

  it("gives every case its own recognition note", () => {
    expect(new Set(cases.map((c) => c.recognition)).size).toBe(42);
    for (const c of cases) expect(c.recognition).toMatch(/^Top color: /);
    // Sune, checked by hand against the usual Sune picture: top color on top
    // at front-left only, the other three show it on the front, right and back.
    expect(cases.find((c) => c.id === "s-1")!.recognition).toBe(
      "Top color: on top at front-left; facing front at front-right; facing right at back-right; facing back at back-left. " +
        "Left side: neighboring colors. The front-left corner's front sticker and the front-right corner's right sticker match.",
    );
    expect(cases.find((c) => c.id === "o-diagonal")!.recognition).toBe(
      "Top color: on top at all four corners. Left side: opposite colors. Front side: opposite colors. Right side: opposite colors. Back side: opposite colors.",
    );
  });
});
