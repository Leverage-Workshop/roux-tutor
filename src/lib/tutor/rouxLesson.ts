// A tutor lesson from the Roux solver: solve the scrambled cube with
// solveRoux, then attach to every move its stage, its solver step (name and
// goal) and the explanation of why it is played.
//
// Solving takes ~300ms the first time (the solver builds its lookup tables)
// and a few milliseconds after that, so pages build their lesson on the
// server (at build time for /tutor); the solver never ships to the browser.
import { applyMoves, solvedState, toFacelets, type CubeState } from "@/lib/cube/model";
import { toMoves, type Move } from "@/lib/cube/notation";
import { solveRoux } from "@/lib/solver/roux";
import { explainRouxSolution } from "./explanations";
import type { Lesson, LessonPhase, TutorStep } from "./lesson";

/** The lesson for a scrambled cube. */
export function rouxLesson(scramble: string | readonly Move[]): Lesson {
  const moves = toMoves(scramble);
  return { ...solveLesson(applyMoves(solvedState(), moves)), scramble: moves };
}

/** The lesson for a cube entered sticker by sticker (a legal state, see validate.ts). */
export function rouxLessonFromState(start: CubeState): Lesson {
  return { ...solveLesson(start), scramble: [], start: toFacelets(start) };
}

function solveLesson(start: CubeState): Omit<Lesson, "scramble"> {
  const solution = solveRoux(start);
  const explanations = explainRouxSolution(start, solution);

  const phases: LessonPhase[] = [];
  const steps: TutorStep[] = [];
  for (const stage of solution.stages) {
    for (const step of stage.steps) {
      const phase = phases.push({ id: step.id, stage: stage.stage, name: step.name, goal: step.goal }) - 1;
      for (const move of step.moves) {
        steps.push({ move, stage: stage.stage, phase, explanation: explanations[steps.length].text });
      }
    }
  }
  return { steps, phases };
}
