import { describe, expect, it } from "vitest";
import { applyMoves, faceletPosition, isSolved, solvedState, toFacelets, type Face } from "@/lib/cube/model";
import { DEMO_LESSON } from "./demoLesson";
import { ROUX_STAGES, type RouxStageId } from "./lesson";

type Where = (face: Face, row: number, col: number) => boolean;

// Facelet groups, using the viewing notes in model.ts. Rows 1-2 of a side
// face are the bottom two layers; L's column 2 and R's column 0 touch F.
const FIRST_BLOCK: Where = (f, r, c) =>
  (f === "L" && r > 0) ||
  (f === "F" && r > 0 && c === 0) ||
  (f === "B" && r > 0 && c === 2) ||
  (f === "D" && c === 0);
const SECOND_BLOCK: Where = (f, r, c) =>
  (f === "R" && r > 0) ||
  (f === "F" && r > 0 && c === 2) ||
  (f === "B" && r > 0 && c === 0) ||
  (f === "D" && c === 2);
const TOP_CORNERS: Where = (f, r, c) => c !== 1 && (f === "U" ? r !== 1 : f !== "D" && r === 0);
const EVERYTHING: Where = () => true;

/** True when every facelet picked by `where` shows its solved color. */
function solvedAt(facelets: string, where: Where): boolean {
  return [...facelets].every((letter, i) => {
    const { face, row, col } = faceletPosition(i);
    return !where(face, row, col) || letter === face;
  });
}

function stateAfter(stage: RouxStageId | null) {
  const last = stage ? DEMO_LESSON.steps.findLastIndex((s) => s.stage === stage) : -1;
  const moves = DEMO_LESSON.steps.slice(0, last + 1).map((s) => s.move);
  return toFacelets(applyMoves(applyMoves(solvedState(), DEMO_LESSON.scramble), moves));
}

describe("facelet groups", () => {
  it("pick the right stickers", () => {
    const afterR = toFacelets(applyMoves(solvedState(), "R"));
    expect(solvedAt(afterR, FIRST_BLOCK)).toBe(true);
    expect(solvedAt(afterR, SECOND_BLOCK)).toBe(false);
    const afterL = toFacelets(applyMoves(solvedState(), "L"));
    expect(solvedAt(afterL, FIRST_BLOCK)).toBe(false);
    expect(solvedAt(afterL, SECOND_BLOCK)).toBe(true);
    const afterM = toFacelets(applyMoves(solvedState(), "M U"));
    expect(solvedAt(afterM, FIRST_BLOCK) && solvedAt(afterM, SECOND_BLOCK)).toBe(true);
    expect(solvedAt(toFacelets(applyMoves(solvedState(), "M")), TOP_CORNERS)).toBe(true);
    expect(solvedAt(toFacelets(applyMoves(solvedState(), "U")), TOP_CORNERS)).toBe(false);
  });
});

describe("demo lesson", () => {
  it("covers the four Roux stages in order", () => {
    const order = [...new Set(DEMO_LESSON.steps.map((s) => s.stage))];
    expect(order).toEqual(ROUX_STAGES.map((s) => s.id));
  });

  it("starts scrambled with white on top and green in front", () => {
    const start = stateAfter(null);
    expect(start).not.toBe(toFacelets(solvedState()));
    expect(solvedAt(start, FIRST_BLOCK)).toBe(false);
    expect([4, 13, 22, 31, 40, 49].map((i) => start[i]).join("")).toBe("URFDLB");
  });

  it("completes each stage's pieces when that stage ends", () => {
    const fb = stateAfter("fb");
    expect(solvedAt(fb, FIRST_BLOCK)).toBe(true);
    expect(solvedAt(fb, SECOND_BLOCK)).toBe(false);

    const sb = stateAfter("sb");
    expect(solvedAt(sb, FIRST_BLOCK) && solvedAt(sb, SECOND_BLOCK)).toBe(true);
    expect(solvedAt(sb, TOP_CORNERS)).toBe(false);

    const cmll = stateAfter("cmll");
    expect(solvedAt(cmll, FIRST_BLOCK) && solvedAt(cmll, SECOND_BLOCK)).toBe(true);
    expect(solvedAt(cmll, TOP_CORNERS)).toBe(true);
    expect(solvedAt(cmll, EVERYTHING)).toBe(false);

    expect(isSolved(applyMoves(applyMoves(solvedState(), DEMO_LESSON.scramble), DEMO_LESSON.steps.map((s) => s.move)))).toBe(true);
  });

  it("builds the second block with only R, r, U and M, and LSE with only U and M", () => {
    const bases = (stage: RouxStageId) =>
      new Set(DEMO_LESSON.steps.filter((s) => s.stage === stage).map((s) => s.move[0]));
    expect([...bases("sb")].every((b) => "RrUM".includes(b))).toBe(true);
    expect([...bases("lse")].every((b) => "UM".includes(b))).toBe(true);
  });
});
