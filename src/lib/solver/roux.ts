// The whole Roux solve: first block, second block, CMLL, then LSE. Each
// stage lists its steps (id, name, goal, moves, plus stage-specific data
// such as the CMLL or LSE case), in the order the tutor plays them.
//
// CMLL on its own ends by lining the top layer up with the blocks
// (cmll-post-auf). In the full solve that turn is left out whenever LSE does
// at least as well without it (as in a human solve, where the top layer is
// only lined up during LSE): fewer moves in total, and no "U' | U2" where
// CMLL's last turn and LSE's first turn hit the same layer.
import type { CubeState } from "cubejs";
import { applyMoves } from "@/lib/cube/model";
import type { Move } from "@/lib/cube/notation";
import type { RouxStageId } from "@/lib/tutor/lesson";
import { solveThroughCmll, type CmllSolution, type CmllStep } from "./cmll";
import type { FirstBlockStepId, SolveStep } from "./firstBlock";
import { solveLse, type LseSolution, type LseStep } from "./lse";
import type { SecondBlockStepId } from "./secondBlock";

interface StageSolution<S extends RouxStageId, Step> {
  stage: S;
  /** All of the stage's moves, in order (empty when the stage needs none). */
  moves: Move[];
  /** Only steps that need moves. */
  steps: Step[];
}

export type RouxStageSolution =
  | StageSolution<"fb", SolveStep<FirstBlockStepId>>
  | StageSolution<"sb", SolveStep<SecondBlockStepId>>
  | StageSolution<"cmll", CmllStep>
  | StageSolution<"lse", LseStep>;

export type RouxStepId = RouxStageSolution["steps"][number]["id"];

export interface RouxSolution {
  /** Every move of the solve, in order. */
  moves: Move[];
  /** Always the four stages, in order: fb, sb, cmll, lse. */
  stages: [
    StageSolution<"fb", SolveStep<FirstBlockStepId>>,
    StageSolution<"sb", SolveStep<SecondBlockStepId>>,
    StageSolution<"cmll", CmllStep>,
    StageSolution<"lse", LseStep>,
  ];
}

interface Ending {
  cmll: CmllSolution;
  lse: LseSolution;
  moves: number;
  clash: boolean;
}

/**
 * Solve any real cube position the Roux way. The solve starts with a
 * whole-cube rotation when needed (orange left, yellow down) and ends with
 * every piece and center solved in that orientation (see isLseSolved).
 */
export function solveRoux(state: CubeState): RouxSolution {
  const { firstBlock, secondBlock, cmll } = solveThroughCmll(state);
  const blockMoves = [...firstBlock.moves, ...secondBlock.moves];

  const ending = (c: CmllSolution): Ending => {
    const before = [...blockMoves, ...c.moves];
    const previousMove = before.at(-1);
    const lse = solveLse(applyMoves(state, before), { previousMove });
    return { cmll: c, lse, moves: c.moves.length + lse.moves.length, clash: lse.moves[0]?.[0] === previousMove?.[0] };
  };
  const endings = [ending(cmll)];
  if (cmll.steps.at(-1)?.id === "cmll-post-auf") {
    const steps = cmll.steps.slice(0, -1);
    endings.push(ending({ ...cmll, steps, moves: steps.flatMap((s) => s.moves) }));
  }
  // Fewest moves, then no same-layer turn between CMLL and LSE; on a full tie, skip the extra turn.
  const chosen = endings.reduce((a, b) =>
    b.moves < a.moves || (b.moves === a.moves && (!b.clash || a.clash)) ? b : a,
  );

  return {
    moves: [...blockMoves, ...chosen.cmll.moves, ...chosen.lse.moves],
    stages: [
      { stage: "fb", moves: firstBlock.moves, steps: firstBlock.steps },
      { stage: "sb", moves: secondBlock.moves, steps: secondBlock.steps },
      { stage: "cmll", moves: chosen.cmll.moves, steps: chosen.cmll.steps },
      { stage: "lse", moves: chosen.lse.moves, steps: chosen.lse.steps },
    ],
  };
}
