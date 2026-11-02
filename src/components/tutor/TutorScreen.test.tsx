import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { STICKER_HEX } from "@/lib/cube/model";
import { demoLesson } from "@/lib/tutor/demoLesson";
import { createLesson, type Lesson } from "@/lib/tutor/lesson";
import { TutorScreen } from "./TutorScreen";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

// jsdom has no WebGL, so the cube view shows the flat net (CubeView's fallback),
// which these tests read stickers from. Stubbing getContext skips jsdom's
// "not implemented" warning.
beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

// Two stages, three moves: enough to cross a stage boundary and reach the end.
const LESSON = createLesson("R U' R'", [
  { stage: "fb", alg: "R" },
  { stage: "sb", alg: "U R'" },
]);

// The same three moves split into solver steps, each move explained.
const EXPLAINED: Lesson = {
  ...LESSON,
  phases: [
    { id: "dl-edge", stage: "fb", name: "Bottom-left edge", goal: "Put the yellow-orange edge in the bottom-left slot." },
    { id: "dr-edge", stage: "sb", name: "Bottom-right edge", goal: "Put the yellow-red edge in the bottom-right slot." },
  ],
  steps: [
    { move: "R", stage: "fb", phase: 0, explanation: "R explains the first move." },
    { move: "U", stage: "sb", phase: 1, explanation: "U explains the second move." },
    { move: "R'", stage: "sb", phase: 1, explanation: "R' explains the third move." },
  ],
};

function setup(lesson: Lesson = LESSON) {
  render(<TutorScreen lesson={lesson} />);
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

  it("shows the current move's explanation, its step's name and goal, and updates them on Next and Back", () => {
    const ui = setup(EXPLAINED);
    expect(screen.getByText("R explains the first move.")).toBeDefined();
    expect(screen.getByText("Bottom-left edge")).toBeDefined();
    expect(screen.queryByText(/1x2x3 block on the left/)).toBeNull();
    // The step's goal opens from "About this step" and closes again when the next step starts.
    const goal = () => screen.getByText("Put the yellow-orange edge in the bottom-left slot.");
    expect(goal().hidden).toBe(true);
    act(() => fireEvent.click(screen.getByRole("button", { name: "About this step" })));
    expect(goal().hidden).toBe(false);
    expect(screen.getByRole("button", { name: "Hide step goal" }).getAttribute("aria-expanded")).toBe("true");
    // The dialog's description is the explanation, for screen readers.
    const describedBy = screen.getByRole("dialog").getAttribute("aria-describedby");
    expect(document.getElementById(describedBy ?? "")?.textContent).toBe("R explains the first move.");

    ui.next();
    expect(screen.getByText("U explains the second move.")).toBeDefined();
    expect(screen.getByText("Put the yellow-red edge in the bottom-right slot.").hidden).toBe(true);
    expect(screen.queryByText("R explains the first move.")).toBeNull();
    expect(screen.getByText("Bottom-right edge")).toBeDefined();
    const moves = within(screen.getByRole("list", { name: "Moves in this step" })).getAllByRole("listitem");
    expect(moves.map((m) => m.textContent)).toEqual(["U", "R'"]);

    ui.next();
    expect(screen.getByText("R' explains the third move.")).toBeDefined();
    ui.back();
    ui.back();
    expect(screen.getByText("R explains the first move.")).toBeDefined();
    expect(within(screen.getByRole("list", { name: "Moves in this step" })).getAllByRole("listitem")).toHaveLength(1);
  });

  it("plays the solver's demo lesson, explaining every move, to a solved cube", () => {
    const lesson = demoLesson();
    const ui = setup(lesson);
    expect(screen.getByText(`Move 1 of ${lesson.steps.length}`)).toBeDefined();
    lesson.steps.forEach((step, i) => {
      expect(screen.getByText(step.explanation!), `move ${i + 1}`).toBeDefined();
      expect(screen.getByText(lesson.phases![step.phase!].name), `move ${i + 1}`).toBeDefined();
      ui.next();
    });
    expect(screen.getByRole("heading", { name: "Solved" })).toBeDefined();
    for (const face of screen.getByRole("img", { name: /six faces/ }).querySelectorAll("[data-face]")) {
      expect(new Set([...face.children].map((c) => (c as HTMLElement).style.backgroundColor)).size).toBe(1);
    }
  });

  it("holds the solver's cube red in front and white on the bottom, and says so", () => {
    setup(demoLesson());
    expect(screen.getByText("Hold the cube: Red in front, white on the bottom.")).toBeDefined();
    const net = screen.getByRole("img", { name: /six faces/ });
    const center = (face: string) =>
      (net.querySelector(`[data-face="${face}"]`)!.children[4] as HTMLElement).style.backgroundColor;
    const hex = (h: string) => {
      const div = document.createElement("div");
      div.style.backgroundColor = h;
      return div.style.backgroundColor;
    };
    expect(center("F")).toBe(hex(STICKER_HEX.red));
    expect(center("D")).toBe(hex(STICKER_HEX.white));
    expect(center("L")).toBe(hex(STICKER_HEX.blue));
    expect(center("U")).toBe(hex(STICKER_HEX.yellow));
  });

  it("shows no hint for lessons that don't hold the cube", () => {
    setup();
    expect(screen.queryByText(/Hold the cube/)).toBeNull();
  });
});
