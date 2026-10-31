import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { applyMoves, solvedState, toFacelets } from "@/lib/cube/model";
import { EMPTY_DRAFT } from "@/lib/cube/validate";
import { FaceletEditor } from "./FaceletEditor";

const CUBE = toFacelets(applyMoves(solvedState(), "R U R' F2 D L'"));

let replaceState: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  replaceState = vi.spyOn(window.history, "replaceState");
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const panel = () => screen.getByRole("tabpanel");
const sticker = (name: RegExp) => within(panel()).getByRole("button", { name });
const tap = (el: HTMLElement) => act(() => fireEvent.click(el));
const pick = (color: string) => tap(screen.getByRole("radio", { name: new RegExp(`^${color},`) }));
const status = () => screen.getByRole("status").textContent;
const solveButton = () => screen.getByText("Solve this cube");

describe("FaceletEditor", () => {
  it("starts blank on the front face with only the centers set", () => {
    render(<FaceletEditor initial={EMPTY_DRAFT} />);
    expect(screen.getByRole("tab", { name: "Front face" }).getAttribute("aria-selected")).toBe("true");
    expect(panel().textContent).toContain("Hold the cube with green facing you and white on top.");
    expect(sticker(/^center: green \(fixed\)$/).hasAttribute("disabled")).toBe(true);
    expect(sticker(/^top left: no color$/)).toBeDefined();
    expect(status()).toBe("48 stickers left to color.");
    expect(screen.getByRole("radio", { name: "white, 8 left" })).toBeDefined();
    expect(solveButton().closest("button")?.hasAttribute("disabled")).toBe(true);
  });

  it("paints the tapped sticker with the chosen color", () => {
    render(<FaceletEditor initial={EMPTY_DRAFT} />);
    pick("red");
    expect(screen.getByRole("radio", { name: /^red,/ }).getAttribute("aria-checked")).toBe("true");
    tap(sticker(/^top left:/));
    expect(sticker(/^top left: red$/)).toBeDefined();
    expect(screen.getByRole("radio", { name: "red, 7 left" })).toBeDefined();
    expect(status()).toBe("47 stickers left to color.");
    // The address bar keeps the draft (sticker 18 = front face, top left).
    const url = replaceState.mock.calls.at(-1)?.[2] as string;
    expect(url).toBe(`/enter?cube=${EMPTY_DRAFT.slice(0, 18)}R${EMPTY_DRAFT.slice(19)}`);
  });

  it("doesn't touch the address bar until the user edits", () => {
    render(<FaceletEditor initial={CUBE} />);
    expect(replaceState).not.toHaveBeenCalled();
  });

  it("switches faces with the tabs, with the right hold hint and neighbors", () => {
    render(<FaceletEditor initial={EMPTY_DRAFT} />);
    tap(screen.getByRole("tab", { name: "Top face" }));
    expect(panel().textContent).toContain("Hold the cube with white facing you and blue on top.");
    expect(within(panel()).getByRole("img", { name: "blue side above" })).toBeDefined();
    expect(within(panel()).getByRole("img", { name: "green side below" })).toBeDefined();
    tap(screen.getByRole("tab", { name: "Bottom face" }));
    expect(panel().textContent).toContain("Hold the cube with yellow facing you and green on top.");
    tap(screen.getByRole("tab", { name: "Right face" }));
    expect(within(panel()).getByRole("img", { name: "blue side to the right" })).toBeDefined();
    expect(within(panel()).getByRole("img", { name: "green side to the left" })).toBeDefined();
  });

  it("points at an impossible piece as soon as it shows up", () => {
    render(<FaceletEditor initial={EMPTY_DRAFT} />);
    // Front face, top middle = the top front edge's front sticker; top face, bottom middle = its top sticker.
    pick("white");
    tap(sticker(/^top middle:/));
    tap(screen.getByRole("tab", { name: "Top face" }));
    pick("yellow");
    tap(sticker(/^bottom middle:/));
    expect(status()).toContain("The top front edge has yellow and white stickers");
    expect(sticker(/^bottom middle: yellow, has a problem$/)).toBeDefined();
    expect(screen.getByRole("tab", { name: "Front face, has a problem" })).toBeDefined();
    expect(screen.getByRole("tab", { name: "Left face" })).toBeDefined();
  });

  it("lets a complete, legal cube go to the tutor", () => {
    render(<FaceletEditor initial={CUBE} />);
    expect(status()).toBe("All stickers are in and this is a real cube. Ready to solve!");
    expect(screen.getByRole("link", { name: "Solve this cube" }).getAttribute("href")).toBe(`/tutor?cube=${CUBE}`);
  });

  it("keeps a scanned cube marked as a scan in its links", () => {
    render(<FaceletEditor initial={CUBE} source="scan" />);
    expect(screen.getByRole("link", { name: "Solve this cube" }).getAttribute("href")).toBe(`/tutor?cube=${CUBE}&from=scan`);
    pick("red");
    tap(sticker(/^top left:/));
    expect(replaceState.mock.calls.at(-1)?.[2]).toMatch(/^\/enter\?cube=[URFDLB.]{54}&from=scan$/);
  });

  it("says why a complete cube can't be solved", () => {
    // Flip the front-right edge (facelets 23 and 12).
    const chars = [...CUBE];
    [chars[23], chars[12]] = [chars[12], chars[23]];
    render(<FaceletEditor initial={chars.join("")} />);
    expect(status()).toContain("One edge is flipped");
    expect(solveButton().closest("button")?.hasAttribute("disabled")).toBe(true);
  });

  it("clears the current face but keeps its center", () => {
    render(<FaceletEditor initial={CUBE} />);
    tap(screen.getByRole("button", { name: "Clear face" }));
    expect(within(panel()).getAllByRole("button", { name: /no color/ })).toHaveLength(8);
    expect(sticker(/^center: green/)).toBeDefined();
    expect(status()).toBe("8 stickers left to color.");
    tap(screen.getByRole("tab", { name: "Back face" }));
    expect(within(panel()).queryAllByRole("button", { name: /no color/ })).toHaveLength(0);
  });
});
