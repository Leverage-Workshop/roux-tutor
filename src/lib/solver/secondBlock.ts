// Roux Second Block (SB): the 1x2x3 block on the right side, built after the
// first block the way the Roux method teaches it. Only R, r, U and M turns
// are used: none of them touch the left side, so the first block can't break.
//   1. place the bottom-right edge (yellow-red) next to the red center
//   2. for the front-right pair, then the back-right pair (or the other way):
//      a. free the corner or edge if it is stuck in the right side
//      b. join corner and edge into a pair in the top layer
//      c. insert the pair into its slot, keeping it joined on every move
// The bottom-right edge and any finished pair are back in place at the end of
// every phase (they may move out and back in during one, as in R U R').
//
// The middle-slice centers (U, F, D, B) are left alone. After a first block
// joined with M or r they can be turned; in Roux that's fine, because both
// blocks are judged against the left and right centers and the first block's
// yellow bottom. LSE (the last stage) fixes the centers with M moves.
import type { CubeState } from "cubejs";
import { applyMoves } from "@/lib/cube/model";
import type { Move } from "@/lib/cube/notation";
import {
  best,
  isFirstBlockSolved,
  joinedPlacements,
  solveFirstBlock,
  type FirstBlockSolution,
  type PairId,
  type PairPhase,
  type SolveStep,
} from "./firstBlock";
import { CORNERS, EDGES, homeCoord, pieceCoord, type TrackedPiece } from "./pieces";
import {
  allHome,
  applyAlgorithm,
  buildMoveSet,
  distanceTable,
  homeBound,
  shortestSolutions,
  tableIndex,
  type Bound,
  type CoordRule,
  type SearchMove,
} from "./search";

export type SecondBlockStepId = "dr-edge" | `${PairId}-right-pair-${PairPhase}`;

export interface SecondBlockSolution {
  /** All moves of the second block, in order. */
  moves: Move[];
  /** Only steps that need moves; a pair that is already built has none. */
  steps: SolveStep<SecondBlockStepId>[];
}

const PAIR_TEXT: Record<PairId, { label: string; slot: string; corner: string; edge: string }> = {
  front: { label: "Front-right pair", slot: "front-right", corner: "yellow-green-red", edge: "green-red" },
  back: { label: "Back-right pair", slot: "back-right", corner: "yellow-blue-red", edge: "blue-red" },
};

const CENTERS_NOTE =
  " The middle-layer centers are turned right now. That's normal in Roux: match the bottom to the left block's yellow, not to the centers. They get fixed at the very end.";

function stepText(id: SecondBlockStepId, centersOff: boolean): { name: string; goal: string } {
  if (id === "dr-edge") {
    return {
      name: "Bottom-right edge",
      goal:
        "Put the yellow-red edge in the bottom-right slot, red next to the red center and yellow on the bottom like the left block. From here on only R, r, U and M are turned, so the left block stays untouched." +
        (centersOff ? CENTERS_NOTE : ""),
    };
  }
  const [pair, , , phase] = id.split("-") as [PairId, "right", "pair", PairPhase];
  const { label, slot, corner, edge } = PAIR_TEXT[pair];
  switch (phase) {
    case "free":
      return {
        name: `${label}: free the pieces`,
        goal: `The ${corner} corner or the ${edge} edge is stuck in the right side. Lift it out to the top layer, where it can move freely; the bottom-right edge ends back in place.`,
      };
    case "join":
      return {
        name: `${label}: join corner and edge`,
        goal: `Bring the ${corner} corner and the ${edge} edge together in the top layer so their colors match side by side. R turns may lift the bottom-right edge for a moment; it ends back in place.`,
      };
    case "insert":
      return {
        name: `${label}: insert the pair`,
        goal: `Move the finished pair into the ${slot} of the block in one piece, without splitting it.`,
      };
  }
}

// The five pieces of the second block (the red center never moves here).
const DR: TrackedPiece = { kind: "edge", piece: EDGES.DR };
const BLOCK: readonly TrackedPiece[] = [
  DR,
  { kind: "edge", piece: EDGES.FR },
  { kind: "corner", piece: CORNERS.DFR },
  { kind: "edge", piece: EDGES.BR },
  { kind: "corner", piece: CORNERS.DRB },
];
/** Indexes into BLOCK. */
const I_DR = 0;
const PAIR_PIECES: Record<PairId, { edge: number; corner: number }> = {
  front: { edge: 1, corner: 2 },
  back: { edge: 3, corner: 4 },
};
/** cubejs center slots (and center numbers): U R F D L B. */
const R_CENTER = 1;
const M_CENTERS = [0, 2, 3, 5] as const;

/** The only turns of the second block: none of them touch the left side. */
const SB_LAYERS = ["U", "M", "r", "R"] as const;
let moveSet: SearchMove[] | undefined;
const getMoves = () => (moveSet ??= buildMoveSet(SB_LAYERS));

/**
 * True when the right block is built: the yellow-red edge and both
 * corner-edge pairs sit next to the red center on the right. Like
 * isFirstBlockSolved, the U/F/D/B centers may be off by M moves. With the
 * first block also solved, only the top corners, the six M-slice and top
 * edges and the M-slice centers are left (CMLL and LSE).
 */
export function isSecondBlockSolved(state: CubeState): boolean {
  return state.center[R_CENTER] === R_CENTER && BLOCK.every((p) => pieceCoord(state, p) === homeCoord(p));
}

let joined: Record<PairId, Set<number>> | undefined;
/** The pair's two pieces touch with matching colors (anywhere on the cube). */
function isJoined(pair: PairId, corner: number, edge: number): boolean {
  const placements = (p: PairId) => joinedPlacements(BLOCK[PAIR_PIECES[p].corner], BLOCK[PAIR_PIECES[p].edge]);
  joined ??= { front: placements("front"), back: placements("back") };
  return joined[pair].has(corner * 24 + edge);
}

// Positions are coord / 3 (corners) or coord / 2 (edges); cubejs lists the
// four top-layer positions first.
const cornerInTop = (coord: number) => coord < 4 * 3;
const edgeInTop = (coord: number) => coord < 4 * 2;
/** A pair's edge is stuck when it sits in a right-side slot. */
const STUCK_EDGE_POSITIONS = new Set<number>([EDGES.DR, EDGES.FR, EDGES.BR]);
const edgeIsFree = (coord: number) => !STUCK_EDGE_POSITIONS.has(Math.floor(coord / 2));
/** Corners outside the top layer can only be in the right side's two slots. */
const cornerIsFree = cornerInTop;

/**
 * For [DR, edge, corner]: moves to put the pair home with the bottom-right
 * edge home, keeping the pair joined on every move (255 = impossible).
 */
function insertTable(pair: PairId): Uint8Array {
  const { edge, corner } = PAIR_PIECES[pair];
  return distanceTable(
    [DR, BLOCK[edge], BLOCK[corner]],
    getMoves(),
    allHome([DR, BLOCK[edge], BLOCK[corner]]),
    ([, e, k]) => isJoined(pair, k, e),
    `sb-home-keep-joined-${pair}`,
  );
}

const MAX_DEPTH = 14;
const UNREACHABLE = 255;

/**
 * A step never starts by turning the layer the step before it just turned
 * (e.g. "R2" then "R'"): that would look like undoing it.
 */
const notAfter = (prev: Move | undefined) => (move: Move) => prev?.[0] !== move[0];
const lastOf = (...algs: readonly Move[][]): Move | undefined => algs.flat().at(-1);

interface PairPlan {
  pair: PairId;
  free: Move[];
  join: Move[];
  insert: Move[];
  moves: Move[];
}

/**
 * Plan one pair from the block's current coordinates. The bottom-right edge
 * must be in place; `done` is the other pair if it is already in place. Both
 * are back in place at the end of every phase.
 */
function planPair(pair: PairId, coords: readonly number[], done: PairId | undefined, prev: Move | undefined): PairPlan {
  const moves = getMoves();
  const { edge, corner } = PAIR_PIECES[pair];
  if (coords[edge] === homeCoord(BLOCK[edge]) && coords[corner] === homeCoord(BLOCK[corner])) {
    return { pair, free: [], join: [], insert: [], moves: [] };
  }
  const kept = [I_DR, ...(done ? [PAIR_PIECES[done].edge, PAIR_PIECES[done].corner] : [])];
  const keptHome = allHome(kept.map((i) => BLOCK[i]));
  const keptOk: CoordRule = (c) => keptHome(kept.map((i) => c[i]));
  const keptBounds: Bound[] = done ? [homeBound(BLOCK, kept)] : [];
  const drHome = homeCoord(DR);
  const before = prev ? [prev] : [];
  const inserts = insertTable(pair);
  /** [DR, edge, corner]: the pair is joined in the top layer, ready to insert. */
  const ready: CoordRule = ([dr, e, k]) =>
    dr === drHome &&
    cornerInTop(k) &&
    edgeInTop(e) &&
    isJoined(pair, k, e) &&
    inserts[tableIndex([dr, e, k])] !== UNREACHABLE;

  // a. Free: both pieces out of the right-side slots.
  const freeRule: CoordRule = ([dr, e, k]) => dr === drHome && edgeIsFree(e) && cornerIsFree(k);
  const freeSolves = shortestSolutions(
    {
      pieces: BLOCK,
      goal: (c) => keptOk(c) && freeRule([c[I_DR], c[edge], c[corner]]),
      // Subset order: [DR, edge, corner].
      bounds: [{ subset: [I_DR, edge, corner], key: "sb-dr-home+pair-free", goal: freeRule }, ...keptBounds],
    },
    coords,
    { moves, maxDepth: MAX_DEPTH, maxSolutions: 4, firstMove: notAfter(prev) },
  );

  const plans: PairPlan[] = [];
  for (const free of freeSolves) {
    const afterFree = applyAlgorithm(BLOCK, coords, free, moves);
    // b. Join in the top layer, somewhere the pair can be inserted from.
    //    Subset orders: [corner, edge] and [DR, edge, corner].
    const joinSolves = shortestSolutions(
      {
        pieces: BLOCK,
        goal: (c) => keptOk(c) && ready([c[I_DR], c[edge], c[corner]]),
        bounds: [
          {
            subset: [corner, edge],
            key: `sb-joined-top-${pair}`,
            goal: ([k, e]) => cornerInTop(k) && edgeInTop(e) && isJoined(pair, k, e),
          },
          { subset: [I_DR, edge, corner], key: `sb-dr-home+ready-${pair}`, goal: ready },
          ...keptBounds,
        ],
      },
      afterFree,
      { moves, maxDepth: MAX_DEPTH, maxSolutions: 6, firstMove: notAfter(lastOf(before, free)) },
    );
    for (const join of joinSolves) {
      const afterJoin = applyAlgorithm(BLOCK, afterFree, join, moves);
      // c. Insert; the pair stays joined on every move.
      const insertSolves = shortestSolutions(
        {
          pieces: BLOCK,
          goal: (c) => keptOk(c) && c[edge] === homeCoord(BLOCK[edge]) && c[corner] === homeCoord(BLOCK[corner]),
          keep: (c) => isJoined(pair, c[corner], c[edge]),
          // Subset order: [DR, edge, corner].
          bounds: [
            {
              subset: [I_DR, edge, corner],
              key: `sb-home-keep-joined-${pair}`,
              goal: allHome([DR, BLOCK[edge], BLOCK[corner]]),
              keep: ([, e, k]) => isJoined(pair, k, e),
            },
            ...keptBounds,
          ],
        },
        afterJoin,
        { moves, maxDepth: MAX_DEPTH, maxSolutions: 6, firstMove: notAfter(lastOf(before, free, join)) },
      );
      const insert = best(insertSolves.map((m) => ({ moves: m }))).moves;
      plans.push({ pair, free, join, insert, moves: [...free, ...join, ...insert] });
    }
  }
  return best(plans);
}

/**
 * Solve the second block of a cube whose first block is solved (as left by
 * solveFirstBlock: orange left, yellow down; the middle-slice centers may be
 * turned). Uses only R, r, U and M, so the first block is never disturbed.
 */
export function solveSecondBlock(state: CubeState): SecondBlockSolution {
  if (!isFirstBlockSolved(state)) throw new Error("The first block must be solved before the second block");
  const moves = getMoves();
  const start = BLOCK.map((p) => pieceCoord(state, p));
  const centersOff = M_CENTERS.some((i) => state.center[i] !== i);

  // The bottom-right edge. Keep every shortest way to place it, since some
  // leave the pairs easier than others.
  const edgeSolves = shortestSolutions(
    { pieces: [DR], goal: allHome([DR]), bounds: [homeBound([DR], [0])] },
    [start[I_DR]],
    { moves, maxDepth: MAX_DEPTH, maxSolutions: 12 },
  );

  const orders = [
    ["front", "back"],
    ["back", "front"],
  ] as const;
  const candidates = edgeSolves.flatMap((edgeSolve) => {
    const afterEdge = applyAlgorithm(BLOCK, start, edgeSolve, moves);
    return orders.map(([first, second]) => {
      const firstPlan = planPair(first, afterEdge, undefined, edgeSolve.at(-1));
      const afterFirst = applyAlgorithm(BLOCK, afterEdge, firstPlan.moves, moves);
      const secondPlan = planPair(second, afterFirst, first, lastOf(edgeSolve, firstPlan.moves));
      return {
        edgeSolve,
        pairs: [firstPlan, secondPlan],
        moves: [...edgeSolve, ...firstPlan.moves, ...secondPlan.moves],
      };
    });
  });
  const chosen = best(candidates);

  const step = (id: SecondBlockStepId, stepMoves: Move[]): SolveStep<SecondBlockStepId> => ({
    id,
    ...stepText(id, centersOff),
    moves: stepMoves,
  });
  const steps = [step("dr-edge", chosen.edgeSolve)];
  for (const plan of chosen.pairs) {
    for (const phase of ["free", "join", "insert"] as const) {
      steps.push(step(`${plan.pair}-right-pair-${phase}`, plan[phase]));
    }
  }
  const nonEmpty = steps.filter((s) => s.moves.length > 0);
  return { moves: nonEmpty.flatMap((s) => s.moves), steps: nonEmpty };
}

export interface BlocksSolution {
  /** First block then second block moves, in order. */
  moves: Move[];
  firstBlock: FirstBlockSolution;
  secondBlock: SecondBlockSolution;
}

/** First block, then second block: everything before CMLL. */
export function solveBlocks(state: CubeState): BlocksSolution {
  const firstBlock = solveFirstBlock(state);
  const afterFirst = applyMoves(state, firstBlock.moves);
  const secondBlock = solveSecondBlock(afterFirst);
  return { moves: [...firstBlock.moves, ...secondBlock.moves], firstBlock, secondBlock };
}
