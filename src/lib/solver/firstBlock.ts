// Roux First Block (FB): the 1x2x3 block on the left side. Built the way the
// method is taught to beginners, never with a Kociemba solve:
//   1. turn the whole cube so orange is on the left and yellow on the bottom
//   2. place the bottom-left edge (yellow-orange) next to the orange center
//   3. build and insert one corner-edge pair (front or back, whichever is shorter)
//   4. build and insert the other pair
// Each step is the shortest sequence for that step. Among equally short
// solves, the one with the easiest moves wins (see moveEffort).
import type { CubeState } from "cubejs";
import { applyMoves } from "@/lib/cube/model";
import { parseAlgorithm, type Move } from "@/lib/cube/notation";
import { CORNERS, EDGES, homeCoord, pieceCoord, type TrackedPiece } from "./pieces";
import { applyAlgorithm, buildMoveSet, shortestSolutions, type SearchMove } from "./search";

export type FirstBlockStepId = "orient" | "dl-edge" | "front-pair" | "back-pair";

export interface SolveStep<Id extends string = string> {
  id: Id;
  name: string;
  /** What this step achieves, in plain words. */
  goal: string;
  /** Empty when the step is already done in this scramble. */
  moves: Move[];
}

export interface FirstBlockSolution {
  /** All moves of the first block, in order. */
  moves: Move[];
  steps: SolveStep<FirstBlockStepId>[];
}

const STEP_TEXT: Record<FirstBlockStepId, { name: string; goal: string }> = {
  orient: {
    name: "Hold the cube",
    goal: "Turn the whole cube so the orange center faces left and the yellow center faces down.",
  },
  "dl-edge": {
    name: "Bottom-left edge",
    goal: "Put the yellow-orange edge in the bottom-left slot, orange next to the orange center.",
  },
  "front-pair": {
    name: "Front pair",
    goal: "Join the front-left corner with its edge and drop them into the front-left of the block.",
  },
  "back-pair": {
    name: "Back pair",
    goal: "Join the back-left corner with its edge and drop them into the back-left of the block.",
  },
};

function step(id: FirstBlockStepId, moves: Move[]): SolveStep<FirstBlockStepId> {
  return { id, ...STEP_TEXT[id], moves };
}

/** The five pieces of the first block (the orange center never moves here). */
const DL: TrackedPiece = { kind: "edge", piece: EDGES.DL };
const FL: TrackedPiece = { kind: "edge", piece: EDGES.FL };
const BL: TrackedPiece = { kind: "edge", piece: EDGES.BL };
const DLF: TrackedPiece = { kind: "corner", piece: CORNERS.DLF };
const DBL: TrackedPiece = { kind: "corner", piece: CORNERS.DBL };
const BLOCK: readonly TrackedPiece[] = [DL, FL, DLF, BL, DBL];
/** cubejs center slot (and center number) of the left face. */
const L_CENTER = 4;

/**
 * Layers the first block may turn: face turns only, so every center stays
 * put and the bottom stays yellow while the block is built. Experienced Roux
 * solvers also use M and r here; adding them saves about one move per solve
 * (8.3 vs 9.3 on average) but moves the yellow center away mid-block, which
 * is harder to follow while learning.
 */
const FB_LAYERS = ["U", "D", "F", "B", "L", "R"] as const;
let moveSet: SearchMove[] | undefined;
function fbMoves(): SearchMove[] {
  moveSet ??= buildMoveSet(FB_LAYERS);
  return moveSet;
}

/**
 * How awkward a move is to perform, for breaking ties between equally short
 * solves. R and U are the fastest (right hand and fingertip turns), then
 * r and M (used by later stages); B is the hardest to see and reach. Half
 * turns cost a little more.
 */
const LAYER_EFFORT: Record<string, number> = {
  R: 1, U: 1, r: 1.1, M: 1.2, L: 1.3, F: 1.4, D: 1.4, B: 1.8,
};
export function moveEffort(move: Move): number {
  return (LAYER_EFFORT[move[0]] ?? 2) + (move.endsWith("2") ? 0.3 : 0);
}
function algEffort(moves: readonly Move[]): number {
  return moves.reduce((sum, m) => sum + moveEffort(m), 0);
}

/** Whole-cube rotations, shortest first, to try when fixing the orientation. */
const ROTATION_CANDIDATES: readonly string[] = (() => {
  const singles = ["x", "x'", "x2", "y", "y'", "y2", "z", "z'", "z2"];
  return ["", ...singles, ...singles.flatMap((a) => singles.filter((b) => a[0] !== b[0]).map((b) => `${a} ${b}`))];
})();

function hasStandardCenters(state: CubeState): boolean {
  return state.center.every((c, i) => c === i);
}

/**
 * Rotations that bring the centers to the standard frame (orange left,
 * yellow down, so white up and green front). Centers only move together
 * (rotations, M/E/S and wide turns keep their order), so one always works.
 * A cube whose middle slice is turned (e.g. after M2) gets a rotation too,
 * even if the left block is already built; face-turn scrambles never do.
 */
export function orientationMoves(state: CubeState): Move[] {
  for (const candidate of ROTATION_CANDIDATES) {
    if (hasStandardCenters(applyMoves(state, candidate))) return parseAlgorithm(candidate);
  }
  throw new Error("Centers are in an impossible arrangement");
}

/**
 * True when the left block is built: the yellow-orange edge and both
 * corner-edge pairs sit next to the orange center on the left. The U/F/D/B
 * centers may be off by M moves; only the left side is checked, so a cube
 * held in another orientation counts as unsolved.
 */
export function isFirstBlockSolved(state: CubeState): boolean {
  return state.center[L_CENTER] === L_CENTER && BLOCK.every((p) => pieceCoord(state, p) === homeCoord(p));
}

interface Candidate {
  steps: [Move[], Move[], Move[]];
  order: "front-first" | "back-first";
}

/**
 * Solve the first block of a cube state. The state must be a real cube
 * position (see fromFacelets); the solve starts with a rotation when the
 * orange center is not on the left or yellow is not down.
 */
export function solveFirstBlock(state: CubeState): FirstBlockSolution {
  const orient = orientationMoves(state);
  const oriented = applyMoves(state, orient);
  const moves = fbMoves();
  const start = BLOCK.map((p) => pieceCoord(oriented, p));
  // Indexes into BLOCK.
  const [iDL, iFL, iDLF, iBL, iDBL] = [0, 1, 2, 3, 4];
  const front = [iDL, iFL, iDLF];
  const back = [iDL, iBL, iDBL];

  const searchOptions = (maxSolutions: number) => ({ moves, maxDepth: 14, maxSolutions });

  // Step 1: the bottom-left edge. Keep every shortest way to place it,
  // since some leave the pairs easier than others.
  const edgeSolves = shortestSolutions(
    { pieces: [DL], bounds: [[0]] },
    [start[iDL]],
    searchOptions(24),
  );

  const candidates: Candidate[] = [];
  for (const edgeSolve of edgeSolves) {
    const afterEdge = applyAlgorithm(BLOCK, start, edgeSolve, moves);
    for (const [order, first] of [
      ["front-first", front],
      ["back-first", back],
    ] as const) {
      // Step 2: the first pair, keeping the bottom-left edge.
      const pairSolves = shortestSolutions(
        { pieces: first.map((i) => BLOCK[i]), bounds: [[0, 1, 2]] },
        first.map((i) => afterEdge[i]),
        searchOptions(8),
      );
      for (const pairSolve of pairSolves) {
        const afterPair = applyAlgorithm(BLOCK, afterEdge, pairSolve, moves);
        // Step 3: the second pair, keeping everything else.
        const lastSolves = shortestSolutions(
          { pieces: BLOCK, bounds: [front, back] },
          afterPair,
          searchOptions(8),
        );
        for (const lastSolve of lastSolves) {
          candidates.push({ steps: [edgeSolve, pairSolve, lastSolve], order });
        }
      }
    }
  }

  const length = (c: Candidate) => c.steps.reduce((n, s) => n + s.length, 0);
  const effort = (c: Candidate) => c.steps.reduce((n, s) => n + algEffort(s), 0);
  const best = candidates.reduce((a, b) => {
    const byLength = length(b) - length(a);
    if (byLength !== 0) return byLength < 0 ? b : a;
    return effort(b) < effort(a) ? b : a;
  });

  const [edgeSolve, firstPair, secondPair] = best.steps;
  const pairSteps =
    best.order === "front-first"
      ? [step("front-pair", firstPair), step("back-pair", secondPair)]
      : [step("back-pair", firstPair), step("front-pair", secondPair)];
  const steps = [...(orient.length > 0 ? [step("orient", orient)] : []), step("dl-edge", edgeSolve), ...pairSteps];
  return { moves: steps.flatMap((s) => s.moves), steps };
}
