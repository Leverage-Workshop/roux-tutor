import { describe, expect, it } from "vitest";
import { applyMoves, solvedState, type CubeState } from "@/lib/cube/model";
import { parseAlgorithm, type Move } from "@/lib/cube/notation";
import { DEMO_SCRAMBLE } from "@/lib/tutor/demoLesson";
import { isFirstBlockSolved, solveFirstBlock } from "./firstBlock";
import { CORNERS, EDGES, homeCoord, pieceCoord, type TrackedPiece } from "./pieces";
import { isSecondBlockSolved, solveBlocks, solveSecondBlock } from "./secondBlock";

const SCRAMBLE_MOVES = parseAlgorithm("U U' U2 D D' D2 F F' F2 B B' B2 L L' L2 R R' R2");

/** Repeatable random-move scrambles (Park-Miller generator, fixed seed). */
function scrambles(count: number, length = 25): Move[][] {
  let seed = 7202610;
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
/** A random scramble with its first block already built by solveFirstBlock. */
const afterFirstBlock = (alg: string | Move[]): CubeState => {
  const state = scrambled(alg);
  return applyMoves(state, solveFirstBlock(state).moves);
};

const edge = (piece: number): TrackedPiece => ({ kind: "edge", piece });
const corner = (piece: number): TrackedPiece => ({ kind: "corner", piece });
const DR = edge(EDGES.DR);
const PAIRS: Record<string, [TrackedPiece, TrackedPiece]> = {
  front: [edge(EDGES.FR), corner(CORNERS.DFR)],
  back: [edge(EDGES.BR), corner(CORNERS.DRB)],
};
const allHome = (state: CubeState, pieces: TrackedPiece[]) =>
  pieces.every((p) => pieceCoord(state, p) === homeCoord(p));

/**
 * A pair is joined when some whole-cube rotation of the solved cube puts its
 * corner and edge exactly where they are now (checked straight from cubejs).
 */
const ROTATIONS = ["", "x", "x'", "x2", "z", "z'"].flatMap((a) => ["", "y", "y'", "y2"].map((b) => `${a} ${b}`));
function isPairJoined(state: CubeState, [pairEdge, pairCorner]: TrackedPiece[]): boolean {
  return ROTATIONS.some((rotation) => {
    const turned = applyMoves(solvedState(), rotation);
    return (
      pieceCoord(turned, pairEdge) === pieceCoord(state, pairEdge) &&
      pieceCoord(turned, pairCorner) === pieceCoord(state, pairCorner)
    );
  });
}

/** cubejs lists the four top-layer positions first. */
const cornerPos = (state: CubeState, p: TrackedPiece) => Math.floor(pieceCoord(state, p) / 3);
const edgePos = (state: CubeState, p: TrackedPiece) => Math.floor(pieceCoord(state, p) / 2);
const inTopLayer = (state: CubeState, [pairEdge, pairCorner]: TrackedPiece[]) =>
  cornerPos(state, pairCorner) < 4 && edgePos(state, pairEdge) < 4;

const SB_MOVE = /^[URrM][2']?$/;

describe("isSecondBlockSolved", () => {
  it("is true on a solved cube and after moves that leave the right block alone", () => {
    expect(isSecondBlockSolved(solvedState())).toBe(true);
    expect(isSecondBlockSolved(scrambled("L U M' U2 L' M2 U'"))).toBe(true);
  });

  it("is false once the right block is disturbed or the cube is turned", () => {
    for (const alg of ["R", "r", "U R U'", "F", "D", "B", "x", "y"]) {
      expect(isSecondBlockSolved(scrambled(alg)), alg).toBe(false);
    }
  });
});

describe("solveSecondBlock", () => {
  it("does nothing on a solved cube", () => {
    expect(solveSecondBlock(solvedState())).toEqual({ moves: [], steps: [] });
  });

  it("needs the first block solved", () => {
    expect(() => solveSecondBlock(scrambled("L"))).toThrow(/first block/);
  });

  it("puts back a turned right side as the bottom-right edge step", () => {
    const solution = solveSecondBlock(scrambled("R2"));
    expect(solution.steps.map((s) => [s.id, s.moves.join(" ")])).toEqual([["dr-edge", "R2"]]);
  });

  it("inserts a pair that is still joined without joining it again", () => {
    // R U R' lifts the front-right pair into the top layer in one piece.
    const solution = solveSecondBlock(scrambled("R U R'"));
    expect(solution.steps.map((s) => [s.id, s.moves.join(" ")])).toEqual([["front-right-pair-insert", "R U' R'"]]);
  });

  it("joins a split pair with M, then inserts it", () => {
    // R U' R' leaves the front-right corner on top and its edge at the back.
    const solution = solveSecondBlock(scrambled("R U' R'"));
    expect(solution.steps.map((s) => [s.id, s.moves.join(" ")])).toEqual([
      ["front-right-pair-join", "M"],
      ["front-right-pair-insert", "r U R'"],
    ]);
  });

  it("frees, joins and inserts a pair stuck in its slot", () => {
    // The inverse of the expected solve: the front-right corner sits twisted
    // in its slot and the edge is in the middle slice.
    const solution = solveSecondBlock(scrambled("R U' r' M2 U R U' r'"));
    expect(solution.steps.map((s) => [s.id, s.moves.join(" ")])).toEqual([
      ["front-right-pair-free", "r U R'"],
      ["front-right-pair-join", "U' M2"],
      ["front-right-pair-insert", "r U R'"],
    ]);
  });

  it("skips joining when freeing the pieces already joins them", () => {
    // The front-right pair is broken up inside its own slot.
    const solution = solveSecondBlock(scrambled("R U R' U' R U R'"));
    expect(solution.steps.map((s) => [s.id, s.moves.join(" ")])).toEqual([
      ["front-right-pair-free", "r U' R'"],
      ["front-right-pair-insert", "U R U' R'"],
    ]);
  });

  it("builds the block on 120 random scrambles, Roux style", () => {
    const lengths: number[] = [];
    for (const scramble of scrambles(120)) {
      const label = scramble.join(" ");
      let state = afterFirstBlock(scramble);
      expect(isFirstBlockSolved(state), label).toBe(true);
      const solution = solveSecondBlock(state);
      const done: TrackedPiece[] = [];
      let previous: Move | undefined;
      for (const step of solution.steps) {
        const where = `${label} / ${step.id} ${step.moves.join(" ")}`;
        expect(step.moves.length, where).toBeGreaterThan(0);
        expect(step.name.length > 0 && step.goal.length > 0, where).toBe(true);
        // A step never starts by turning the layer the step before ended on.
        if (previous) expect(step.moves[0][0], where).not.toBe(previous[0]);
        previous = step.moves[step.moves.length - 1];

        const pair = step.id === "dr-edge" ? undefined : PAIRS[step.id.split("-")[0]];
        if (pair && step.id.endsWith("-insert")) {
          // The pair moves as one piece: joined before and after every move.
          expect(isPairJoined(state, pair), where).toBe(true);
        }
        for (const move of step.moves) {
          expect(move, where).toMatch(SB_MOVE);
          state = applyMoves(state, [move]);
          expect(isFirstBlockSolved(state), where).toBe(true);
          if (pair && step.id.endsWith("-insert")) expect(isPairJoined(state, pair), where).toBe(true);
        }
        if (pair && step.id.endsWith("-free")) {
          // Out of the right side's slots: corner on top, edge not in FR or BR.
          expect(cornerPos(state, pair[1]), where).toBeLessThan(4);
          expect([EDGES.FR, EDGES.BR, EDGES.DR]).not.toContain(edgePos(state, pair[0]));
        }
        if (pair && step.id.endsWith("-join")) {
          expect(isPairJoined(state, pair), where).toBe(true);
          expect(inTopLayer(state, pair), where).toBe(true);
        }
        if (pair && step.id.endsWith("-insert")) done.push(...pair);
        // The bottom-right edge and finished pairs are in place after every step.
        expect(allHome(state, [DR, ...done]), where).toBe(true);
      }
      expect(isSecondBlockSolved(state), label).toBe(true);
      expect(solution.moves).toEqual(solution.steps.flatMap((s) => s.moves));
      lengths.push(solution.moves.length);
    }
    expect(Math.max(...lengths)).toBeLessThanOrEqual(24);
    expect(lengths.reduce((a, b) => a + b) / lengths.length).toBeLessThan(16.5);
  });

  it("leaves only CMLL and LSE pieces: top corners, six edges and the middle centers", () => {
    for (const scramble of scrambles(40)) {
      const start = scrambled(scramble);
      const end = applyMoves(start, solveBlocks(start).moves);
      // cubejs order: corners URF UFL ULB UBR | DFR DLF DBL DRB.
      for (const c of [4, 5, 6, 7]) expect(pieceCoord(end, corner(c))).toBe(homeCoord(corner(c)));
      // Edges DR DL FR FL BL BR are solved; UR UF UL UB DF DB are left for LSE.
      for (const e of [EDGES.DR, EDGES.DL, EDGES.FR, EDGES.FL, EDGES.BL, EDGES.BR]) {
        expect(pieceCoord(end, edge(e))).toBe(homeCoord(edge(e)));
      }
      expect([end.center[1], end.center[4]]).toEqual([1, 4]);
    }
  });

  it("explains turned middle centers when the first block left them turned", () => {
    // M2 turns the middle centers; R2 then takes the bottom-right edge away.
    const solution = solveSecondBlock(scrambled("M2 R2"));
    expect(solution.steps[0].id).toBe("dr-edge");
    expect(solution.steps[0].goal).toMatch(/centers are turned/);
    expect(isSecondBlockSolved(applyMoves(scrambled("M2 R2"), solution.moves))).toBe(true);
    expect(solveSecondBlock(scrambled("R2")).steps[0].goal).not.toMatch(/centers are turned/);
  });
});

describe("solveBlocks", () => {
  it("builds both blocks, first block then second", () => {
    for (const alg of [DEMO_SCRAMBLE, "x " + scrambles(1)[0].join(" "), "M' U r2 F B' L2 D"]) {
      const start = scrambled(alg);
      const solution = solveBlocks(start);
      expect(solution.moves).toEqual([...solution.firstBlock.moves, ...solution.secondBlock.moves]);
      const end = applyMoves(start, solution.moves);
      expect(isFirstBlockSolved(end) && isSecondBlockSolved(end), alg).toBe(true);
    }
  });
});
