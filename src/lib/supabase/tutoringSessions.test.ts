import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { SOLVED_FACELETS } from "@/lib/cube/model";
import {
  completeTutoringSession,
  listTutoringSessions,
  saveTutoringProgress,
  startTutoringSession,
} from "./tutoringSessions";

/** A fake query builder: records each chained call and resolves to `result`. */
function fakeClient(result: { data: unknown; error: unknown }) {
  const calls: [string, unknown[]][] = [];
  const builder: Record<string, unknown> = {};
  for (const method of ["insert", "update", "select", "eq", "order", "limit", "single"]) {
    builder[method] = (...args: unknown[]) => {
      calls.push([method, args]);
      return builder;
    };
  }
  builder.then = (resolve: (r: unknown) => unknown) => Promise.resolve(result).then(resolve);
  const from = vi.fn(() => builder);
  return { client: { from } as unknown as SupabaseClient<Database>, from, calls };
}

describe("tutoring sessions", () => {
  it("starts a session and returns its id", async () => {
    const { client, from, calls } = fakeClient({ data: { id: "abc" }, error: null });
    const id = await startTutoringSession(client, {
      startFacelets: SOLVED_FACELETS,
      source: "scramble",
      moves: ["R", "U'", "M2"],
    });
    expect(id).toBe("abc");
    expect(from).toHaveBeenCalledWith("tutoring_sessions");
    expect(calls[0]).toEqual([
      "insert",
      [{ start_facelets: SOLVED_FACELETS, source: "scramble", moves: ["R", "U'", "M2"] }],
    ]);
  });

  it("saves progress on the given row", async () => {
    const { client, calls } = fakeClient({ data: null, error: null });
    await saveTutoringProgress(client, "abc", 4);
    expect(calls).toEqual([
      ["update", [{ steps_completed: 4 }]],
      ["eq", ["id", "abc"]],
    ]);
  });

  it("marks a session complete with a timestamp", async () => {
    const { client, calls } = fakeClient({ data: null, error: null });
    await completeTutoringSession(client, "abc", 30);
    const update = calls[0][1][0] as { steps_completed: number; completed_at: string };
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

  it("throws database errors", async () => {
    const error = { message: "new row violates row-level security policy" };
    const { client } = fakeClient({ data: null, error });
    await expect(saveTutoringProgress(client, "abc", 1)).rejects.toBe(error);
  });
});
