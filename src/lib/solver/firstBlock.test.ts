import { describe, expect, it } from "vitest";
import { applyMoves, solvedState, type CubeState } from "@/lib/cube/model";
import { parseAlgorithm, type Move } from "@/lib/cube/notation";
import { DEMO_LESSON } from "@/lib/tutor/demoLesson";
import { isFirstBlockSolved, orientationMoves, solveFirstBlock } from "./firstBlock";
import { CORNERS, EDGES, homeCoord, pieceCoord, type TrackedPiece } from "./pieces";

const SCRAMBLE_MOVES = parseAlgorithm("U U' U2 D D' D2 F F' F2 B B' B2 L L' L2 R R' R2");

/** Repeatable random-move scrambles (Park-Miller generator, fixed seed). */
function scrambles(count: number, length = 25): Move[][] {
  let seed = 20261028;
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

const DL: TrackedPiece = { kind: "edge", piece: EDGES.DL };
const FRONT_PAIR: TrackedPiece[] = [DL, { kind: "edge", piece: EDGES.FL }, { kind: "corner", piece: CORNERS.DLF }];
const BACK_PAIR: TrackedPiece[] = [DL, { kind: "edge", piece: EDGES.BL }, { kind: "corner", piece: CORNERS.DBL }];
const allHome = (state: CubeState, pieces: TrackedPiece[]) =>
  pieces.every((p) => pieceCoord(state, p) === homeCoord(p));

describe("isFirstBlockSolved", () => {
  it("is true on a solved cube and after moves that leave the left block alone", () => {
    expect(isFirstBlockSolved(solvedState())).toBe(true);
    expect(isFirstBlockSolved(scrambled("R U R' U' M r2 U2 M'"))).toBe(true);
  });

  it("is false once the left block is disturbed or the cube is turned over", () => {
    expect(isFirstBlockSolved(scrambled("L"))).toBe(false);
    expect(isFirstBlockSolved(scrambled("F"))).toBe(false);
    expect(isFirstBlockSolved(scrambled("D"))).toBe(false);
    expect(isFirstBlockSolved(scrambled("x"))).toBe(false);
  });
});

describe("orientationMoves", () => {
  it("needs no rotation when orange is left and yellow is down", () => {
    expect(orientationMoves(scrambled("R U F' D2 L B"))).toEqual([]);
  });

  it("undoes whole-cube rotations and middle-slice offsets", () => {
    for (const alg of ["x", "y", "z2", "x y", "y' z", "M", "M2 E", "r u'"]) {
      const state = scrambled(alg);
      const turned = applyMoves(state, orientationMoves(state));
      expect(turned.center, alg).toEqual([0, 1, 2, 3, 4, 5]);
    }
  });
});

describe("solveFirstBlock", () => {
  it("does nothing on a solved cube", () => {
    const solution = solveFirstBlock(solvedState());
    expect(solution.moves).toEqual([]);
    expect(solution.steps.map((s) => s.id)).toEqual(["dl-edge", "front-pair", "back-pair"]);
  });

  it("does nothing when only the right side is scrambled", () => {
    expect(solveFirstBlock(scrambled("R U R' U2 R2 U' R'")).moves).toEqual([]);
  });

  it("fixes just the broken pair", () => {
    const solution = solveFirstBlock(scrambled("F U F'"));
    // F U F' takes the front pair out; U' F' already puts it back.
    expect(solution.moves).toEqual(["U'", "F'"]);
    const byId = Object.fromEntries(solution.steps.map((s) => [s.id, s.moves]));
    expect(byId["dl-edge"]).toEqual([]);
    expect(byId["back-pair"]).toEqual([]);
    expect(byId["front-pair"]).toEqual(["U'", "F'"]);
  });

  it("builds the block on 100 random scrambles, one piece group per step", () => {
    for (const scramble of scrambles(100)) {
      const label = scramble.join(" ");
      const solution = solveFirstBlock(scrambled(scramble));
      let state = scrambled(scramble);
      for (const step of solution.steps) {
        state = applyMoves(state, step.moves);
        if (step.id === "dl-edge") expect(allHome(state, [DL]), label).toBe(true);
        if (step.id === "front-pair") expect(allHome(state, FRONT_PAIR), label).toBe(true);
        if (step.id === "back-pair") expect(allHome(state, BACK_PAIR), label).toBe(true);
      }
      expect(isFirstBlockSolved(state), label).toBe(true);
      expect(solution.moves).toEqual(solution.steps.flatMap((s) => s.moves));
      // Short enough to follow by hand.
      expect(solution.moves.length, label).toBeLessThanOrEqual(14);
    }
  });

  it("uses face turns only, so every center stays in place", () => {
    for (const scramble of scrambles(30)) {
      const solution = solveFirstBlock(scrambled(scramble));
      for (const move of solution.moves) expect(move).toMatch(/^[UDFBLR][2']?$/);
      expect(applyMoves(scrambled(scramble), solution.moves).center).toEqual([0, 1, 2, 3, 4, 5]);
    }
  });

  it("starts with a rotation when the cube is held another way", () => {
    for (const turn of ["x2", "y", "z' x", "M'"]) {
      const state = scrambled(`${scrambles(1)[0].join(" ")} ${turn}`);
      const solution = solveFirstBlock(state);
      expect(solution.steps[0].id, turn).toBe("orient");
      expect(solution.steps[0].moves.every((m) => /^[xyz]/.test(m)), turn).toBe(true);
      expect(isFirstBlockSolved(applyMoves(state, solution.moves)), turn).toBe(true);
    }
  });

  it("gives every step a name and a goal for the tutor", () => {
    const solution = solveFirstBlock(scrambled("x " + scrambles(1)[0].join(" ")));
    for (const step of solution.steps) {
      expect(step.name.length).toBeGreaterThan(0);
      expect(step.goal.length).toBeGreaterThan(0);
    }
  });

  it("solves the demo lesson's scramble", () => {
    const demoStart = applyMoves(solvedState(), DEMO_LESSON.scramble);
    const solution = solveFirstBlock(demoStart);
    expect(isFirstBlockSolved(applyMoves(demoStart, solution.moves))).toBe(true);
  });
});
