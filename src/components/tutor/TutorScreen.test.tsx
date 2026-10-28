import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createLesson } from "@/lib/tutor/lesson";
import { TutorScreen } from "./TutorScreen";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

afterEach(cleanup);

// Two stages, three moves: enough to cross a stage boundary and reach the end.
const LESSON = createLesson("R U' R'", [
  { stage: "fb", alg: "R" },
  { stage: "sb", alg: "U R'" },
]);

function setup() {
  render(<TutorScreen lesson={LESSON} />);
  return {
    next: () => act(() => fireEvent.click(screen.getByRole("button", { name: "Next move" }))),
    back: () => act(() => fireEvent.click(screen.getByRole("button", { name: "Back" }))),
    stages: () =>
      within(screen.getByRole("list", { name: "Roux stages" }))
        .getAllByRole("listitem")
        .map((li) => li.textContent),
    stickers: () => screen.getByRole("img", { name: /six faces/ }).innerHTML,
  };
}

describe("TutorScreen", () => {
  it("starts on the first move of the first stage", () => {
    const ui = setup();
    expect(screen.getByRole("heading", { name: "First Block" })).toBeDefined();
    expect(screen.getByText("Move 1 of 3")).toBeDefined();
    expect(screen.getByText("Next move:").parentElement?.textContent).toBe("Next move: R");
    expect(ui.stages()).toEqual(["FB (current)", "SB", "CMLL", "LSE"]);
    expect(screen.getByText(/1x2x3 block on the left/)).toBeDefined();
    expect((screen.getByRole("button", { name: "Back" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("steps forward through stages, updates the cube, and steps back", () => {
    const ui = setup();
    const start = ui.stickers();

    ui.next();
    expect(screen.getByText("Move 2 of 3")).toBeDefined();
    expect(screen.getByRole("heading", { name: "Second Block" })).toBeDefined();
    expect(ui.stages()).toEqual(["FB (done)", "SB (current)", "CMLL", "LSE"]);
    expect(ui.stickers()).not.toBe(start);
    const moves = within(screen.getByRole("list", { name: "Moves in this stage" })).getAllByRole("listitem");
    expect(moves.map((m) => m.textContent)).toEqual(["U", "R'"]);
    expect(moves[0].getAttribute("aria-current")).toBe("step");

    ui.back();
    expect(screen.getByText("Move 1 of 3")).toBeDefined();
    expect(ui.stickers()).toBe(start);
  });

  it("shows the solved state at the end and disables Next", () => {
    const ui = setup();
    ui.next();
    ui.next();
    ui.next();
    expect(screen.getByRole("heading", { name: "Solved" })).toBeDefined();
    expect(screen.getByText("All 3 moves played")).toBeDefined();
    expect(ui.stages()).toEqual(["FB (done)", "SB (done)", "CMLL (done)", "LSE (done)"]);
    expect((screen.getByRole("button", { name: "Next move" }) as HTMLButtonElement).disabled).toBe(true);
    // The scramble was undone, so every face shows one color.
    const faces = screen.getByRole("img", { name: /six faces/ }).querySelectorAll("[data-face]");
    expect(faces).toHaveLength(6);
    for (const face of faces) {
      const colors = new Set([...face.children].map((c) => (c as HTMLElement).style.backgroundColor));
      expect(colors.size).toBe(1);
    }
  });

  it("keeps the sheet open and non-modal: cube view visible, focus free, Escape and outside taps ignored", () => {
    const ui = setup();
    const cube = screen.getByRole("region", { name: "Cube" });
    expect(cube.closest("[aria-hidden='true'], [inert]")).toBeNull();
    expect(screen.getByRole("dialog", { name: "First Block" })).toBeDefined();

    const home = screen.getByRole("link", { name: "Roux Tutor" });
    act(() => home.focus());
    expect(document.activeElement).toBe(home);

    act(() => {
      fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" });
      fireEvent.pointerDown(cube);
      fireEvent.mouseDown(cube);
      fireEvent.click(cube);
    });
    ui.next();
    expect(screen.getByText("Move 2 of 3")).toBeDefined();
  });
});
