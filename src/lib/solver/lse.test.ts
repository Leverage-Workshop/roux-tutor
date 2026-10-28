import { describe, expect, it } from "vitest";
import { applyMoves, isSolved, solvedState, type CubeState } from "@/lib/cube/model";
import { type Move } from "@/lib/cube/notation";
import { EDGES } from "./pieces";
import { isLseSolved, lseBadEdges, lseStateCounts, solveLse, type LseSolution } from "./lse";

const LSE_MOVES: Move[] = ["U", "U'", "U2", "M", "M'", "M2"];
const scrambled = (alg: string | Move[]): CubeState => applyMoves(solvedState(), alg);
const stepSummary = (solution: LseSolution) => solution.steps.map((s) => [s.id, s.moves.join(" ")]);
const key = (s: CubeState) => JSON.stringify(s);

/** Repeatable random U/M sequences (Park-Miller generator, fixed seed). */
function randomLseAlgs(count: number, length = 40): Move[][] {
  let seed = 9202610;
  const next = () => (seed = (seed * 48271) % 2147483647);
  return Array.from({ length: count }, () => Array.from({ length }, () => LSE_MOVES[next() % LSE_MOVES.length]));
}

/** UL and UR each between their own corners: home, or swapped with the top layer a half turn off. */
function ulurPlaced(s: CubeState): boolean {
  const ul = s.ep[EDGES.UL];
  const ur = s.ep[EDGES.UR];
  const top = s.cp.slice(0, 4).join("");
  return (top === "0123" && ul === EDGES.UL && ur === EDGES.UR) || (top === "2301" && ul === EDGES.UR && ur === EDGES.UL);
}

const PHASE_ORDER = ["lse-eo", "lse-ulur", "lse-ep"];
const CASE_PATTERN: Record<string, RegExp> = {
  "lse-eo": /^eo-(1-1|2-0-(adjacent|opposite)|0-2|3-1|4-0|2-2-(adjacent|opposite)|6-flip)$/,
  "lse-ulur": /^ulur-(top-auf|both-top|top-bottom|both-bottom)$/,
  "lse-ep": /^ep-(centers|3-cycle-(uf|df|db|ub)|swap-(front-back|top-bottom|diagonal))$/,
};

/**
 * Solve with solveLse and check every phase on the real cube: only U and M
 * turns; after EO all six edges are good; UL/UR and EP never make an edge
 * bad again (checked after every move); after UL/UR those two edges sit
 * between their own corners; after EP the whole cube is solved.
 */
function checkSolve(start: CubeState, where: string): LseSolution {
  const solution = solveLse(start);
  expect(solution.moves, where).toEqual(solution.steps.flatMap((s) => s.moves));
  const ids: string[] = solution.steps.map((s) => s.id);
  expect(PHASE_ORDER.filter((id) => ids.includes(id)), where).toEqual(ids);
  let state = start;
  for (const step of solution.steps) {
    expect(step.moves.length, where).toBeGreaterThan(0);
    expect(step.name.length > 0 && step.goal.length > 0, where).toBe(true);
    expect(step.case.id, where).toMatch(CASE_PATTERN[step.id]);
    expect(step.goal, where).toContain(step.case.recognition);
    for (const move of step.moves) {
      expect(LSE_MOVES, where).toContain(move);
      state = applyMoves(state, [move]);
      if (step.id !== "lse-eo") expect(lseBadEdges(state), `${where} ${step.id} ${move}`).toEqual([]);
    }
    if (step.id === "lse-eo") expect(lseBadEdges(state), where).toEqual([]);
    if (step.id === "lse-ulur") expect(ulurPlaced(state), where).toBe(true);
  }
  expect(isLseSolved(state), where).toBe(true);
  expect(isSolved(state), where).toBe(true);
  // Steps never start on the layer the step before ended on (true for every LSE state seen so far).
  for (let i = 1; i < solution.steps.length; i++) {
    expect(solution.steps[i].moves[0][0], where).not.toBe(solution.steps[i - 1].moves.at(-1)![0]);
  }
  return solution;
}

/** Every LSE state with all edges good, found by turning U and M from solved without making an edge bad. */
let oriented: CubeState[] | undefined;
function allOrientedStates(): CubeState[] {
  if (oriented) return oriented;
  const seen = new Map<string, CubeState>([[key(solvedState()), solvedState()]]);
  let frontier = [solvedState()];
  while (frontier.length > 0) {
    const next: CubeState[] = [];
    for (const state of frontier) {
      for (const move of LSE_MOVES) {
        const moved = applyMoves(state, [move]);
        const k = key(moved);
        if (!seen.has(k) && lseBadEdges(moved).length === 0) {
          seen.set(k, moved);
          next.push(moved);
        }
      }
    }
    frontier = next;
  }
  oriented = [...seen.values()];
  return oriented;
}

const LSE_POSITIONS = [EDGES.UR, EDGES.UF, EDGES.UL, EDGES.UB, EDGES.DF, EDGES.DB];
/** The 32 ways to flip an even number of the six LSE edges, as bit masks. */
const EVEN_FLIPS = Array.from({ length: 64 }, (_, m) => m).filter(
  (m) => [0, 1, 2, 3, 4, 5].filter((b) => (m >> b) & 1).length % 2 === 0,
);
function flipEdges(state: CubeState, mask: number): CubeState {
  const eo = [...state.eo];
  LSE_POSITIONS.forEach((pos, b) => {
    if ((mask >> b) & 1) eo[pos] ^= 1;
  });
  return { ...state, eo };
}

describe("LSE state space", () => {
  it("has 184,320 states, 5,760 of them with all edges good, and every phase can finish from all of them", () => {
    expect(lseStateCounts()).toEqual({ reachable: 184320, good: 5760, eo: 184320, ulur: 5760, ep: 5760 });
  });
});

describe("isLseSolved", () => {
  it("needs every piece and center home, held the standard way", () => {
    expect(isLseSolved(solvedState())).toBe(true);
    for (const alg of ["M", "M2", "U", "x", "y2", "M U2 M' U2"]) {
      expect(isLseSolved(scrambled(alg)), alg).toBe(false);
    }
    // The cube model's isSolved ignores how the cube is held.
    expect(isSolved(scrambled("x"))).toBe(true);
  });
});

describe("lseBadEdges", () => {
  it("names the bad edges, judged with the middle slice turned back", () => {
    expect(lseBadEdges(solvedState())).toEqual([]);
    // A turned middle slice alone leaves every edge good.
    expect(lseBadEdges(scrambled("M"))).toEqual([]);
    expect(lseBadEdges(scrambled("M2 U"))).toEqual([]);
    expect(lseBadEdges(scrambled("M U M'"))).toEqual(["UR", "UL", "UB", "DB"]);
    expect(lseBadEdges(scrambled("M U"))).toEqual(["UR", "UF", "UL", "UB"]);
  });

  it("needs both blocks and the top corners", () => {
    expect(() => lseBadEdges(scrambled("R"))).toThrow(/top corners/);
  });
});

describe("solveLse", () => {
  it("does nothing on a solved cube", () => {
    expect(solveLse(solvedState())).toEqual({ moves: [], steps: [] });
  });

  it("needs both blocks and the top corners solved", () => {
    expect(() => solveLse(scrambled("R"))).toThrow(/top corners/);
    expect(() => solveLse(scrambled("L"))).toThrow(/top corners/);
    expect(() => solveLse(scrambled("R U2 R' U' R U' R'"))).toThrow(/top corners/); // Sune case: corners unsolved
  });

  it("solves an arrow EO case (3 bad on top, 1 on the bottom)", () => {
    const solution = solveLse(scrambled("M U M'"));
    expect(stepSummary(solution)).toEqual([
      ["lse-eo", "M U'"],
      ["lse-ep", "M'"],
    ]);
    const [eo, ep] = solution.steps;
    expect(eo.case.id).toBe("eo-3-1");
    expect(eo.name).toBe("Orient edges: arrow (3 bad on top, 1 on the bottom)");
    expect(eo.goal).toContain("Bad edges: top right (UR), top left (UL), top back (UB) and bottom back (DB).");
    expect(eo.centersOff).toBe(0);
    expect(ep.case.id).toBe("ep-centers");
    expect(ep.centersOff).toBe(1);
    expect(ep.goal).toMatch(/quarter turn off/);
  });

  it("solves a 1-1 EO case (1 bad on top, 1 on the bottom)", () => {
    const solution = solveLse(scrambled("M U M' U M U M'"));
    expect(solution.steps[0]).toMatchObject({
      id: "lse-eo",
      name: "Orient edges: 1-1 (1 bad on top, 1 on the bottom)",
      case: { id: "eo-1-1" },
    });
    expect(solution.steps[0].goal).toContain("Bad edges: top front (UF) and bottom back (DB).");
    expect(solution.moves.length).toBe(7);
  });

  it("reads bad edges the other way round for the middle slice while it is a quarter turn off", () => {
    // After M U the middle slice is off; the four top edges count as bad.
    const solution = solveLse(scrambled("M U"));
    expect(solution.steps[0]).toMatchObject({ id: "lse-eo", case: { id: "eo-4-0" }, moves: ["U'"] });
    expect(solution.steps[0].goal).toMatch(/picture it turned back/);
  });

  it("solves a 3-cycle of middle-slice edges like a U perm", () => {
    const solution = solveLse(scrambled("M' U2 M U2"));
    expect(stepSummary(solution)).toEqual([["lse-ep", "U2 M' U2 M"]]);
    expect(solution.steps[0].case.id).toBe("ep-3-cycle-db");
    expect(solution.steps[0].name).toBe("Solve the middle slice: 3-cycle (yellow-blue in place)");
  });

  it("solves two swaps with M2 U2 M2 U2", () => {
    const solution = solveLse(scrambled("M2 U2 M2 U2"));
    expect(solution.steps.map((s) => s.case.id)).toEqual(["ep-swap-front-back"]);
    expect(solution.moves.length).toBe(4);
  });

  it("only turns the middle slice when the edges match the centers", () => {
    expect(stepSummary(solveLse(scrambled("M")))).toEqual([["lse-ep", "M'"]]);
    expect(stepSummary(solveLse(scrambled("M2")))).toEqual([["lse-ep", "M2"]]);
  });

  it("lines up UL and UR with a top-layer turn", () => {
    const solution = solveLse(scrambled("U"));
    expect(stepSummary(solution)).toEqual([["lse-ulur", "U'"]]);
    expect(solution.steps[0].case.id).toBe("ulur-top-auf");
  });

  it("may leave the top layer a half turn off after UL/UR, turning it back in the last step", () => {
    // UL and UR end swapped above their own corners; 4c then turns the top layer back.
    const solution = solveLse(scrambled("M' U2 M U"));
    expect(stepSummary(solution)).toEqual([
      ["lse-ulur", "U'"],
      ["lse-ep", "M' U2 M"],
    ]);
    expect(solution.steps[1].goal).toMatch(/half turn off/);
  });

  it("doesn't start on the layer the move before LSE ended on when an equally short solve exists", () => {
    const state = scrambled("M2 U2 M2 U2");
    expect(solveLse(state, { previousMove: "U" }).moves).toEqual(["M2", "U2", "M2", "U2"]);
    expect(solveLse(state, { previousMove: "M'" }).moves).toEqual(["U2", "M2", "U2", "M2"]);
  });

  it("solves all 5,760 states whose edges are already good, without ever making one bad", () => {
    const states = allOrientedStates();
    expect(states.length).toBe(5760);
    states.forEach((state, i) => {
      const solution = checkSolve(state, `oriented #${i}`);
      expect(solution.steps.some((s) => s.id === "lse-eo")).toBe(false);
    });
  }, 30_000);

  it("solves every edge flip pattern on a spread of states (all 32 x 180 sampled states)", () => {
    const sample = allOrientedStates().filter((_, i) => i % 32 === 0);
    const eoCases = new Set<string>();
    for (const [i, state] of sample.entries()) {
      for (const mask of EVEN_FLIPS) {
        const solution = checkSolve(flipEdges(state, mask), `sample #${i} flips ${mask}`);
        expect(solution.steps.some((s) => s.id === "lse-eo"), `${i}/${mask}`).toBe(mask !== 0);
        if (solution.steps[0]?.id === "lse-eo") eoCases.add(solution.steps[0].case.id);
      }
    }
    expect([...eoCases].sort()).toEqual([
      "eo-0-2", "eo-1-1", "eo-2-0-adjacent", "eo-2-0-opposite", "eo-2-2-adjacent", "eo-2-2-opposite", "eo-3-1", "eo-4-0", "eo-6-flip",
    ]);
  }, 30_000);

  it("solves 3,000 random LSE states with the top layer and middle slice turned any way", () => {
    let total = 0;
    const cases = new Set<string>();
    for (const [i, alg] of randomLseAlgs(3000).entries()) {
      const solution = checkSolve(scrambled(alg), `random #${i}: ${alg.join(" ")}`);
      total += solution.moves.length;
      expect(solution.moves.length).toBeLessThanOrEqual(20);
      for (const s of solution.steps) cases.add(s.case.id);
    }
    expect(total / 3000).toBeLessThan(12);
    // Every UL/UR and EP case shows up.
    for (const id of ["ulur-top-auf", "ulur-both-top", "ulur-top-bottom", "ulur-both-bottom", "ep-centers", "ep-swap-diagonal", "ep-swap-top-bottom", "ep-swap-front-back"]) {
      expect(cases.has(id), id).toBe(true);
    }
  }, 30_000);
});
