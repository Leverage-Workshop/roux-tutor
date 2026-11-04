// A tutor lesson from the Roux solver: solve the scrambled cube with
// solveRoux, then attach to every move its stage, its solver step (name and
// goal) and the explanation of why it is played.
//
// The solve is played with the cube held the tutor's way (red in front, white
// on the bottom, see hold.ts): the lesson's `hold` rotation turns the start
// there, the solver's moves are relative to it and its text names the colors
// as they sit on the held cube. The first move that turns the middle centers
// (white leaves the bottom) says that this is expected.
//
// Solving takes ~300ms the first time (the solver builds its lookup tables)
// and a few milliseconds after that, so pages build their lesson on the
// server (at build time for /tutor); the solver never ships to the browser.
import { applyMoves, solvedState, toFacelets, type CubeState } from "@/lib/cube/model";
import { toMoves, type Move } from "@/lib/cube/notation";
import type { CmllMethod } from "@/lib/solver/cmll";
import { solveRoux } from "@/lib/solver/roux";
import { DEFAULT_CORNERS } from "./corners";
import { explainRouxSolution } from "./explanations";
import { centersTurnedNote, holdColors, holdRotation, solverView } from "./hold";
import type { Lesson, LessonPhase, TutorStep } from "./lesson";

/** The lesson for a scrambled cube. */
export function rouxLesson(scramble: string | readonly Move[], corners: CmllMethod = DEFAULT_CORNERS): Lesson {
  const moves = toMoves(scramble);
  return { ...solveLesson(applyMoves(solvedState(), moves), corners), scramble: moves };
}

/** The lesson for a cube entered sticker by sticker (a legal state, see validate.ts). */
export function rouxLessonFromState(start: CubeState, corners: CmllMethod = DEFAULT_CORNERS): Lesson {
  return { ...solveLesson(start, corners), scramble: [], start: toFacelets(start) };
}

function solveLesson(start: CubeState, corners: CmllMethod): Omit<Lesson, "scramble"> {
  const hold = holdRotation(start);
  const view = solverView(applyMoves(start, hold));
  const solution = solveRoux(view, { corners });
  const explanations = explainRouxSolution(view, solution);

  const phases: LessonPhase[] = [];
  const steps: TutorStep[] = [];
  let cube = view;
  let noted = false;
  for (const stage of solution.stages) {
    for (const step of stage.steps) {
      const phase =
        phases.push({ id: step.id, stage: stage.stage, name: holdColors(step.name), goal: holdColors(step.goal) }) - 1;
      for (const move of step.moves) {
        let explanation = holdColors(explanations[steps.length].text);
        cube = applyMoves(cube, [move]);
        // The solver's frame: the bottom center is "D" while the middle slice is straight.
        if (!noted && toFacelets(cube)[31] !== "D") {
          explanation += centersTurnedNote(move);
          noted = true;
        }
        steps.push({ move, stage: stage.stage, phase, explanation });
      }
    }
  }
  return { hold, steps, phases, corners };
}
