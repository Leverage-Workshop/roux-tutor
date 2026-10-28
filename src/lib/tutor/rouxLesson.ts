// A tutor lesson from the Roux solver: solve the scrambled cube with
// solveRoux, then attach to every move its stage, its solver step (name and
// goal) and the explanation of why it is played.
//
// Solving takes ~300ms the first time (the solver builds its lookup tables)
// and a few milliseconds after that, so pages build their lesson on the
// server (at build time for /tutor); the solver never ships to the browser.
import { applyMoves, solvedState } from "@/lib/cube/model";
import { toMoves, type Move } from "@/lib/cube/notation";
import { solveRoux } from "@/lib/solver/roux";
import { explainRouxSolution } from "./explanations";
import type { Lesson, LessonPhase, TutorStep } from "./lesson";

export function rouxLesson(scramble: string | readonly Move[]): Lesson {
  const moves = toMoves(scramble);
  const start = applyMoves(solvedState(), moves);
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
  return { scramble: moves, steps, phases };
}
