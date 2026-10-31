// What /tutor?session=<id> plays: the saved session's cube, solved again, and
// where to pick it up. Server only (it runs the solver).
import type { SessionSource, TutoringSession } from "@/lib/supabase/tutoringSessions";
import { lessonForCube } from "./cubeLesson";
import type { Lesson } from "./lesson";

export interface SessionLesson {
  lesson: Lesson;
  source: SessionSource;
  /** Set when the solve can carry on in the same row; absent = start a new session from move 0. */
  resume?: { id: string; stepsCompleted: number };
}

const SOURCES: readonly SessionSource[] = ["scan", "manual", "scramble"];

/**
 * The lesson for a saved session. It continues at the saved move when the
 * solve isn't finished and the solver still gives the same moves; otherwise
 * (finished, or the solver has changed since) it starts over as a new session.
 * Null if the saved cube can't be solved (shouldn't happen: rows are checked
 * when written).
 */
export function lessonForSession(row: TutoringSession): SessionLesson | null {
  const result = lessonForCube(row.start_facelets);
  if ("error" in result) return null;
  const { lesson } = result;
  const source = SOURCES.includes(row.source as SessionSource) ? (row.source as SessionSource) : "manual";
  const sameMoves =
    lesson.steps.length === row.moves.length && lesson.steps.every((step, i) => step.move === row.moves[i]);
  const unfinished = row.completed_at === null && row.steps_completed < row.moves.length;
  if (!sameMoves || !unfinished) return { lesson, source };
  return { lesson, source, resume: { id: row.id, stepsCompleted: row.steps_completed } };
}
