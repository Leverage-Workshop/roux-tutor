import { describe, expect, it } from "vitest";
import { applyMoves, solvedState, toFacelets } from "@/lib/cube/model";
import type { TutoringSession } from "@/lib/supabase/tutoringSessions";
import { DEMO_SCRAMBLE, demoLesson } from "./demoLesson";
import { stageEnds } from "./lesson";
import { lessonForSession } from "./sessionLesson";

const DEMO = demoLesson();
const DEMO_MOVES = DEMO.steps.map((s) => s.move);

function row(overrides: Partial<TutoringSession> = {}): TutoringSession {
  return {
    id: "11111111-2222-3333-4444-555555555555",
    user_id: "u",
    start_facelets: toFacelets(applyMoves(solvedState(), DEMO_SCRAMBLE)),
    source: "scramble",
    moves: DEMO_MOVES,
    stage_ends: stageEnds(DEMO.steps),
    steps_completed: 12,
    started_at: "2026-10-31T12:00:00Z",
    updated_at: "2026-10-31T12:05:00Z",
    completed_at: null,
    ...overrides,
  };
}

describe("lessonForSession", () => {
  it("continues an unfinished solve at the saved move", () => {
    const result = lessonForSession(row());
    expect(result?.resume).toEqual({ id: "11111111-2222-3333-4444-555555555555", stepsCompleted: 12 });
    expect(result?.source).toBe("scramble");
    // The demo's cube solves to the same moves as the demo itself.
    expect(result?.lesson.steps.map((s) => s.move)).toEqual(DEMO_MOVES);
    expect(result?.lesson.start).toBe(row().start_facelets);
  });

  it("starts over when the solve is finished", () => {
    const finished = lessonForSession(row({ steps_completed: DEMO_MOVES.length, completed_at: "2026-10-31T12:10:00Z" }));
    expect(finished?.resume).toBeUndefined();
    expect(finished?.lesson.steps).toHaveLength(DEMO_MOVES.length);
  });

  it("starts over when the solver now gives different moves", () => {
    const changed = lessonForSession(row({ moves: ["R", "U"], stage_ends: [1, 2, 2, 2] }));
    expect(changed?.resume).toBeUndefined();
    expect(changed?.lesson.steps.map((s) => s.move)).toEqual(DEMO_MOVES);
  });

  it("keeps the source, falling back to manual for unknown values", () => {
    expect(lessonForSession(row({ source: "scan" }))?.source).toBe("scan");
    expect(lessonForSession(row({ source: "other" }))?.source).toBe("manual");
  });

  it("gives null for a cube that can't be solved", () => {
    expect(lessonForSession(row({ start_facelets: "U".repeat(54) }))).toBeNull();
  });
});
