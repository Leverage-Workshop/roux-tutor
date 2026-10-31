// Saving on the tutor screen for a signed-in user: the solve is recorded as a
// tutoring session, and the bookmark saves the cube.
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { applyMoves, solvedState, toFacelets } from "@/lib/cube/model";
import { createLesson } from "@/lib/tutor/lesson";
import { TutorScreen } from "./TutorScreen";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

type Call = [table: string, method: string, ...args: unknown[]];
let calls: Call[] = [];
let alreadySaved = false;
let signedIn = true;

function builder(table: string) {
  const b: Record<string, unknown> = {};
  let result: { data: unknown; error: null } = { data: null, error: null };
  for (const method of ["insert", "upsert", "update", "delete", "select", "eq", "single", "maybeSingle"]) {
    b[method] = (...args: unknown[]) => {
      calls.push([table, method, ...args]);
      if (method === "single") result = { data: { id: "session-1" }, error: null };
      if (method === "maybeSingle") result = { data: alreadySaved ? { id: "c1" } : null, error: null };
      return b;
    };
  }
  b.then = (resolve: (r: unknown) => unknown) => Promise.resolve(result).then(resolve);
  return b;
}

const client = {
  auth: {
    onAuthStateChange: (cb: (event: string, session: unknown) => void) => {
      queueMicrotask(() => cb("INITIAL_SESSION", signedIn ? { user: { id: "u1", email: "a@example.com", user_metadata: {} } } : null));
      return { data: { subscription: { unsubscribe: () => {} } } };
    },
  },
  from: (table: string) => builder(table),
};
vi.mock("@/lib/supabase/client", () => ({ createClient: () => client }));

beforeEach(() => {
  calls = [];
  alreadySaved = false;
  signedIn = true;
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

// Three moves over two stages.
const LESSON = createLesson("R U' R'", [
  { stage: "fb", alg: "R" },
  { stage: "sb", alg: "U R'" },
]);
const START = toFacelets(applyMoves(solvedState(), "R U' R'"));

async function settle() {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
}

const next = () => act(() => fireEvent.click(screen.getByRole("button", { name: "Next move" })));

describe("TutorScreen saving", () => {
  it("records nothing until the first move, then the whole solve", async () => {
    render(<TutorScreen lesson={LESSON} />);
    await settle();
    expect(calls.filter(([t]) => t === "tutoring_sessions")).toEqual([]);

    next();
    await settle();
    expect(calls).toContainEqual([
      "tutoring_sessions",
      "insert",
      { start_facelets: START, source: "scramble", moves: ["R", "U", "R'"], stage_ends: [1, 3, 3, 3] },
    ]);

    next();
    next();
    await settle();
    const update = calls.find(([t, m]) => t === "tutoring_sessions" && m === "update");
    expect(update?.[2]).toMatchObject({ steps_completed: 3, completed_at: expect.any(String) });
    expect(calls).toContainEqual(["tutoring_sessions", "eq", "id", "session-1"]);
  });

  it("saves the progress so far when the page is hidden", async () => {
    render(<TutorScreen lesson={LESSON} />);
    await settle();
    next();
    next();
    await settle();
    act(() => {
      window.dispatchEvent(new Event("pagehide"));
    });
    await settle();
    const update = calls.find(([t, m]) => t === "tutoring_sessions" && m === "update");
    expect(update?.[2]).toEqual({ steps_completed: 2 });
  });

  it("marks a scanned cube's session as a scan", async () => {
    const entered = { ...LESSON, start: START };
    render(<TutorScreen lesson={entered} source="scan" />);
    await settle();
    next();
    await settle();
    const insert = calls.find(([t, m]) => t === "tutoring_sessions" && m === "insert");
    expect(insert?.[2]).toMatchObject({ source: "scan", start_facelets: START });
    expect(screen.getByRole("link", { name: "Edit cube" }).getAttribute("href")).toBe(`/enter?cube=${START}&from=scan`);
  });

  it("saves and unsaves the cube with the bookmark", async () => {
    render(<TutorScreen lesson={LESSON} />);
    await settle();
    const bookmark = screen.getByRole("button", { name: "Save this cube" });
    expect(bookmark.getAttribute("aria-pressed")).toBe("false");
    await act(async () => {
      fireEvent.click(bookmark);
    });
    expect(calls).toContainEqual([
      "saved_scrambles",
      "upsert",
      { facelets: START, source: "scramble" },
      { onConflict: "user_id,facelets", ignoreDuplicates: true },
    ]);
    expect(bookmark.getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("status").textContent).toBe("Saved to your cubes");
    await act(async () => {
      fireEvent.click(bookmark);
    });
    expect(calls).toContainEqual(["saved_scrambles", "eq", "facelets", START]);
    expect(bookmark.getAttribute("aria-pressed")).toBe("false");
  });

  it("shows a cube that is already saved as saved", async () => {
    alreadySaved = true;
    render(<TutorScreen lesson={LESSON} />);
    await settle();
    expect(screen.getByRole("button", { name: "Save this cube" }).getAttribute("aria-pressed")).toBe("true");
  });

  it("saves nothing and hides the bookmark when signed out", async () => {
    signedIn = false;
    render(<TutorScreen lesson={LESSON} />);
    await settle();
    next();
    next();
    next();
    await settle();
    expect(calls).toEqual([]);
    expect(screen.queryByRole("button", { name: "Save this cube" })).toBeNull();
    expect(screen.getByRole("button", { name: "Sign in with Google" })).toBeDefined();
  });
});
