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

function tableCoords(index: number, count: number): number[] {
  const coords: number[] = [];
  for (let i = 0; i < count; i++) {
    coords.push(index % 24);
    index = Math.floor(index / 24);
  }
  return coords;
}

/** A rule over some pieces' coordinates, e.g. "all home" or "joined as a pair". */
export type CoordRule = (coords: readonly number[]) => boolean;

/** All pieces home and oriented. */
export function allHome(pieces: readonly TrackedPiece[]): CoordRule {
  const home = pieces.map(homeCoord);
  return (coords) => coords.every((c, i) => c === home[i]);
}

/**
 * A lower bound from a few of the step's pieces: how many moves those pieces
 * alone need to satisfy `goal`, never leaving states that satisfy `keep`.
 */
export interface Bound {
  /** Indexes into the step's pieces; at most 4. */
  subset: readonly number[];
  /** Names the goal and keep rules, for caching the table. */
  key: string;
  goal: CoordRule;
  keep?: CoordRule;
}

export function homeBound(pieces: readonly TrackedPiece[], subset: readonly number[]): Bound {
  const sub = subset.map((i) => pieces[i]);
  return { subset, key: "home", goal: allHome(sub) };
}

const UNSEEN = 255;
const tableCache = new Map<string, Uint8Array>();

/**
 * Moves needed to satisfy `goal`, for every placement of up to 4 pieces
 * (breadth-first search out from every placement that satisfies it).
 * With `keep`, only placements that satisfy `keep` are passed through.
 */
export function distanceTable(
  pieces: readonly TrackedPiece[],
  moves: readonly SearchMove[],
  goal: CoordRule,
  keep: CoordRule | undefined,
  key: string,
): Uint8Array {
  const cacheKey = `${moves.map((m) => m.move).join(",")}|${pieces.map((p) => `${p.kind}${p.piece}`).join(",")}|${key}`;
  const cached = tableCache.get(cacheKey);
  if (cached) return cached;
  if (pieces.length > 4) throw new Error("Distance tables support at most 4 pieces");

  const size = 24 ** pieces.length;
  const dist = new Uint8Array(size).fill(UNSEEN);
  let frontier: number[][] = [];
  for (let index = 0; index < size; index++) {
    const coords = tableCoords(index, pieces.length);
    if (goal(coords) && (!keep || keep(coords))) {
      dist[index] = 0;
      frontier.push(coords);
    }
  }
  for (let depth = 0; frontier.length > 0; depth++) {
    const next: number[][] = [];
    for (const coords of frontier) {
      for (const m of moves) {
        const moved = applyMove(pieces, coords, m);
        const index = tableIndex(moved);
        if (dist[index] === UNSEEN && (!keep || keep(moved))) {
          dist[index] = depth + 1;
          next.push(moved);
        }
      }
    }
    frontier = next;
  }
  tableCache.set(cacheKey, dist);
  return dist;
}

export interface StepGoal {
  pieces: readonly TrackedPiece[];
  /** True when the step is done. */
  goal: CoordRule;
  /** When set, every position along the way must satisfy it (e.g. a pair stays joined). */
  keep?: CoordRule;
  /** Lower bounds for the search; more and tighter bounds make it faster. */
  bounds: readonly Bound[];
}

export interface SearchOptions {
  moves: readonly SearchMove[];
  /** Give up past this many moves (the step is then impossible). */
  maxDepth: number;
  /** Stop collecting after this many equally short solutions. */
  maxSolutions: number;
}

/** Every shortest solution (up to maxSolutions) from `start` coordinates. */
export function shortestSolutions(step: StepGoal, start: readonly number[], options: SearchOptions): Move[][] {
  const { pieces, goal, keep, bounds } = step;
  const { moves, maxDepth, maxSolutions } = options;
  if (keep && !keep(start)) throw new Error("Start position breaks the step's keep rule");
  const tables = bounds.map((b) => ({
    subset: b.subset,
    dist: distanceTable(
      b.subset.map((i) => pieces[i]),
      moves,
      b.goal,
      b.keep,
      b.key,
    ),
  }));

  const lowerBound = (coords: readonly number[]) => {
    let h = 0;
    for (const { subset, dist } of tables) {
      h = Math.max(h, dist[tableIndex(subset.map((i) => coords[i]))]);
    }
    return h;
  };

  const solutions: Move[][] = [];
  const path: SearchMove[] = [];
  const search = (coords: readonly number[], remaining: number): void => {
    if (remaining === 0) {
      if (goal(coords)) solutions.push(path.map((m) => m.move));
      return;
    }
    if (lowerBound(coords) > remaining) return;
    for (const m of moves) {
      if (!canFollow(path[path.length - 1], m)) continue;
      const moved = applyMove(pieces, coords, m);
      if (keep && !keep(moved)) continue;
      path.push(m);
      search(moved, remaining - 1);
      path.pop();
      if (solutions.length >= maxSolutions) return;
    }
  };

  for (let depth = lowerBound(start); depth <= maxDepth; depth++) {
    if (depth >= UNSEEN) break;
    search(start, depth);
    if (solutions.length > 0) return solutions;
  }
  throw new Error(`No solution within ${maxDepth} moves`);
}
