// A tutor lesson from the Roux solver: solve the scrambled cube with
// solveRoux, then attach to every move its stage, its solver step (name and
// goal) and the explanation of why it is played.
//
// The solve is played with the cube held the tutor's way (red in front, white
// on the bottom, see hold.ts): the lesson's `hold` rotation turns the start
// there, the solver's moves are relative to it and its text names the colors
// as they sit on the held cube.
//
// Solving takes ~300ms the first time (the solver builds its lookup tables)
// and a few milliseconds after that, so pages build their lesson on the
// server (at build time for /tutor); the solver never ships to the browser.
import { applyMoves, solvedState, toFacelets, type CubeState } from "@/lib/cube/model";
import { toMoves, type Move } from "@/lib/cube/notation";
import { solveRoux } from "@/lib/solver/roux";
import { explainRouxSolution } from "./explanations";
import { holdColors, holdRotation, solverView } from "./hold";
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
  const hold = holdRotation(start);
  const view = solverView(applyMoves(start, hold));
  const solution = solveRoux(view);
  const explanations = explainRouxSolution(view, solution);

  const phases: LessonPhase[] = [];
  const steps: TutorStep[] = [];
  for (const stage of solution.stages) {
    for (const step of stage.steps) {
      const phase =
        phases.push({ id: step.id, stage: stage.stage, name: holdColors(step.name), goal: holdColors(step.goal) }) - 1;
      for (const move of step.moves) {
        steps.push({ move, stage: stage.stage, phase, explanation: holdColors(explanations[steps.length].text) });
      }
    }
  }
  return { hold, steps, phases };
}
