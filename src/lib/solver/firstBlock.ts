// Roux First Block (FB): the 1x2x3 block on the left side, built the way the
// Roux method teaches it (never with a Kociemba solve):
//   1. turn the whole cube so orange is on the left and yellow on the bottom
//   2. place the bottom-left edge (yellow-orange) next to the orange center
//   3. for the front pair, then the back pair (or the other way round):
//      a. free the corner or edge if it is stuck in the left side
//      b. join the corner and edge into a pair with U, R, r and M only;
//         these turns never touch the left side, so nothing built breaks
//      c. insert the pair into its slot, keeping it joined on every move
// Each phase uses as few moves as it can; among equally short options the
// easiest moves win (see moveEffort). The pair order is whichever is shorter.
import type { CubeState } from "cubejs";
import { applyMoves, solvedState } from "@/lib/cube/model";
import { parseAlgorithm, type Move } from "@/lib/cube/notation";
import { CORNERS, EDGES, homeCoord, pieceCoord, type TrackedPiece } from "./pieces";
import {
  allHome,
  applyAlgorithm,
  buildMoveSet,
  homeBound,
  shortestSolutions,
  type Bound,
  type CoordRule,
  type SearchMove,
} from "./search";

export type PairId = "front" | "back";
export type PairPhase = "free" | "join" | "insert";
export type FirstBlockStepId = "orient" | "dl-edge" | `${PairId}-pair-${PairPhase}`;

export interface SolveStep<Id extends string = string> {
  id: Id;
  name: string;
  /** What this step achieves, in plain words. */
  goal: string;
  moves: Move[];
}

export interface FirstBlockSolution {
  /** All moves of the first block, in order. */
  moves: Move[];
  /** Only steps that need moves; a pair that is already built has none. */
  steps: SolveStep<FirstBlockStepId>[];
}

const PAIR_TEXT: Record<PairId, { label: string; slot: string }> = {
  front: { label: "Front pair", slot: "front-left" },
  back: { label: "Back pair", slot: "back-left" },
};

function stepText(id: FirstBlockStepId): { name: string; goal: string } {
  if (id === "orient") {
    return {
      name: "Hold the cube",
      goal: "Turn the whole cube so the orange center faces left and the yellow center faces down.",
    };
  }
  if (id === "dl-edge") {
    return {
      name: "Bottom-left edge",
      goal: "Put the yellow-orange edge in the bottom-left slot, orange next to the orange center.",
    };
  }
  const [pair, , phase] = id.split("-") as [PairId, "pair", PairPhase];
  const { label, slot } = PAIR_TEXT[pair];
  switch (phase) {
    case "free":
      return {
        name: `${label}: free the pieces`,
        goal: `The ${slot} corner or its edge is stuck on the left side. Move it out to the top or right, where it can turn freely.`,
      };
    case "join":
      return {
        name: `${label}: join corner and edge`,
        goal: `Bring the ${slot} corner and its edge together so their colors match side by side. Only U, R, r and M are used, so the left side stays untouched.`,
      };
    case "insert":
      return {
        name: `${label}: insert the pair`,
        goal: `Move the finished pair into the ${slot} of the block in one piece.`,
      };
  }
}

function step(id: FirstBlockStepId, moves: Move[]): SolveStep<FirstBlockStepId> {
  return { id, ...stepText(id), moves };
}

// The five pieces of the first block (the orange center never moves here).
const DL: TrackedPiece = { kind: "edge", piece: EDGES.DL };
const BLOCK: readonly TrackedPiece[] = [
  DL,
  { kind: "edge", piece: EDGES.FL },
  { kind: "corner", piece: CORNERS.DLF },
  { kind: "edge", piece: EDGES.BL },
  { kind: "corner", piece: CORNERS.DBL },
];
/** Indexes into BLOCK. */
const I_DL = 0;
const PAIR_PIECES: Record<PairId, { edge: number; corner: number }> = {
  front: { edge: 1, corner: 2 },
  back: { edge: 3, corner: 4 },
};
/** cubejs center slot (and center number) of the left face. */
const L_CENTER = 4;

/**
 * Face turns for the bottom-left edge, freeing pieces and inserting pairs.
 * Only the join phase uses slice and wide turns.
 */
const FACE_LAYERS = ["U", "D", "F", "B", "L", "R"] as const;
/** Turns for joining a pair: none of them touch the left side. */
const JOIN_LAYERS = ["U", "M", "r", "R"] as const;
let moveSets: { face: SearchMove[]; join: SearchMove[]; all: SearchMove[] } | undefined;
function getMoveSets() {
  if (!moveSets) {
    const face = buildMoveSet(FACE_LAYERS);
    const join = buildMoveSet(JOIN_LAYERS);
    moveSets = { face, join, all: [...face, ...join.filter((m) => m.move[0] === "M" || m.move[0] === "r")] };
  }
  return moveSets;
}

/**
 * How awkward a move is to perform, for breaking ties between equally short
 * options. R and U are the fastest (right hand and fingertip turns), then
 * r and M; B is the hardest to see and reach. Half turns cost a little more.
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

/** Pick the plan with the fewest moves, then the easiest moves. */
function best<T extends { moves: readonly Move[] }>(plans: readonly T[]): T {
  return plans.reduce((a, b) => {
    if (a.moves.length !== b.moves.length) return b.moves.length < a.moves.length ? b : a;
    return algEffort(b.moves) < algEffort(a.moves) ? b : a;
  });
}

/** Whole-cube rotations, shortest first: all 24 ways to hold the cube. */
const ROTATION_CANDIDATES: readonly string[] = (() => {
  const singles = ["x", "x'", "x2", "y", "y'", "y2", "z", "z'", "z2"];
  return ["", ...singles, ...singles.flatMap((a) => singles.filter((b) => a[0] !== b[0]).map((b) => `${a} ${b}`))];
})();

/**
 * Rotations that bring the centers to the standard frame (orange left,
 * yellow down, so white up and green front). Centers only move together
 * (rotations, M/E/S and wide turns keep their order), so one always works.
 * A cube whose middle slice is turned (e.g. after M2) gets a rotation too,
 * even if the left block is already built; face-turn scrambles never do.
 */
export function orientationMoves(state: CubeState): Move[] {
  for (const candidate of ROTATION_CANDIDATES) {
    if (applyMoves(state, candidate).center.every((c, i) => c === i)) return parseAlgorithm(candidate);
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

/**
 * Every (corner, edge) placement where a pair is joined: its two pieces
 * touch with matching colors. These are exactly the 24 places a whole-cube
 * rotation can carry the solved pair to. Keys are corner * 24 + edge.
 */
function joinedPlacements(pair: PairId): Set<number> {
  const { edge, corner } = PAIR_PIECES[pair];
  const placements = new Set<number>();
  for (const rotation of ROTATION_CANDIDATES) {
    const turned = applyMoves(solvedState(), rotation);
    placements.add(pieceCoord(turned, BLOCK[corner]) * 24 + pieceCoord(turned, BLOCK[edge]));
  }
  return placements;
}
let joined: Record<PairId, Set<number>> | undefined;
/** Rule over [corner, edge] coordinates: the pair is joined. */
function isJoined(pair: PairId, corner: number, edge: number): boolean {
  joined ??= { front: joinedPlacements("front"), back: joinedPlacements("back") };
  return joined[pair].has(corner * 24 + edge);
}

/** Corners and edges on the left side can't be reached by U, R, r or M. */
const STUCK_CORNER_POSITIONS = new Set<number>([CORNERS.DLF, CORNERS.DBL]);
const STUCK_EDGE_POSITIONS = new Set<number>([EDGES.FL, EDGES.BL, EDGES.DL]);
const cornerIsFree = (coord: number) => !STUCK_CORNER_POSITIONS.has(Math.floor(coord / 3));
const edgeIsFree = (coord: number) => !STUCK_EDGE_POSITIONS.has(Math.floor(coord / 2));

const MAX_DEPTH = 14;

interface PairPlan {
  pair: PairId;
  free: Move[];
  join: Move[];
  insert: Move[];
  moves: Move[];
}

/**
 * Plan one pair from the block's current coordinates. The bottom-left edge
 * must be in place; `done` is the other pair if it is already in place. Both
 * are back in place at the end of every phase.
 */
function planPair(pair: PairId, coords: readonly number[], done: PairId | undefined): PairPlan {
  const sets = getMoveSets();
  const { edge, corner } = PAIR_PIECES[pair];
  if (coords[edge] === homeCoord(BLOCK[edge]) && coords[corner] === homeCoord(BLOCK[corner])) {
    return { pair, free: [], join: [], insert: [], moves: [] };
  }
  const kept = [I_DL, ...(done ? [PAIR_PIECES[done].edge, PAIR_PIECES[done].corner] : [])];
  const keptHome = allHome(kept.map((i) => BLOCK[i]));
  const keptOk: CoordRule = (c) => keptHome(kept.map((i) => c[i]));
  const keptBounds: Bound[] = done ? [homeBound(BLOCK, kept)] : [];
  const dlHome = homeCoord(DL);

  // a. Free: both pieces where U, R, r and M can reach them.
  const freeSolves = shortestSolutions(
    {
      pieces: BLOCK,
      goal: (c) => keptOk(c) && cornerIsFree(c[corner]) && edgeIsFree(c[edge]),
      // Subset order: [DL, edge, corner].
      bounds: [
        {
          subset: [I_DL, edge, corner],
          key: "dl-home+pair-free",
          goal: ([dl, e, k]) => dl === dlHome && edgeIsFree(e) && cornerIsFree(k),
        },
        ...keptBounds,
      ],
    },
    coords,
    { moves: sets.face, maxDepth: MAX_DEPTH, maxSolutions: 4 },
  );

  const plans: PairPlan[] = [];
  for (const free of freeSolves) {
    const afterFree = applyAlgorithm(BLOCK, coords, free, sets.all);
    // b. Join with U, R, r and M. They never touch the left side, so only
    //    the pair's own two pieces matter. Subset order: [corner, edge].
    const joinedRule: CoordRule = ([k, e]) => isJoined(pair, k, e);
    const joinSolves = shortestSolutions(
      {
        pieces: [BLOCK[corner], BLOCK[edge]],
        goal: joinedRule,
        bounds: [{ subset: [0, 1], key: `joined-${pair}`, goal: joinedRule }],
      },
      [afterFree[corner], afterFree[edge]],
      { moves: sets.join, maxDepth: MAX_DEPTH, maxSolutions: 6 },
    );
    for (const join of joinSolves) {
      const afterJoin = applyAlgorithm(BLOCK, afterFree, join, sets.all);
      // c. Insert with face turns; the pair stays joined on every move.
      const inserts = shortestSolutions(
        {
          pieces: BLOCK,
          goal: (c) => keptOk(c) && c[edge] === homeCoord(BLOCK[edge]) && c[corner] === homeCoord(BLOCK[corner]),
          keep: (c) => isJoined(pair, c[corner], c[edge]),
          // Subset order: [DL, edge, corner].
          bounds: [
            {
              subset: [I_DL, edge, corner],
              key: `home-keep-joined-${pair}`,
              goal: allHome([DL, BLOCK[edge], BLOCK[corner]]),
              keep: ([, e, k]) => isJoined(pair, k, e),
            },
            ...keptBounds,
          ],
        },
        afterJoin,
        { moves: sets.face, maxDepth: MAX_DEPTH, maxSolutions: 6 },
      );
      const insert = best(inserts.map((moves) => ({ moves }))).moves;
      plans.push({ pair, free, join, insert, moves: [...free, ...join, ...insert] });
    }
  }
  return best(plans);
}

/**
 * Solve the first block of a cube state. The state must be a real cube
 * position (see fromFacelets); the solve starts with a rotation when the
 * orange center is not on the left or yellow is not down.
 */
export function solveFirstBlock(state: CubeState): FirstBlockSolution {
  const sets = getMoveSets();
  const orient = orientationMoves(state);
  const start = BLOCK.map((p) => pieceCoord(applyMoves(state, orient), p));

  // The bottom-left edge. Keep every shortest way to place it, since some
  // leave the pairs easier than others.
  const edgeSolves = shortestSolutions(
    { pieces: [DL], goal: allHome([DL]), bounds: [homeBound([DL], [0])] },
    [start[I_DL]],
    { moves: sets.face, maxDepth: MAX_DEPTH, maxSolutions: 12 },
  );

  const orders = [
    ["front", "back"],
    ["back", "front"],
  ] as const;
  const candidates = edgeSolves.flatMap((edgeSolve) => {
    const afterEdge = applyAlgorithm(BLOCK, start, edgeSolve, sets.all);
    return orders.map(([first, second]) => {
      const firstPlan = planPair(first, afterEdge, undefined);
      const afterFirst = applyAlgorithm(BLOCK, afterEdge, firstPlan.moves, sets.all);
      const secondPlan = planPair(second, afterFirst, first);
      return {
        edgeSolve,
        pairs: [firstPlan, secondPlan],
        moves: [...edgeSolve, ...firstPlan.moves, ...secondPlan.moves],
      };
    });
  });
  const chosen = best(candidates);

  const steps: SolveStep<FirstBlockStepId>[] = [step("orient", orient), step("dl-edge", chosen.edgeSolve)];
  for (const plan of chosen.pairs) {
    for (const phase of ["free", "join", "insert"] as const) {
      steps.push(step(`${plan.pair}-pair-${phase}`, plan[phase]));
    }
  }
  const nonEmpty = steps.filter((s) => s.moves.length > 0);
  return { moves: nonEmpty.flatMap((s) => s.moves), steps: nonEmpty };
}
