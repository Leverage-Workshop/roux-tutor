import { describe, expect, it } from "vitest";
import { applyMoves, solvedState, type CubeState } from "@/lib/cube/model";
import { parseAlgorithm, type Move } from "@/lib/cube/notation";
import { DEMO_HELD_SCRAMBLE } from "@/lib/tutor/demoLesson";
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

/**
 * A pair is joined when some whole-cube rotation of the solved cube puts its
 * corner and edge exactly where they are now (checked straight from cubejs).
 */
const ROTATIONS = ["", "x", "x'", "x2", "z", "z'"].flatMap((a) => ["", "y", "y'", "y2"].map((b) => `${a} ${b}`));
function isPairJoined(state: CubeState, [, edge, corner]: TrackedPiece[]): boolean {
  return ROTATIONS.some((rotation) => {
    const turned = applyMoves(solvedState(), rotation);
    return pieceCoord(turned, edge) === pieceCoord(state, edge) && pieceCoord(turned, corner) === pieceCoord(state, corner);
  });
}

/** Neither piece sits in a left-side slot that U, R, r and M can't reach. */
function pairIsFree(state: CubeState, [, edge, corner]: TrackedPiece[]): boolean {
  const edgePos = Math.floor(pieceCoord(state, edge) / 2);
  const cornerPos = Math.floor(pieceCoord(state, corner) / 3);
  return ![EDGES.FL, EDGES.BL, EDGES.DL].includes(edgePos as 9) && ![CORNERS.DLF, CORNERS.DBL].includes(cornerPos as 5);
}

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
    expect(solution.steps).toEqual([]);
  });

  it("does nothing when only the right side is scrambled", () => {
    expect(solveFirstBlock(scrambled("R U R' U2 R2 U' R'")).moves).toEqual([]);
  });

  it("frees, joins and inserts a broken pair", () => {
    // F' drops the front pair to the bottom, U R U' splits it, F puts it back.
    const solution = solveFirstBlock(scrambled("F' U R U' F"));
    expect(solution.steps.map((s) => [s.id, s.moves.join(" ")])).toEqual([
      ["front-pair-free", "F'"],
      ["front-pair-join", "U R'"],
      ["front-pair-insert", "F"],
    ]);
  });

  it("skips joining when the pair is still joined", () => {
    // F U F' lifts the front pair out, but it stays joined.
    const solution = solveFirstBlock(scrambled("F U F'"));
    expect(solution.steps.map((s) => s.id)).toEqual(["front-pair-insert"]);
  });

  it("builds the block on 100 random scrambles, Roux style", () => {
    for (const scramble of scrambles(100)) {
      const label = scramble.join(" ");
      const solution = solveFirstBlock(scrambled(scramble));
      let state = scrambled(scramble);
      const donePairs: TrackedPiece[][] = [];
      for (const step of solution.steps) {
        const pair = step.id.startsWith("front") ? FRONT_PAIR : BACK_PAIR;
        if (step.id.endsWith("-join")) {
          // Joining never touches the left side.
          for (const move of step.moves) expect(move, label).toMatch(/^[URMr][2']?$/);
        }
        if (step.id.endsWith("-insert")) {
          // The pair moves as one piece: joined before and after every move.
          expect(isPairJoined(state, pair), label).toBe(true);
          for (const move of step.moves) {
            state = applyMoves(state, [move]);
            expect(isPairJoined(state, pair), `${label} / ${step.moves.join(" ")}`).toBe(true);
          }
        } else {
          state = applyMoves(state, step.moves);
        }
        if (step.id.endsWith("-free")) {
          expect(pairIsFree(state, pair), label).toBe(true);
        }
        if (step.id.endsWith("-join")) expect(isPairJoined(state, pair), label).toBe(true);
        if (step.id.endsWith("-insert")) donePairs.push(pair);
        // The bottom-left edge and finished pairs stay in place after every step.
        if (step.id !== "orient") expect(allHome(state, [DL, ...donePairs.flat()]), `${label} after ${step.id}`).toBe(true);
      }
      expect(isFirstBlockSolved(state), label).toBe(true);
      expect(solution.moves).toEqual(solution.steps.flatMap((s) => s.moves));
      expect(solution.moves.length, label).toBeLessThanOrEqual(20);
    }
  });

  it("uses slice and wide turns only to join pairs", () => {
    for (const scramble of scrambles(30)) {
      for (const step of solveFirstBlock(scrambled(scramble)).steps) {
        if (step.id.endsWith("-join")) continue;
        for (const move of step.moves) expect(move).toMatch(/^[UDFBLRxyz][2']?$/);
      }
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
    const demoStart = applyMoves(solvedState(), DEMO_HELD_SCRAMBLE);
    const solution = solveFirstBlock(demoStart);
    expect(isFirstBlockSolved(applyMoves(demoStart, solution.moves))).toBe(true);
  });
});
