// Roux CMLL: solve the four top-layer corners (place and twist them) in one
// algorithm, once both blocks are built. The steps:
//   1. pre-AUF: turn the top layer so the case sits the way its algorithm
//      starts (skipped when it already does)
//   2. the case's algorithm from the CMLL table (cmllCases.ts)
//   3. post-AUF: turn the top layer so every corner sits above its colors on
//      the blocks (skipped when the algorithm already ends there)
// After CMLL the corners are fully solved relative to the blocks, so LSE only
// has the six edges and the middle-slice centers left.
//
// The beginner method ("two-look CMLL", the default in the tutor) splits this
// in two algorithms with 9 to learn instead of 42:
//   1. orient: one algorithm per set (Sune, Anti-Sune, H, Pi, U, T, L) turns
//      every top corner top color up, after a pre-AUF. Cases in a set share
//      their twist pattern, so the set's algorithm orients all of them
//   2. then the corners are an O case (or solved): the usual steps above
//      with O Adjacent or O Diagonal
//
// Cases are recognized from the corners alone, relative to the blocks (the
// left and right centers and the bottom layer), never from the top center:
// after the blocks the middle slice is often turned. Recognition is a table
// lookup: for every top-corner state, the shortest pre-AUF + algorithm +
// post-AUF that solves it, worked out by undoing each option on a solved cube.
import type { CubeState } from "cubejs";
import { applyMoves, solvedState } from "@/lib/cube/model";
import { invertAlgorithm, type Move } from "@/lib/cube/notation";
import { best, isFirstBlockSolved, type FirstBlockSolution, type SolveStep } from "./firstBlock";
import { CMLL_SETS, cmllCases, topColorText, type CmllCase, type CmllSet } from "./cmllCases";
import { isSecondBlockSolved, solveBlocks, type SecondBlockSolution } from "./secondBlock";

export type CmllStepId = "cmll-orient-pre-auf" | "cmll-orient" | "cmll-pre-auf" | "cmll" | "cmll-post-auf";

/** "full": one algorithm out of 42 (CMLL). "beginner": orient, then swap (9 algorithms). */
export type CmllMethod = "full" | "beginner";

export interface CmllStep extends SolveStep<CmllStepId> {
  /**
   * On the "cmll" step: the case and its algorithm. On the beginner's
   * "cmll-orient" and "cmll-orient-pre-auf" steps: the set's orienting
   * algorithm (named after one case of the set).
   */
  case?: CmllCase;
}

export interface CmllSolution {
  /** All CMLL moves, in order. */
  moves: Move[];
  /** Only steps that need moves. */
  steps: CmllStep[];
  /** The case solved, or null when the corners only needed a top-layer turn (or nothing). */
  case: CmllCase | null;
}

/** The four top-layer corner positions come first in cubejs order. */
const TOP_CORNERS = [0, 1, 2, 3] as const;
/** cubejs center slots (and center numbers): U R F D L B. */
const M_CENTERS = [0, 2, 3, 5] as const;

/** Where the four top corners are and how they're twisted (assumes the bottom corners are home). */
function cornerKey(state: CubeState): string {
  return TOP_CORNERS.map((i) => `${state.cp[i]}${state.co[i]}`).join("");
}

const SOLVED_KEY = cornerKey(solvedState());

/**
 * True when both blocks are built and the four top corners are home and
 * twisted right: only the six LSE edges and the middle-slice centers are
 * left. The top center may be off (M moves); the corners are judged against
 * the blocks.
 */
export function isCmllSolved(state: CubeState): boolean {
  return isFirstBlockSolved(state) && isSecondBlockSolved(state) && cornerKey(state) === SOLVED_KEY;
}

interface Plan {
  pre: Move[];
  case: CmllCase | null;
  post: Move[];
  moves: Move[];
}

const AUFS: readonly Move[][] = [[], ["U"], ["U'"], ["U2"]];

/**
 * The best plan for every unsolved top-corner state: fewest moves, then the
 * easiest moves (see best); on a tie the earlier option wins, so a post-AUF
 * is preferred over a pre-AUF.
 */
function buildPlans(): Map<string, Plan> {
  const options: Plan[] = [];
  // Corners already solved but turned: just the post-AUF.
  for (const post of AUFS.slice(1)) options.push({ pre: [], case: null, post, moves: post });
  for (const c of cmllCases()) {
    for (const pre of AUFS) {
      for (const post of AUFS) options.push({ pre, case: c, post, moves: [...pre, ...c.moves, ...post] });
    }
  }
  const plans = new Map<string, Plan>();
  for (const option of options) {
    const key = cornerKey(applyMoves(solvedState(), invertAlgorithm(option.moves)));
    const current = plans.get(key);
    plans.set(key, current ? best([current, option]) : option);
  }
  return plans;
}

let plans: Map<string, Plan> | undefined;
const getPlans = () => (plans ??= buildPlans());

/** Number of top-corner states CMLL can be asked to solve, besides solved. */
export function cmllStateCount(): number {
  return getPlans().size;
}

const CENTERS_NOTE =
  " The top center may show another color right now (the middle slice is turned): go by the corners and the blocks, not the centers.";

function stepText(
  id: Exclude<CmllStepId, "cmll-orient-pre-auf" | "cmll-orient">,
  plan: Plan,
  centersOff: boolean,
  method: CmllMethod,
): { name: string; goal: string } {
  const note = centersOff ? CENTERS_NOTE : "";
  switch (id) {
    case "cmll-pre-auf": {
      const c = plan.case!;
      return {
        name: "Line up the corner case",
        goal: `Turn the top layer so the ${CMLL_SETS[c.set].label} case sits the way its algorithm starts. Only the top layer moves; both blocks stay put.${note}`,
      };
    }
    case "cmll": {
      const c = plan.case!;
      const label = CMLL_SETS[c.set].label;
      if (method === "beginner") {
        return {
          name: `Swap the corners: ${c.name}${c.nickname ? ` (${c.nickname})` : ""}`,
          goal:
            `Move the four top corners to their places with one algorithm: ${c.alg}. All four already show the top color (white) on top; ${c.set === "O" && c.id === "o-diagonal" ? "two diagonal corners need to swap" : "two neighboring corners need to swap"}. ${c.recognition}` +
            " Both blocks end exactly where they were; the middle edges and centers may move, and get solved last." +
            (plan.pre.length === 0 ? note : ""),
        };
      }
      return {
        name: `CMLL: ${label} case (${c.name}${c.nickname && c.nickname !== label ? `, ${c.nickname}` : ""})`,
        goal:
          `Solve all four top corners with one algorithm: ${c.alg}. ${label} set: ${CMLL_SETS[c.set].shape} (top color = white, opposite the yellow bottom). ${c.recognition}` +
          " Both blocks end exactly where they were; the middle edges and centers may move, and get solved last." +
          (plan.pre.length === 0 ? note : ""),
      };
    }
    case "cmll-post-auf":
      return plan.case
        ? {
            name: "Line up the top corners",
            goal: "Turn the top layer so every top corner sits above the matching colors of the left and right blocks.",
          }
        : {
            name: "Line up the top corners (CMLL skip)",
            goal: `The top corners are already solved, just turned. Turn the top layer so every corner sits above the matching colors of the left and right blocks.${note}`,
          };
  }
}

/**
 * The beginner's orienting algorithm for each set (one case's algorithm from
 * the table): the most common ones on two-look CMLL sheets.
 */
const ORIENT_CASES: Record<Exclude<CmllSet, "O">, string> = {
  S: "s-1", // Sune
  AS: "as-1", // Anti-Sune
  H: "h-1",
  Pi: "pi-1",
  U: "u-6", // F R U R' U' F'
  T: "t-1",
  L: "l-2",
};

/** The beginner's 9 algorithms: 7 to orient, then O Adjacent and O Diagonal. */
export function beginnerCmllCases(): readonly CmllCase[] {
  const ids = new Set([...Object.values(ORIENT_CASES), "o-adjacent", "o-diagonal"]);
  return cmllCases().filter((c) => ids.has(c.id));
}

const topOriented = (state: CubeState) => TOP_CORNERS.every((i) => state.co[i] === 0);

/**
 * Solve the four top corners of a cube whose blocks are both built (as left
 * by solveBlocks: orange left, yellow down; the middle slice may be turned).
 * Both blocks end solved; the six LSE edges and the middle-slice centers may
 * move. `method` picks one algorithm (full CMLL) or the beginner's two.
 */
export function solveCmll(state: CubeState, method: CmllMethod = "full"): CmllSolution {
  if (!isFirstBlockSolved(state) || !isSecondBlockSolved(state)) {
    throw new Error("Both blocks must be solved before CMLL");
  }
  if (method === "beginner" && !topOriented(state)) return solveBeginner(state);
  return solveOneLook(state, method);
}

/** Orient with the set's algorithm, then finish as an O case (or just an AUF). */
function solveBeginner(state: CubeState): CmllSolution {
  const orientCases = Object.values(ORIENT_CASES).map((id) => cmllCases().find((c) => c.id === id)!);
  const options = orientCases.flatMap((c) =>
    AUFS.flatMap((pre) => {
      const oriented = applyMoves(state, [...pre, ...c.moves]);
      if (!topOriented(oriented)) return [];
      const rest = solveOneLook(oriented, "beginner");
      return [{ pre, case: c, rest, moves: [...pre, ...c.moves, ...rest.moves] }];
    }),
  );
  if (options.length === 0) throw new Error("No orienting algorithm fits these corners");
  const plan = best(options);
  const c = plan.case;
  const label = CMLL_SETS[c.set].label;
  const centersOff = M_CENTERS.some((i) => state.center[i] !== i);
  const note = centersOff ? CENTERS_NOTE : "";
  const steps: CmllStep[] = [];
  if (plan.pre.length > 0) {
    steps.push({
      id: "cmll-orient-pre-auf",
      name: "Line up the corner twist",
      goal: `Turn the top layer so the ${label} pattern sits the way its algorithm starts. Only the top layer moves; both blocks stay put.${note}`,
      moves: plan.pre,
      case: c,
    });
  }
  const seen = applyMoves(state, plan.pre);
  steps.push({
    id: "cmll-orient",
    name: `Twist the corners: ${label}`,
    goal:
      `Turn all four top corners top color (white) up with one algorithm: ${c.alg}. ${label} pattern: ${CMLL_SETS[c.set].shape}. ${topColorText(seen)}` +
      " The corners may still sit in the wrong places; the next algorithm swaps them. Both blocks end exactly where they were; the middle edges and centers may move, and get solved last." +
      (plan.pre.length === 0 ? note : ""),
    moves: c.moves,
    case: c,
  });
  steps.push(...plan.rest.steps);
  return { moves: steps.flatMap((s) => s.moves), steps, case: plan.rest.case ?? c };
}

function solveOneLook(state: CubeState, method: CmllMethod): CmllSolution {
  const key = cornerKey(state);
  if (key === SOLVED_KEY) return { moves: [], steps: [], case: null };
  const plan = getPlans().get(key);
  if (!plan) throw new Error("Impossible top-corner state");
  const centersOff = M_CENTERS.some((i) => state.center[i] !== i);

  type OneLookId = Exclude<CmllStepId, "cmll-orient-pre-auf" | "cmll-orient">;
  const step = (id: OneLookId, moves: Move[]): CmllStep => ({
    id,
    ...stepText(id, plan, centersOff, method),
    moves,
    ...(id === "cmll" && plan.case ? { case: plan.case } : {}),
  });
  const parts: [OneLookId, Move[]][] = [
    ["cmll-pre-auf", plan.pre],
    ["cmll", plan.case?.moves ?? []],
    ["cmll-post-auf", plan.post],
  ];
  const steps = parts.filter(([, moves]) => moves.length > 0).map(([id, moves]) => step(id, moves));
  return { moves: steps.flatMap((s) => s.moves), steps, case: plan.case };
}

export interface ThroughCmllSolution {
  /** First block, second block and CMLL moves, in order. */
  moves: Move[];
  firstBlock: FirstBlockSolution;
  secondBlock: SecondBlockSolution;
  cmll: CmllSolution;
}

/** First block, second block, then CMLL: everything before LSE. */
export function solveThroughCmll(state: CubeState, method: CmllMethod = "full"): ThroughCmllSolution {
  const blocks = solveBlocks(state);
  const cmll = solveCmll(applyMoves(state, blocks.moves), method);
  return {
    moves: [...blocks.moves, ...cmll.moves],
    firstBlock: blocks.firstBlock,
    secondBlock: blocks.secondBlock,
    cmll,
  };
}
