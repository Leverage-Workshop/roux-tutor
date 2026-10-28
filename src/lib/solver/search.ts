// Shortest-path search over a few tracked pieces (IDA* with lookup tables).
// Used per Roux sub-step, so each search only needs to move 1-5 pieces home.
import type { Move } from "@/lib/cube/notation";
import { buildMoveTable, homeCoord, type MoveTable, type TrackedPiece } from "./pieces";

export interface SearchMove {
  move: Move;
  /** Moves on the same axis commute; the search keeps only one order of them. */
  axis: number;
  order: number;
  table: MoveTable;
}

/**
 * Turnable layers with their axis and a fixed order within the axis.
 * Consecutive moves of one axis must go up in order, which removes
 * duplicates such as "L R" vs "R L" and "R R'".
 */
const LAYERS: Record<string, { axis: number; order: number }> = {
  U: { axis: 0, order: 0 },
  D: { axis: 0, order: 1 },
  F: { axis: 1, order: 0 },
  B: { axis: 1, order: 1 },
  L: { axis: 2, order: 0 },
  M: { axis: 2, order: 1 },
  r: { axis: 2, order: 2 },
  R: { axis: 2, order: 3 },
};

export function buildMoveSet(layers: readonly string[]): SearchMove[] {
  return layers.flatMap((layer) => {
    const info = LAYERS[layer];
    if (!info) throw new Error(`Unsupported search layer: ${layer}`);
    return (["", "'", "2"] as const).map((suffix) => {
      const move = `${layer}${suffix}` as Move;
      return { move, ...info, table: buildMoveTable(move) };
    });
  });
}

function canFollow(prev: SearchMove | undefined, next: SearchMove): boolean {
  return !prev || prev.axis !== next.axis || next.order > prev.order;
}

function applyMove(pieces: readonly TrackedPiece[], coords: readonly number[], m: SearchMove): number[] {
  return coords.map((c, i) => (pieces[i].kind === "corner" ? m.table.corner[c] : m.table.edge[c]));
}

/** Move tracked pieces through an algorithm made of moves from `moves`. */
export function applyAlgorithm(
  pieces: readonly TrackedPiece[],
  coords: readonly number[],
  alg: readonly Move[],
  moves: readonly SearchMove[],
): number[] {
  return alg.reduce((acc, move) => {
    const m = moves.find((candidate) => candidate.move === move);
    if (!m) throw new Error(`Move ${move} is not in the search move set`);
    return applyMove(pieces, acc, m);
  }, coords as number[]);
}

function tableIndex(coords: readonly number[]): number {
  let index = 0;
  for (let i = coords.length - 1; i >= 0; i--) index = index * 24 + coords[i];
  return index;
}

const UNSEEN = 255;
const tableCache = new Map<string, Uint8Array>();

/**
 * Moves needed to bring every piece in `pieces` home, for every placement
 * of them (breadth-first search out from the solved placement). Up to 4 pieces.
 */
export function distanceTable(pieces: readonly TrackedPiece[], moves: readonly SearchMove[]): Uint8Array {
  const key = `${moves.map((m) => m.move).join(",")}|${pieces.map((p) => `${p.kind}${p.piece}`).join(",")}`;
  const cached = tableCache.get(key);
  if (cached) return cached;
  if (pieces.length > 4) throw new Error("Distance tables support at most 4 pieces");

  const dist = new Uint8Array(24 ** pieces.length).fill(UNSEEN);
  const home = pieces.map(homeCoord);
  dist[tableIndex(home)] = 0;
  let frontier = [home];
  for (let depth = 0; frontier.length > 0; depth++) {
    const next: number[][] = [];
    for (const coords of frontier) {
      for (const m of moves) {
        const moved = applyMove(pieces, coords, m);
        const index = tableIndex(moved);
        if (dist[index] === UNSEEN) {
          dist[index] = depth + 1;
          next.push(moved);
        }
      }
    }
    frontier = next;
  }
  tableCache.set(key, dist);
  return dist;
}

export interface StepGoal {
  /** Pieces that must all end home and oriented. */
  pieces: readonly TrackedPiece[];
  /** Subsets of `pieces` (as indexes) with distance tables; each gives a lower bound. */
  bounds: readonly (readonly number[])[];
}

export interface SearchOptions {
  moves: readonly SearchMove[];
  /** Give up past this many moves (the step is then impossible). */
  maxDepth: number;
  /** Stop collecting after this many equally short solutions. */
  maxSolutions: number;
}

/** Every shortest solution (up to maxSolutions) from `start` coordinates. */
export function shortestSolutions(goal: StepGoal, start: readonly number[], options: SearchOptions): Move[][] {
  const { pieces, bounds } = goal;
  const { moves, maxDepth, maxSolutions } = options;
  const tables = bounds.map((subset) => ({
    subset,
    dist: distanceTable(subset.map((i) => pieces[i]), moves),
  }));
  const home = pieces.map(homeCoord);

  const lowerBound = (coords: readonly number[]) => {
    let h = 0;
    for (const { subset, dist } of tables) {
      h = Math.max(h, dist[tableIndex(subset.map((i) => coords[i]))]);
    }
    return h;
  };
  const isHome = (coords: readonly number[]) => coords.every((c, i) => c === home[i]);

  const solutions: Move[][] = [];
  const path: SearchMove[] = [];
  const search = (coords: readonly number[], remaining: number): void => {
    if (remaining === 0) {
      if (isHome(coords)) solutions.push(path.map((m) => m.move));
      return;
    }
    if (lowerBound(coords) > remaining) return;
    for (const m of moves) {
      if (!canFollow(path[path.length - 1], m)) continue;
      path.push(m);
      search(applyMove(pieces, coords, m), remaining - 1);
      path.pop();
      if (solutions.length >= maxSolutions) return;
    }
  };

  for (let depth = lowerBound(start); depth <= maxDepth; depth++) {
    search(start, depth);
    if (solutions.length > 0) return solutions;
  }
  throw new Error(`No solution within ${maxDepth} moves`);
}
