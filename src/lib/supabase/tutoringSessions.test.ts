import { describe, expect, it } from "vitest";
import { SOLVED_FACELETS } from "@/lib/cube/model";
import { fakeClient } from "./fakeClient";
import {
  EMPTY_STATS,
  completeTutoringSession,
  getTutoringSession,
  getTutoringStats,
  listTutoringSessions,
  saveTutoringProgress,
  startTutoringSession,
} from "./tutoringSessions";

describe("tutoring sessions", () => {
  it("starts a session and returns its id", async () => {
    const { client, from, calls } = fakeClient({ data: { id: "abc" }, error: null });
    const id = await startTutoringSession(client, {
      startFacelets: SOLVED_FACELETS,
      source: "scramble",
      moves: ["R", "U'", "M2"],
      stageEnds: [1, 2, 2, 3],
    });
    expect(id).toBe("abc");
    expect(from).toHaveBeenCalledWith("tutoring_sessions");
    expect(calls[1]).toEqual([
      "insert",
      [{ start_facelets: SOLVED_FACELETS, source: "scramble", moves: ["R", "U'", "M2"], stage_ends: [1, 2, 2, 3] }],
    ]);
  });

  it("saves progress on the given row", async () => {
    const { client, calls } = fakeClient({ data: null, error: null });
    await saveTutoringProgress(client, "abc", 4);
    expect(calls).toEqual([
      ["from", ["tutoring_sessions"]],
      ["update", [{ steps_completed: 4 }]],
      ["eq", ["id", "abc"]],
    ]);
  });

  it("marks a session complete with a timestamp", async () => {
    const { client, calls } = fakeClient({ data: null, error: null });
    await completeTutoringSession(client, "abc", 30);
    const update = calls[1][1][0] as { steps_completed: number; completed_at: string };
    expect(update.steps_completed).toBe(30);
    expect(Number.isNaN(Date.parse(update.completed_at))).toBe(false);
  });

  it("lists newest sessions first", async () => {
    const rows = [{ id: "b" }, { id: "a" }];
    const { client, calls } = fakeClient({ data: rows, error: null });
    expect(await listTutoringSessions(client, 5)).toBe(rows);
    expect(calls).toContainEqual(["order", ["started_at", { ascending: false }]]);
    expect(calls).toContainEqual(["limit", [5]]);
  });

  it("reads one session by id", async () => {
    const id = "11111111-2222-3333-4444-555555555555";
    const { client, calls } = fakeClient({ data: { id }, error: null });
    expect(await getTutoringSession(client, id)).toEqual({ id });
    expect(calls).toContainEqual(["eq", ["id", id]]);
    expect(calls.at(-1)).toEqual(["maybeSingle", []]);
  });

  it("doesn't query for an id that isn't a uuid", async () => {
    const { client, from } = fakeClient({ data: null, error: null });
    expect(await getTutoringSession(client, "nope")).toBeNull();
    expect(from).not.toHaveBeenCalled();
  });

  it("reads the stats view", async () => {
    const { client, calls } = fakeClient({
      data: {
        user_id: "u",
        solves_started: 5,
        solves_finished: 2,
        staged_solves: 4,
        fb_done: 4,
        sb_done: 3,
        cmll_done: 2,
        lse_done: 2,
        moves_stepped: 120,
        last_active_at: "2026-10-31T12:00:00Z",
      },
      error: null,
    });
    expect(await getTutoringStats(client)).toEqual({
      solvesStarted: 5,
      solvesFinished: 2,
      stagedSolves: 4,
      stagesDone: [4, 3, 2, 2],
      movesStepped: 120,
      lastActiveAt: "2026-10-31T12:00:00Z",
    });
    expect(calls[0]).toEqual(["from", ["tutoring_stats"]]);
    expect(calls.at(-1)).toEqual(["maybeSingle", []]);
  });

  it("returns zeros before the first session", async () => {
    const { client } = fakeClient({ data: null, error: null });
    expect(await getTutoringStats(client)).toBe(EMPTY_STATS);
  });

  it("throws database errors", async () => {
    const error = { message: "new row violates row-level security policy" };
    const { client } = fakeClient({ data: null, error });
    await expect(saveTutoringProgress(client, "abc", 1)).rejects.toBe(error);
  });
});
