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
// Cases are recognized from the corners alone, relative to the blocks (the
// left and right centers and the bottom layer), never from the top center:
// after the blocks the middle slice is often turned. Recognition is a table
// lookup: for every top-corner state, the shortest pre-AUF + algorithm +
// post-AUF that solves it, worked out by undoing each option on a solved cube.
import type { CubeState } from "cubejs";
import { applyMoves, solvedState } from "@/lib/cube/model";
import { invertAlgorithm, type Move } from "@/lib/cube/notation";
import { best, isFirstBlockSolved, type FirstBlockSolution, type SolveStep } from "./firstBlock";
import { CMLL_SETS, cmllCases, type CmllCase } from "./cmllCases";
import { isSecondBlockSolved, solveBlocks, type SecondBlockSolution } from "./secondBlock";

export type CmllStepId = "cmll-pre-auf" | "cmll" | "cmll-post-auf";

export interface CmllStep extends SolveStep<CmllStepId> {
  /** On the "cmll" step: the case and its algorithm. */
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

function stepText(id: CmllStepId, plan: Plan, centersOff: boolean): { name: string; goal: string } {
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
 * Solve the four top corners of a cube whose blocks are both built (as left
 * by solveBlocks: orange left, yellow down; the middle slice may be turned).
 * Both blocks end solved; the six LSE edges and the middle-slice centers may
 * move.
 */
export function solveCmll(state: CubeState): CmllSolution {
  if (!isFirstBlockSolved(state) || !isSecondBlockSolved(state)) {
    throw new Error("Both blocks must be solved before CMLL");
  }
  const key = cornerKey(state);
  if (key === SOLVED_KEY) return { moves: [], steps: [], case: null };
  const plan = getPlans().get(key);
  if (!plan) throw new Error("Impossible top-corner state");
  const centersOff = M_CENTERS.some((i) => state.center[i] !== i);

  const step = (id: CmllStepId, moves: Move[]): CmllStep => ({
    id,
    ...stepText(id, plan, centersOff),
    moves,
    ...(id === "cmll" && plan.case ? { case: plan.case } : {}),
  });
  const parts: [CmllStepId, Move[]][] = [
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
export function solveThroughCmll(state: CubeState): ThroughCmllSolution {
  const blocks = solveBlocks(state);
  const cmll = solveCmll(applyMoves(state, blocks.moves));
  return {
    moves: [...blocks.moves, ...cmll.moves],
    firstBlock: blocks.firstBlock,
    secondBlock: blocks.secondBlock,
    cmll,
  };
}
