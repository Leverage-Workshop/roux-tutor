// A lesson is a starting position plus a solve split into Roux stages. The
// tutor screen loads `steps` into the cube store; step i of the lesson is
// move i of the store's move list.
import { toMoves, type Move } from "@/lib/cube/notation";

export type RouxStageId = "fb" | "sb" | "cmll" | "lse";

export interface RouxStage {
  id: RouxStageId;
  name: string;
  /** Short label for the stage indicator. */
  short: string;
  /** What the stage achieves; tutorial text for moves without an explanation. */
  goal: string;
}

export const ROUX_STAGES: readonly RouxStage[] = [
  {
    id: "fb",
    name: "First Block",
    short: "FB",
    goal: "Build a 1x2x3 block on the left side: the orange center with its bottom two layers of edges and corners.",
  },
  {
    id: "sb",
    name: "Second Block",
    short: "SB",
    goal: "Build the matching 1x2x3 block on the right using only R, r, U and M, so the first block stays solved.",
  },
  {
    id: "cmll",
    name: "CMLL",
    short: "CMLL",
    goal: "Solve the four top corners in one algorithm. The middle slice is ignored, so the algorithm can break it freely.",
  },
  {
    id: "lse",
    name: "Last Six Edges",
    short: "LSE",
    goal: "Finish with only U and M moves: orient the edges, place UL and UR, then solve the middle slice.",
  },
];

export function stageById(id: RouxStageId): RouxStage {
  const stage = ROUX_STAGES.find((s) => s.id === id);
  if (!stage) throw new Error(`Unknown Roux stage: ${id}`);
  return stage;
}

export interface TutorStep {
  move: Move;
  stage: RouxStageId;
  /** Index into `lesson.phases`: the solver step this move belongs to. */
  phase?: number;
  /** Why this move is played (see explanations.ts). */
  explanation?: string;
}

/** One step of the solve, e.g. "Front pair: join corner and edge". */
export interface LessonPhase {
  /** Solver step id, e.g. "front-pair-join", "cmll", "lse-eo". */
  id: string;
  stage: RouxStageId;
  name: string;
  /** What the step achieves; for CMLL and LSE also how to recognize the case. */
  goal: string;
}

export interface Lesson {
  /** Moves that take a solved cube to the starting position (empty for an entered cube). */
  scramble: Move[];
  /** The starting position as a facelet string, when the cube was entered rather than scrambled. */
  start?: string;
  steps: TutorStep[];
  /** The solve's steps; each move's `phase` points here. Absent for hand-made lessons. */
  phases?: LessonPhase[];
}

/** Build a lesson from a scramble and one algorithm per stage, in order. */
export function createLesson(
  scramble: string,
  stages: readonly { stage: RouxStageId; alg: string }[],
): Lesson {
  return {
    scramble: toMoves(scramble),
    steps: stages.flatMap(({ stage, alg }) => toMoves(alg).map((move) => ({ move, stage }))),
  };
}

/**
 * Where each Roux stage ends, as a count of moves from the start of the solve:
 * `[fb, sb, cmll, lse]`, the last being the number of moves. A stage with no
 * moves ends where the one before it does. Assumes steps are in stage order.
 */
export function stageEnds(steps: readonly Pick<TutorStep, "stage">[]): number[] {
  return ROUX_STAGES.map((_, i) => steps.filter((s) => ROUX_STAGES.findIndex((r) => r.id === s.stage) <= i).length);
}

/**
 * The stage the user is working on after stepping through `stepsCompleted`
 * moves, or null when every stage is done.
 */
export function stageInProgress(ends: readonly number[], stepsCompleted: number): RouxStage | null {
  const i = ends.findIndex((end) => stepsCompleted < end);
  return i === -1 ? null : ROUX_STAGES[i];
}
