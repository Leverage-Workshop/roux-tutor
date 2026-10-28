// Roux LSE (Last Six Edges): once both blocks and the top corners are
// solved, only the six edges UL, UR, UF, UB, DF, DB and the middle-slice
// centers are left. LSE solves them with U and M turns only, in the three
// phases the Roux method teaches:
//   4a. EO (lse-eo): make all six edges "good", so none needs flipping later
//   4b. UL/UR (lse-ulur): put the white-orange and white-red edges in the
//       left and right spots, each between its own corners (the top layer
//       may be a half turn off, as human 4b leaves it; 4c turns it back)
//   4c. EP (lse-ep): solve the last four middle-slice edges and the centers
// After EO the edges stay good on every move: while the middle slice is a
// quarter turn off, only M turns and U2 are played (a quarter turn of the
// top layer would flip edges again), just like a human solve.
//
// The whole LSE state space is small (6 edges x flips x 4 center positions x
// 4 top-layer turns: 184,320 states), so each phase has a precomputed
// distance table and every phase uses as few moves as it can. Among equally
// short phase solutions, the solver picks the one that makes the later
// phases shortest, then avoids a step starting on the layer the previous one
// ended on (e.g. "M" then "M2"), then prefers the easiest moves (moveEffort).
import Cube, { type CubeState } from "cubejs";
import { solvedState } from "@/lib/cube/model";
import type { Move } from "@/lib/cube/notation";
import { isFirstBlockSolved, moveEffort, type SolveStep } from "./firstBlock";
import { EDGES } from "./pieces";
import { isSecondBlockSolved } from "./secondBlock";

export type LseStepId = "lse-eo" | "lse-ulur" | "lse-ep";

/** The case a step solves, recognized at the start of the step. */
export interface LseCase {
  /** Stable id, e.g. "eo-3-1", "ulur-both-bottom", "ep-3-cycle-db". */
  id: string;
  /** Short name, e.g. "arrow (3 bad on top, 1 on the bottom)". */
  name: string;
  /** How to see the case on the cube, in plain words. */
  recognition: string;
}

export interface LseStep extends SolveStep<LseStepId> {
  case: LseCase;
  /**
   * Middle-slice turn at the start of the step: how many M turns the
   * centers are away from solved (0 = white on top, 2 = white on the
   * bottom, 1 or 3 = a quarter turn off).
   */
  centersOff: number;
}

export interface LseSolution {
  /** All LSE moves, in order (only U and M turns). */
  moves: Move[];
  /** Only steps that need moves. */
  steps: LseStep[];
}

// ---------------------------------------------------------------------------
// The LSE state: which edge sits in each of the six slots (with its flip),
// how far the middle-slice centers are turned and how far the top layer is
// turned away from the corners.

/** Slots in cubejs edge positions; piece k belongs in slot k. */
const SLOT_POSITIONS = [EDGES.UR, EDGES.UF, EDGES.UL, EDGES.UB, EDGES.DF, EDGES.DB] as const;
const S_UR = 0;
const S_UL = 2;
const SLOT_NAMES = ["UR", "UF", "UL", "UB", "DF", "DB"] as const;
type SlotName = (typeof SLOT_NAMES)[number];
const SLOT_TEXT: Record<SlotName, string> = {
  UR: "top right (UR)",
  UF: "top front (UF)",
  UL: "top left (UL)",
  UB: "top back (UB)",
  DF: "bottom front (DF)",
  DB: "bottom back (DB)",
};
/** Colors of each LSE edge piece (white top, yellow bottom, orange left, green front). */
const PIECE_COLORS = ["white-red", "white-green", "white-orange", "white-blue", "yellow-green", "yellow-blue"] as const;
const TOP_SLOTS = [0, 1, 2, 3] as const;
/** The four slots in the middle slice. */
const M_SLOT_MASK = (1 << 1) | (1 << 3) | (1 << 4) | (1 << 5);
/** Middle-slice slots in the order an M turn moves edges: UF -> DF -> DB -> UB -> UF. */
const RING = [1, 4, 5, 3] as const;

const LSE_MOVES: readonly Move[] = ["U", "U'", "U2", "M", "M'", "M2"];
const MOVE_COUNT = LSE_MOVES.length;
/** Layer of each move: 0 = U, 1 = M. */
const MOVE_LAYER = LSE_MOVES.map((m) => (m[0] === "U" ? 0 : 1));
const MOVE_EFFORT = LSE_MOVES.map(moveEffort);

/**
 * State index: ((perm * 64 + flips) * 4 + centers) * 4 + top.
 * perm = rank of the slot -> piece permutation (720), flips = one bit per
 * slot (cubejs edge orientation), centers = M turns away from solved,
 * top = U turns away from the corners.
 */
const SIZE = 720 * 64 * 16;
const SOLVED_INDEX = 0; // identity permutation has rank 0
const UNSEEN = 255;

const permOf = (i: number) => i >> 10;
const flipsOf = (i: number) => (i >> 4) & 63;
const centersOf = (i: number) => (i >> 2) & 3;
const topOf = (i: number) => i & 3;
const encode = (perm: number, flips: number, centers: number, top: number) => (perm << 10) | (flips << 4) | (centers << 2) | top;

/** Number of M turns that brings each center to the U slot (cubejs center numbers). */
const CENTERS_BY_U_CENTER: Record<number, number> = { 0: 0, 5: 1, 3: 2, 2: 3 };

/** The corner positions after 0-3 U turns of a solved cube. */
const TOP_CORNER_KEYS = [0, 1, 2, 3].map((k) => {
  const s = k === 0 ? solvedState() : new Cube().move(`U${["", "", "2", "'"][k]}`).toJSON();
  return `${s.cp.join("")}${s.co.join("")}`;
});

/** How many U turns the top layer is away from the corners being solved, or -1. */
function topTurn(state: CubeState): number {
  return TOP_CORNER_KEYS.indexOf(`${state.cp.join("")}${state.co.join("")}`);
}

interface Tables {
  perms: Uint8Array; // [720 * 6]: slot -> piece
  permRank: Int16Array; // base-6 code -> rank
  permMove: Uint16Array; // [720 * 6 moves]
  flipMove: Uint8Array; // [64 * 6 moves]
  centerTurn: number[]; // per move
  topTurn: number[]; // per move
  eo: Uint8Array; // [SIZE] moves to all edges good
  ulur: Uint8Array; // [SIZE] moves to UL/UR placed (top layer lined up or a half turn off), edges kept good
  ep: Uint8Array; // [SIZE] moves to solved, edges kept good
  /** How many states each table reaches (for tests). */
  counts: { reachable: number; good: number; eo: number; ulur: number; ep: number };
}

const permCode = (p: ArrayLike<number>) => {
  let code = 0;
  for (let i = 5; i >= 0; i--) code = code * 6 + p[i];
  return code;
};

function buildTables(): Omit<Tables, "eo" | "ulur" | "ep" | "counts"> {
  // All 720 permutations in lexicographic order (identity first).
  const list: number[][] = [];
  const build = (prefix: number[], rest: number[]) => {
    if (rest.length === 0) list.push(prefix);
    rest.forEach((x, i) => build([...prefix, x], [...rest.slice(0, i), ...rest.slice(i + 1)]));
  };
  build([], [0, 1, 2, 3, 4, 5]);
  const perms = new Uint8Array(720 * 6);
  const permRank = new Int16Array(6 ** 6).fill(-1);
  list.forEach((p, r) => {
    perms.set(p, r * 6);
    permRank[permCode(p)] = r;
  });

  const permMove = new Uint16Array(720 * MOVE_COUNT);
  const flipMove = new Uint8Array(64 * MOVE_COUNT);
  const centerTurn: number[] = [];
  const topTurns: number[] = [];
  LSE_MOVES.forEach((move, m) => {
    // A move sends the piece at position m.ep[to] to `to`, adding m.eo[to] to its flip.
    const after = new Cube().move(move).toJSON();
    const from = SLOT_POSITIONS.map((to) => SLOT_POSITIONS.indexOf(after.ep[to] as (typeof SLOT_POSITIONS)[number]));
    const flipAdd = SLOT_POSITIONS.map((to) => after.eo[to]);
    if (from.some((s) => s < 0)) throw new Error(`${move} moves edges outside LSE`);
    for (let r = 0; r < 720; r++) {
      const next = from.map((s) => perms[r * 6 + s]);
      permMove[r * MOVE_COUNT + m] = permRank[permCode(next)];
    }
    for (let f = 0; f < 64; f++) {
      let next = 0;
      for (let s = 0; s < 6; s++) next |= (((f >> from[s]) & 1) ^ flipAdd[s]) << s;
      flipMove[f * MOVE_COUNT + m] = next;
    }
    centerTurn.push(CENTERS_BY_U_CENTER[after.center[0]]);
    topTurns.push(topTurn(after));
  });
  return { perms, permRank, permMove, flipMove, centerTurn, topTurn: topTurns };
}

type MoveTables = ReturnType<typeof buildTables>;

function applyIndex(t: MoveTables, i: number, m: number): number {
  return encode(
    t.permMove[permOf(i) * MOVE_COUNT + m],
    t.flipMove[flipsOf(i) * MOVE_COUNT + m],
    (centersOf(i) + t.centerTurn[m]) & 3,
    (topOf(i) + t.topTurn[m]) & 3,
  );
}

/**
 * Bad edges, one bit per slot. An edge is good when its white or yellow
 * sticker faces the same axis as the white and yellow centers would after
 * turning the middle slice back by M2 at most: up/down normally. While the
 * middle slice is a quarter turn off, the four middle-slice edges count the
 * other way round (the turn back would flip them). Good edges can be solved
 * with U and M turns without ever needing a flip.
 */
const badMask = (i: number) => flipsOf(i) ^ (centersOf(i) & 1 ? M_SLOT_MASK : 0);
const isGood = (i: number) => badMask(i) === 0;

/** Breadth-first distances from every goal state, through states that pass `keep`. */
function bfs(t: MoveTables, goals: number[], keep?: (i: number) => boolean): { dist: Uint8Array; count: number } {
  const dist = new Uint8Array(SIZE).fill(UNSEEN);
  let frontier = goals;
  for (const g of goals) dist[g] = 0;
  let count = goals.length;
  for (let depth = 1; frontier.length > 0; depth++) {
    const next: number[] = [];
    for (const i of frontier) {
      for (let m = 0; m < MOVE_COUNT; m++) {
        const j = applyIndex(t, i, m);
        if (dist[j] === UNSEEN && (!keep || keep(j))) {
          dist[j] = depth;
          next.push(j);
        }
      }
    }
    count += next.length;
    frontier = next;
  }
  return { dist, count };
}

let tables: Tables | undefined;
function getTables(): Tables {
  if (tables) return tables;
  const t = buildTables();
  // Every state with all edges good (the edges can be solved without flips).
  const good = bfs(t, [SOLVED_INDEX], isGood);
  const goodStates: number[] = [];
  for (let i = 0; i < SIZE; i++) if (good.dist[i] !== UNSEEN) goodStates.push(i);
  const eo = bfs(t, goodStates);
  // UL and UR each between their own corners: home with the top layer
  // lined up, or swapped with the top layer a half turn off.
  const ulurGoals = goodStates.filter((i) => {
    const ul = t.perms[permOf(i) * 6 + S_UL];
    const ur = t.perms[permOf(i) * 6 + S_UR];
    return (topOf(i) === 0 && ul === S_UL && ur === S_UR) || (topOf(i) === 2 && ul === S_UR && ur === S_UL);
  });
  const ulur = bfs(t, ulurGoals, isGood);
  const ep = bfs(t, [SOLVED_INDEX], isGood);
  // Every state reaches the EO goal; every good state reaches the UL/UR and EP goals.
  const counts = { reachable: eo.count, good: good.count, eo: eo.count, ulur: ulur.count, ep: ep.count };
  tables = { ...t, eo: eo.dist, ulur: ulur.dist, ep: ep.dist, counts };
  return tables;
}

/**
 * Sizes of the LSE state space, for tests: all states reachable with U and
 * M, those with all edges good, and how many states each phase table can
 * finish from (EO: any state; UL/UR and EP: states with all edges good).
 */
export function lseStateCounts(): Tables["counts"] {
  return { ...getTables().counts };
}

// ---------------------------------------------------------------------------
// Reading a cube.

/** True when blocks are built and the top corners are solved, maybe with the top layer turned. */
function isLseStart(state: CubeState): boolean {
  return isFirstBlockSolved(state) && isSecondBlockSolved(state) && topTurn(state) >= 0;
}

function lseIndex(state: CubeState): number {
  const t = getTables();
  const perm = SLOT_POSITIONS.map((pos) => SLOT_POSITIONS.indexOf(state.ep[pos] as (typeof SLOT_POSITIONS)[number]));
  if (perm.some((p) => p < 0)) throw new Error("An LSE slot holds a block edge");
  const flips = SLOT_POSITIONS.reduce<number>((f, pos, s) => f | (state.eo[pos] << s), 0);
  const centers = CENTERS_BY_U_CENTER[state.center[0]];
  if (centers === undefined) throw new Error("Centers are not in a middle-slice position");
  return encode(t.permRank[permCode(perm)], flips, centers, topTurn(state));
}

/**
 * True when the whole cube is solved and held the standard way (orange
 * left, yellow down, white up, green front): every piece and every center
 * home. Stricter than isSolved in the cube model, which ignores how the
 * cube is held.
 */
export function isLseSolved(state: CubeState): boolean {
  return (
    state.center.every((c, i) => c === i) &&
    state.cp.every((c, i) => c === i) &&
    state.co.every((o) => o === 0) &&
    state.ep.every((e, i) => e === i) &&
    state.eo.every((o) => o === 0)
  );
}

/**
 * Bad LSE edges by slot (see badMask), for a cube with blocks and top
 * corners solved. Empty when the edges are oriented.
 */
export function lseBadEdges(state: CubeState): SlotName[] {
  if (!isLseStart(state)) throw new Error("Both blocks and the top corners must be solved before LSE");
  const mask = badMask(lseIndex(state));
  return SLOT_NAMES.filter((_, s) => (mask >> s) & 1);
}

// ---------------------------------------------------------------------------
// Case recognition and step text.

const list = (items: readonly string[]) =>
  items.length <= 1 ? items.join("") : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;

function centersNote(centers: number): string {
  if (centers === 0) return "";
  if (centers === 2) return " The middle slice is a half turn off (white center on the bottom); that's fine, it gets fixed last.";
  return " The middle slice is a quarter turn off (white and yellow centers in front and back).";
}

function eoCase(i: number): LseCase {
  const mask = badMask(i);
  const bad = SLOT_NAMES.filter((_, s) => (mask >> s) & 1);
  const top = TOP_SLOTS.filter((s) => (mask >> s) & 1);
  const bottom = bad.length - top.length;
  const opposite = top.length === 2 && (top[1] - top[0]) % 2 === 0;
  const shape = top.length === 2 ? (opposite ? "opposite" : "adjacent") : "";
  const ids: Record<string, { id: string; name: string }> = {
    "1-1": { id: "eo-1-1", name: "1-1 (1 bad on top, 1 on the bottom)" },
    "2-0": { id: `eo-2-0-${shape}`, name: `2-0 (2 ${shape} bad on top)` },
    "0-2": { id: "eo-0-2", name: "0-2 (both bottom edges bad)" },
    "3-1": { id: "eo-3-1", name: "arrow (3 bad on top, 1 on the bottom)" },
    "4-0": { id: "eo-4-0", name: "4-0 (all 4 top edges bad)" },
    "2-2": { id: `eo-2-2-${shape}`, name: `2-2 (2 ${shape} bad on top, both bottom edges bad)` },
    "4-2": { id: "eo-6-flip", name: "6-flip (all six edges bad)" },
  };
  const found = ids[`${top.length}-${bottom}`];
  if (!found) throw new Error(`Unexpected bad-edge count ${top.length}-${bottom}`);
  const quarter = centersOf(i) & 1;
  return {
    ...found,
    recognition:
      `Bad edges: ${list(bad.map((s) => SLOT_TEXT[s]))}. An edge is bad when its white or yellow sticker faces front, back, left or right instead of up or down.` +
      (quarter
        ? " The middle slice is a quarter turn off right now (white and yellow centers in front and back): picture it turned back, so for the four middle-slice edges a white or yellow sticker facing front or back counts as good."
        : ""),
  };
}

function ulurCase(t: Tables, i: number): LseCase {
  const perm = t.perms.subarray(permOf(i) * 6, permOf(i) * 6 + 6);
  const ulSlot = perm.indexOf(S_UL);
  const urSlot = perm.indexOf(S_UR);
  const onTop = [ulSlot, urSlot].filter((s) => s < 4).length;
  const where = `The white-orange edge is at ${SLOT_TEXT[SLOT_NAMES[ulSlot]]}, the white-red edge at ${SLOT_TEXT[SLOT_NAMES[urSlot]]}.`;
  const quarter = centersOf(i) & 1 ? " The middle slice is a quarter turn off: turn it back with M or M' before turning the top layer a quarter turn, or edges flip again." : "";
  let found: { id: string; name: string };
  if (onTop === 2) {
    // Only a top-layer turn needed?
    const auf = [0, 1, 2].some((m) => t.ulur[applyIndex(t, i, m)] === 0); // U, U', U2
    found = auf
      ? { id: "ulur-top-auf", name: "both on top, just turn the top layer" }
      : { id: "ulur-both-top", name: "both on top" };
  } else if (onTop === 1) {
    found = { id: "ulur-top-bottom", name: "one on top, one on the bottom" };
  } else {
    found = { id: "ulur-both-bottom", name: "both on the bottom" };
  }
  return { ...found, recognition: where + quarter };
}

const RING_COLORS = RING.map((s) => PIECE_COLORS[s]);

function epCase(t: Tables, i: number): LseCase {
  const perm = Array.from(t.perms.subarray(permOf(i) * 6, permOf(i) * 6 + 6));
  const centers = centersOf(i);
  // With the top layer a half turn off, compare as if it were turned back (U2 swaps UF and UB).
  const topOff = topOf(i) === 2;
  if (topOff) [perm[1], perm[3]] = [perm[3], perm[1]];
  // Where each middle-slice piece is, compared with the centers: its ring
  // position with the slice turned back so the centers are solved.
  const rel = RING.map((piece) => (RING.indexOf(perm.indexOf(piece) as (typeof RING)[number]) - centers + 4) % 4);
  const inPlace = rel.map((r, k) => r === k);
  const note =
    centersNote(centers) +
    (topOff ? " The top layer is a half turn off: picture it turned back (U2) when you compare; the solve ends lined up." : "");
  const compared = centers === 0 ? "" : "Compared with the centers, ";
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  if (inPlace.every(Boolean)) {
    return {
      id: "ep-centers",
      name: "only the centers",
      recognition: `The four middle-slice edges already match the centers; only the middle slice needs turning.${note}`,
    };
  }
  const fixed = inPlace.findIndex(Boolean);
  if (fixed >= 0) {
    const others = RING_COLORS.filter((_, k) => k !== fixed);
    return {
      id: `ep-3-cycle-${SLOT_NAMES[RING[fixed]].toLowerCase()}`,
      name: `3-cycle (${RING_COLORS[fixed]} in place)`,
      recognition: `${cap(`${compared}the ${RING_COLORS[fixed]} edge is in place and the other three (${list(others)}) need to cycle.`)}${note}`,
    };
  }
  // Two swaps: which ring positions trade places?
  const partner = rel[0]; // ring position the UF piece sits in
  const swaps: Record<number, { id: string; name: string; text: string }> = {
    3: { id: "ep-swap-front-back", name: "front and back swapped", text: "white-green and white-blue are swapped, and so are yellow-green and yellow-blue" },
    1: { id: "ep-swap-top-bottom", name: "top and bottom swapped", text: "white-green and yellow-green are swapped, and so are white-blue and yellow-blue" },
    2: { id: "ep-swap-diagonal", name: "diagonal swaps", text: "white-green and yellow-blue are swapped, and so are white-blue and yellow-green" },
  };
  const swap = swaps[partner];
  if (!swap || rel[partner] !== 0) throw new Error("Unexpected middle-slice edge cycle");
  return { id: swap.id, name: swap.name, recognition: `${cap(`${compared}${swap.text}.`)}${note}` };
}

function stepText(id: LseStepId, c: LseCase): { name: string; goal: string } {
  switch (id) {
    case "lse-eo":
      return {
        name: `Orient edges: ${c.name}`,
        goal:
          "Make all six remaining edges good using only M and U turns, so none of them needs flipping later. " +
          `${c.recognition} An edge changes between good and bad when the top layer turns a quarter while the middle slice is a quarter turn off, which is why orienting looks like M' U M'.`,
      };
    case "lse-ulur":
      return {
        name: `Place UL and UR: ${c.name}`,
        goal:
          "Put the white-orange and white-red edges into the left and right spots of the top layer, each between the two top corners that share its color (orange or red). The top layer may end a half turn off; the last step turns it back. " +
          `${c.recognition} The edges stay good: the top layer only turns a quarter while the white and yellow centers are up and down.`,
      };
    case "lse-ep":
      return {
        name: `Solve the middle slice: ${c.name}`,
        goal:
          "Solve the last four edges (white-green, white-blue, yellow-green, yellow-blue) and the centers with M and U turns, and line the top layer up with the blocks; the cube ends fully solved. " +
          c.recognition,
      };
  }
}

// ---------------------------------------------------------------------------
// Planning: every phase uses as few moves as it can; among equally short
// options pick the shortest total, then the fewest steps that start on the
// layer the step before ended on, then the easiest moves.

interface Plan {
  score: number;
  /** Move indexes, with the phase each one belongs to. */
  moves: number[];
  phases: number[];
}

const PHASES: readonly LseStepId[] = ["lse-eo", "lse-ulur", "lse-ep"];
const LENGTH_WEIGHT = 1e6;
const CLASH_WEIGHT = 1e3;

function plan(t: Tables, start: number, prevLayer: number): Plan {
  const dists = [t.eo, t.ulur, t.ep];
  const keeps = [undefined, isGood, isGood];
  const memo = new Map<number, Plan>();

  const bestFrom = (phase: number, i: number, last: number, atStart: boolean): Plan => {
    if (phase === PHASES.length) return { score: 0, moves: [], phases: [] };
    const d = dists[phase][i];
    if (d === UNSEEN) throw new Error("Impossible LSE state");
    if (d === 0) return bestFrom(phase + 1, i, last, true);
    const key = ((phase * SIZE + i) * 3 + last + 1) * 2 + (atStart ? 1 : 0);
    const cached = memo.get(key);
    if (cached) return cached;
    let chosen: Plan | undefined;
    for (let m = 0; m < MOVE_COUNT; m++) {
      if (!atStart && MOVE_LAYER[m] === last) continue;
      const j = applyIndex(t, i, m);
      if (dists[phase][j] !== d - 1 || (keeps[phase] && !keeps[phase]!(j))) continue;
      const rest = bestFrom(phase, j, MOVE_LAYER[m], false);
      const clash = atStart && MOVE_LAYER[m] === last ? CLASH_WEIGHT : 0;
      const score = LENGTH_WEIGHT + clash + MOVE_EFFORT[m] + rest.score;
      if (!chosen || score < chosen.score) {
        chosen = { score, moves: [m, ...rest.moves], phases: [phase, ...rest.phases] };
      }
    }
    if (!chosen) throw new Error("No LSE move found");
    memo.set(key, chosen);
    return chosen;
  };
  return bestFrom(0, start, prevLayer, true);
}

export interface LseOptions {
  /** The last move before LSE (e.g. CMLL's), so the first step doesn't start on that layer when avoidable. */
  previousMove?: Move;
}

/**
 * Solve the last six edges and the middle-slice centers of a cube whose
 * blocks and top corners are solved (as left by solveCmll; the top layer
 * may also be turned). Only U and M turns are used. The cube ends fully
 * solved in the standard orientation (see isLseSolved).
 */
export function solveLse(state: CubeState, options: LseOptions = {}): LseSolution {
  if (!isLseStart(state)) throw new Error("Both blocks and the top corners must be solved before LSE");
  const t = getTables();
  const start = lseIndex(state);
  const prev = options.previousMove?.[0];
  const prevLayer = prev === "U" ? 0 : prev === "M" ? 1 : -1;
  const chosen = plan(t, start, prevLayer);

  const steps: LseStep[] = [];
  let i = start;
  for (let phase = 0; phase < PHASES.length; phase++) {
    const moves = chosen.moves.filter((_, k) => chosen.phases[k] === phase);
    if (moves.length === 0) continue;
    const id = PHASES[phase];
    const c = phase === 0 ? eoCase(i) : phase === 1 ? ulurCase(t, i) : epCase(t, i);
    steps.push({ id, ...stepText(id, c), moves: moves.map((m) => LSE_MOVES[m]), case: c, centersOff: centersOf(i) });
    for (const m of moves) i = applyIndex(t, i, m);
  }
  if (i !== SOLVED_INDEX) throw new Error("LSE plan did not solve the cube");
  return { moves: steps.flatMap((s) => s.moves), steps };
}
