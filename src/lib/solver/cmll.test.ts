import { describe, expect, it } from "vitest";
import { applyMoves, solvedState, type CubeState } from "@/lib/cube/model";
import { invertAlgorithm, parseAlgorithm, type Move } from "@/lib/cube/notation";
import { cmllStateCount, isCmllSolved, solveCmll, solveThroughCmll } from "./cmll";
import { cmllCases } from "./cmllCases";
import { isFirstBlockSolved } from "./firstBlock";
import { isSecondBlockSolved } from "./secondBlock";

const SCRAMBLE_MOVES = parseAlgorithm("U U' U2 D D' D2 F F' F2 B B' B2 L L' L2 R R' R2");

/** Repeatable random-move scrambles (Park-Miller generator, fixed seed). */
function scrambles(count: number, length = 25): Move[][] {
  let seed = 8202610;
  const next = () => (seed = (seed * 48271) % 2147483647);
  return Array.from({ length: count }, () => {
    const moves: Move[] = [];
    while (moves.length < length) {
      const move = SCRAMBLE_MOVES[next() % SCRAMBLE_MOVES.length];
      if (moves.length > 0 && moves[moves.length - 1][0] === move[0]) continue;
      moves.push(move);
    }
    return moves;
  });
}

const scrambled = (alg: string | Move[]): CubeState => applyMoves(solvedState(), alg);
const stepSummary = (steps: { id: string; moves: Move[] }[]) => steps.map((s) => [s.id, s.moves.join(" ")]);
const blocksSolved = (s: CubeState) => isFirstBlockSolved(s) && isSecondBlockSolved(s);

function permutations(items: number[]): number[][] {
  if (items.length <= 1) return [items];
  return items.flatMap((x, i) => permutations([...items.slice(0, i), ...items.slice(i + 1)]).map((p) => [x, ...p]));
}
const isOdd = (p: number[]) => p.flatMap((a, i) => p.slice(i + 1).filter((b) => b < a)).length % 2 === 1;

/**
 * Every arrangement of the four top corners (24 orders x 27 twists that add
 * up to a whole turn) on a cube whose blocks are solved. An odd corner order
 * gets an odd edge order too (UL and UR swapped), so the cube stays real.
 */
function allTopCornerStates(): CubeState[] {
  const states: CubeState[] = [];
  for (const order of permutations([0, 1, 2, 3])) {
    for (let t = 0; t < 27; t++) {
      const twist = [t % 3, Math.floor(t / 3) % 3, Math.floor(t / 9)];
      twist.push((6 - twist[0] - twist[1] - twist[2]) % 3);
      const state = solvedState();
      state.cp = [...order, 4, 5, 6, 7];
      state.co = [...twist, 0, 0, 0, 0];
      if (isOdd(order)) [state.ep[0], state.ep[2]] = [state.ep[2], state.ep[0]];
      states.push(state);
    }
  }
  return states;
}

describe("isCmllSolved", () => {
  it("is true once blocks and top corners are solved, whatever the middle slice and edges do", () => {
    expect(isCmllSolved(solvedState())).toBe(true);
    expect(isCmllSolved(scrambled("M2"))).toBe(true);
    expect(isCmllSolved(scrambled("M' U2 M U M2"))).toBe(false); // U turned the corners
    expect(isCmllSolved(scrambled("M' U2 M U2 M2"))).toBe(true);
  });

  it("is false when a corner is out of place or a block is broken", () => {
    for (const alg of ["U", "R U2 R' U' R U' R'", "R", "L", "F", "x"]) {
      expect(isCmllSolved(scrambled(alg)), alg).toBe(false);
    }
  });
});

describe("solveCmll", () => {
  it("does nothing on a solved cube", () => {
    expect(solveCmll(solvedState())).toEqual({ moves: [], steps: [], case: null });
  });

  it("needs both blocks solved", () => {
    expect(() => solveCmll(scrambled("R"))).toThrow(/blocks/);
    expect(() => solveCmll(scrambled("L"))).toThrow(/blocks/);
  });

  it("only turns the top layer when the corners are solved but turned (CMLL skip)", () => {
    const solution = solveCmll(scrambled("U"));
    expect(stepSummary(solution.steps)).toEqual([["cmll-post-auf", "U'"]]);
    expect(solution.case).toBeNull();
    expect(solution.steps[0].name).toMatch(/CMLL skip/);
  });

  it("recognizes a Sune and solves it with the Sune", () => {
    const solution = solveCmll(scrambled("R U2 R' U' R U' R'"));
    expect(stepSummary(solution.steps)).toEqual([["cmll", "R U R' U R U2 R'"]]);
    expect(solution.case).toMatchObject({ id: "s-1", set: "S", name: "S 1", nickname: "Sune" });
    expect(solution.steps[0].name).toBe("CMLL: Sune case (S 1)");
    expect(solution.steps[0].case?.id).toBe("s-1");
    expect(solution.steps[0].goal).toContain(solution.case!.recognition);
  });

  it("turns the top layer first when the case is held the wrong way", () => {
    // The Sune case, then U': the solve must undo the U' before the Sune.
    const solution = solveCmll(scrambled("R U2 R' U' R U' R' U'"));
    expect(stepSummary(solution.steps)).toEqual([
      ["cmll-pre-auf", "U"],
      ["cmll", "R U R' U R U2 R'"],
    ]);
  });

  it("finishes with a top-layer turn when the algorithm leaves the corners turned", () => {
    // U2 after the T 1 algorithm: undoing it leaves a T case that ends one U2 off.
    const solution = solveCmll(scrambled("U2 F R' F' R U R U' R'"));
    expect(stepSummary(solution.steps)).toEqual([
      ["cmll", "R U R' U' R' F R F'"],
      ["cmll-post-auf", "U2"],
    ]);
    expect(solution.case?.id).toBe("t-1");
  });

  it("solves the adjacent corner swap with the O Adjacent algorithm", () => {
    const solution = solveCmll(scrambled(invertAlgorithm(parseAlgorithm("R U R' F' R U R' U' R' F R2 U' R'"))));
    expect(solution.steps.map((s) => s.name)).toEqual(["CMLL: O case (O Adjacent, Jb perm)"]);
  });

  it("solves all 648 top-corner states, keeping both blocks solved", () => {
    const states = allTopCornerStates();
    expect(states.length).toBe(648);
    expect(cmllStateCount()).toBe(647);
    const usedCases = new Set<string>();
    states.forEach((corners, i) => {
      // Turn the middle slice on some of them: CMLL must not care.
      const state = applyMoves(corners, ["", "M", "M2", "M'"][i % 4]);
      const where = `${state.cp.join("")}/${state.co.join("")}`;
      expect(blocksSolved(state), where).toBe(true);
      const solution = solveCmll(state);
      const end = applyMoves(state, solution.moves);
      expect(isCmllSolved(end), where).toBe(true);
      expect([end.center[1], end.center[4]], where).toEqual([1, 4]);
      expect(solution.moves).toEqual(solution.steps.flatMap((s) => s.moves));
      const ids: string[] = solution.steps.map((s) => s.id);
      expect(["cmll-pre-auf", "cmll", "cmll-post-auf"].filter((id) => ids.includes(id)), where).toEqual(ids);
      for (const step of solution.steps) {
        expect(step.moves.length, where).toBeGreaterThan(0);
        expect(step.name.length > 0 && step.goal.length > 0, where).toBe(true);
        if (step.id !== "cmll") expect(step.moves.length === 1 && /^U[2']?$/.test(step.moves[0]), where).toBe(true);
        else expect(step.moves).toEqual(step.case?.moves);
      }
      // Pre- and post-AUF never run into the algorithm on the same layer.
      for (let m = 1; m < solution.moves.length; m++) {
        expect(solution.moves[m][0], where).not.toBe(solution.moves[m - 1][0]);
      }
      if (solution.case) usedCases.add(solution.case.id);
    });
    expect(usedCases.size).toBe(42);
  });

  it("uses the fewest moves possible from the table", () => {
    // For every state, no other pre-AUF / algorithm / post-AUF from the table is shorter.
    const lengths = new Map<string, number>();
    const AUFS: Move[][] = [[], ["U"], ["U'"], ["U2"]];
    for (const c of [{ moves: [] as Move[] }, ...cmllCases()]) {
      for (const pre of AUFS) {
        for (const post of AUFS) {
          const moves = [...pre, ...c.moves, ...post];
          const start = applyMoves(solvedState(), invertAlgorithm(moves));
          const key = `${start.cp.join("")}${start.co.join("")}`;
          lengths.set(key, Math.min(lengths.get(key) ?? Infinity, moves.length));
        }
      }
    }
    for (const state of allTopCornerStates()) {
      expect(solveCmll(state).moves.length).toBe(lengths.get(`${state.cp.join("")}${state.co.join("")}`));
    }
  });
});

describe("solveThroughCmll", () => {
  it("builds both blocks and solves the top corners on 120 random scrambles", () => {
    let centersTurned = 0;
    for (const scramble of scrambles(120)) {
      const label = scramble.join(" ");
      const start = scrambled(scramble);
      const solution = solveThroughCmll(start);
      expect(solution.moves, label).toEqual([
        ...solution.firstBlock.moves,
        ...solution.secondBlock.moves,
        ...solution.cmll.moves,
      ]);
      const afterBlocks = applyMoves(start, [...solution.firstBlock.moves, ...solution.secondBlock.moves]);
      expect(blocksSolved(afterBlocks), label).toBe(true);
      if ([0, 2, 3, 5].some((i) => afterBlocks.center[i] !== i)) centersTurned++;
      const end = applyMoves(start, solution.moves);
      expect(isCmllSolved(end), label).toBe(true);
      expect(solution.cmll.moves.length, label).toBeLessThanOrEqual(17);
    }
    // Most solves reach CMLL with the middle slice turned.
    expect(centersTurned).toBeGreaterThan(30);
  });

  it("explains turned middle centers when the blocks left them turned", () => {
    // M2 turns the middle slice; then a Sune case.
    const state = scrambled("M2 R U2 R' U' R U' R'");
    const solution = solveCmll(state);
    expect(solution.steps[0].goal).toMatch(/top center may show another color/);
    expect(solveCmll(scrambled("R U2 R' U' R U' R'")).steps[0].goal).not.toMatch(/top center/);
  });
});
