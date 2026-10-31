import { describe, expect, it } from "vitest";
import { SOLVED_FACELETS } from "@/lib/cube/model";
import { fakeClient } from "./fakeClient";
import {
  deleteSavedScramble,
  isScrambleSaved,
  listSavedScrambles,
  saveScramble,
  unsaveScramble,
} from "./savedScrambles";

describe("saved scrambles", () => {
  it("saves a cube, ignoring one already saved", async () => {
    const { client, calls } = fakeClient({ data: null, error: null });
    await saveScramble(client, SOLVED_FACELETS, "scan");
    expect(calls).toEqual([
      ["from", ["saved_scrambles"]],
      ["upsert", [{ facelets: SOLVED_FACELETS, source: "scan" }, { onConflict: "user_id,facelets", ignoreDuplicates: true }]],
    ]);
  });

  it("removes a cube by facelets or by id", async () => {
    const byFacelets = fakeClient({ data: null, error: null });
    await unsaveScramble(byFacelets.client, SOLVED_FACELETS);
    expect(byFacelets.calls.slice(1)).toEqual([
      ["delete", []],
      ["eq", ["facelets", SOLVED_FACELETS]],
    ]);
    const byId = fakeClient({ data: null, error: null });
    await deleteSavedScramble(byId.client, "abc");
    expect(byId.calls.slice(1)).toEqual([
      ["delete", []],
      ["eq", ["id", "abc"]],
    ]);
  });

  it("tells whether a cube is saved", async () => {
    expect(await isScrambleSaved(fakeClient({ data: { id: "abc" }, error: null }).client, SOLVED_FACELETS)).toBe(true);
    expect(await isScrambleSaved(fakeClient({ data: null, error: null }).client, SOLVED_FACELETS)).toBe(false);
  });

  it("lists newest first", async () => {
    const rows = [{ id: "b" }, { id: "a" }];
    const { client, calls } = fakeClient({ data: rows, error: null });
    expect(await listSavedScrambles(client, 10)).toBe(rows);
    expect(calls).toContainEqual(["order", ["created_at", { ascending: false }]]);
    expect(calls).toContainEqual(["limit", [10]]);
  });

  it("throws database errors", async () => {
    const error = { message: "permission denied" };
    await expect(saveScramble(fakeClient({ data: null, error }).client, SOLVED_FACELETS, "manual")).rejects.toBe(error);
  });
});
