import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SOLVED_FACELETS } from "@/lib/cube/model";
import { EMPTY_STATS, type TutoringSession, type TutoringStats } from "@/lib/supabase/tutoringSessions";
import type { SavedScramble } from "@/lib/supabase/savedScrambles";
import { ProgressView, sessionStatus } from "./ProgressView";

const deleteCall = vi.fn();
const client = {
  from: (table: string) => ({
    delete: () => ({
      eq: async (column: string, value: string) => {
        deleteCall(table, column, value);
        return { error: null };
      },
    }),
  }),
};
vi.mock("@/lib/supabase/client", () => ({ createClient: () => client }));

afterEach(cleanup);

const STATS: TutoringStats = {
  solvesStarted: 4,
  solvesFinished: 1,
  stagedSolves: 4,
  stagesDone: [3, 2, 1, 1],
  movesStepped: 87,
  lastActiveAt: "2026-10-31T12:00:00Z",
};

function session(overrides: Partial<TutoringSession>): TutoringSession {
  return {
    id: "s",
    user_id: "u",
    start_facelets: SOLVED_FACELETS,
    source: "scramble",
    moves: Array(40).fill("R"),
    stage_ends: [10, 22, 30, 40],
    steps_completed: 0,
    started_at: "2026-10-30T12:00:00Z",
    updated_at: "2026-10-30T12:00:00Z",
    completed_at: null,
    ...overrides,
  };
}

const SAVED: SavedScramble[] = [
  { id: "c1", user_id: "u", facelets: SOLVED_FACELETS, source: "scan", created_at: "2026-10-29T12:00:00Z" },
  { id: "c2", user_id: "u", facelets: SOLVED_FACELETS, source: "manual", created_at: "2026-10-28T12:00:00Z" },
];

describe("ProgressView", () => {
  it("shows totals and how many solves got through each stage", () => {
    render(<ProgressView stats={STATS} savedCubes={[]} sessions={[]} />);
    expect(screen.getByText("Solves started").nextSibling?.textContent).toBe("4");
    expect(screen.getByText("Solves finished").nextSibling?.textContent).toBe("1");
    expect(screen.getByText("87 moves stepped through in total.")).toBeDefined();
    const bars = screen.getAllByRole("progressbar");
    expect(bars.map((b) => [b.getAttribute("aria-label"), b.getAttribute("aria-valuenow")])).toEqual([
      ["First Block finished", "3"],
      ["Second Block finished", "2"],
      ["CMLL finished", "1"],
      ["Last Six Edges finished", "1"],
    ]);
    expect(screen.getByText("3 of 4 solves")).toBeDefined();
  });

  it("explains the empty states", () => {
    render(<ProgressView stats={EMPTY_STATS} savedCubes={[]} sessions={[]} />);
    expect(screen.queryByRole("progressbar")).toBeNull();
    expect(screen.getByText(/No saved cubes yet/)).toBeDefined();
    expect(screen.getByRole("link", { name: "Try the demo solve" }).getAttribute("href")).toBe("/tutor");
  });

  it("lists recent solves with where they got to and a link to solve again", () => {
    render(
      <ProgressView
        stats={STATS}
        savedCubes={[]}
        sessions={[
          session({ id: "a", steps_completed: 12, source: "scan" }),
          session({ id: "b", steps_completed: 40, completed_at: "2026-10-30T12:10:00Z" }),
        ]}
      />,
    );
    const rows = within(screen.getByRole("heading", { name: "Recent solves" }).parentElement!).getAllByRole("listitem");
    expect(rows[0].textContent).toMatch(/^Working on Second Block12 of 40 moves · Scanned · Oct 30, 2026Solve again$/);
    expect(within(rows[0]).getByRole("link").getAttribute("href")).toBe(`/tutor?cube=${SOLVED_FACELETS}&from=scan`);
    expect(rows[1].textContent).toContain("Finished40 of 40 moves · Demo scramble");
    expect(within(rows[1]).getByRole("link").getAttribute("href")).toBe(`/tutor?cube=${SOLVED_FACELETS}`);
  });

  it("lists saved cubes and removes one", async () => {
    render(<ProgressView stats={STATS} savedCubes={SAVED} sessions={[]} />);
    expect(screen.getByText(/Scanned · saved/)).toBeDefined();
    expect(screen.getAllByRole("link", { name: "Solve" })[0].getAttribute("href")).toBe(
      `/tutor?cube=${SOLVED_FACELETS}&from=scan`,
    );
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Remove cube 1" }));
    });
    expect(deleteCall).toHaveBeenCalledWith("saved_scrambles", "id", "c1");
    expect(screen.queryByText(/Scanned · saved/)).toBeNull();
    expect(screen.getByText(/Entered by hand · saved/)).toBeDefined();
  });
});

describe("sessionStatus", () => {
  it("names the stage being worked on", () => {
    expect(sessionStatus(session({ steps_completed: 0 }))).toBe("Working on First Block");
    expect(sessionStatus(session({ steps_completed: 30 }))).toBe("Working on Last Six Edges");
    expect(sessionStatus(session({ completed_at: "2026-10-30T12:10:00Z" }))).toBe("Finished");
    expect(sessionStatus(session({ stage_ends: [] }))).toBe("Not finished");
  });
});
