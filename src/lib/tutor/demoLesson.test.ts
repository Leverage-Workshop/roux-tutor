import { describe, expect, it } from "vitest";
import { applyMoves, faceletPosition, isSolved, solvedState, toFacelets, type Face } from "@/lib/cube/model";
import { parseAlgorithm } from "@/lib/cube/notation";
import { solveRoux } from "@/lib/solver/roux";
import { DEMO_SCRAMBLE, demoLesson } from "./demoLesson";
import { ROUX_STAGES, type RouxStageId } from "./lesson";

const DEMO_LESSON = demoLesson();

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

/** Facelets after the given stage (then `extra` moves, e.g. a top-layer turn). */
function stateAfter(stage: RouxStageId | null, extra = "") {
  const last = stage ? DEMO_LESSON.steps.findLastIndex((s) => s.stage === stage) : -1;
  const moves = DEMO_LESSON.steps.slice(0, last + 1).map((s) => s.move);
  return toFacelets(applyMoves(applyMoves(applyMoves(solvedState(), DEMO_LESSON.scramble), moves), extra));
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
    // The solve may leave CMLL's last top-layer turn to LSE: corners solved, maybe turned.
    expect(["", "U", "U2", "U'"].some((auf) => solvedAt(stateAfter("cmll", auf), TOP_CORNERS))).toBe(true);
    expect(solvedAt(cmll, EVERYTHING)).toBe(false);

    expect(isSolved(applyMoves(applyMoves(solvedState(), DEMO_LESSON.scramble), DEMO_LESSON.steps.map((s) => s.move)))).toBe(true);
  });

  it("is the Roux solver's solve of the demo scramble, with every move explained", () => {
    expect(DEMO_LESSON.scramble).toEqual(parseAlgorithm(DEMO_SCRAMBLE));
    const solution = solveRoux(applyMoves(solvedState(), DEMO_SCRAMBLE));
    expect(DEMO_LESSON.steps.map((s) => s.move)).toEqual(solution.moves);
    expect(DEMO_LESSON.phases?.map((p) => p.id)).toEqual(solution.stages.flatMap((s) => s.steps.map((step) => step.id)));
    for (const step of DEMO_LESSON.steps) {
      const phase = DEMO_LESSON.phases![step.phase!];
      expect(phase.stage).toBe(step.stage);
      expect(phase.name.length > 0 && phase.goal.length > 0).toBe(true);
      expect(step.explanation?.startsWith(step.move)).toBe(true);
    }
    // Phases are consecutive runs of moves, in order.
    const order = DEMO_LESSON.steps.map((s) => s.phase!);
    expect(order).toEqual([...order].sort((a, b) => a - b));
    expect(new Set(order).size).toBe(DEMO_LESSON.phases!.length);
  });

  it("shows most kinds of step: pairs freed, joined and inserted, a CMLL case with a pre-turn, and all three LSE steps", () => {
    const ids = new Set(DEMO_LESSON.phases!.map((p) => p.id));
    for (const id of ["dl-edge", "back-pair-free", "front-pair-join", "front-pair-insert", "dr-edge", "front-right-pair-free"]) {
      expect(ids.has(id), id).toBe(true);
    }
    for (const id of ["cmll-pre-auf", "cmll", "lse-eo", "lse-ulur", "lse-ep"]) expect(ids.has(id), id).toBe(true);
  });

  it("builds the second block with only R, r, U and M, and LSE with only U and M", () => {
    const bases = (stage: RouxStageId) =>
      new Set(DEMO_LESSON.steps.filter((s) => s.stage === stage).map((s) => s.move[0]));
    expect([...bases("sb")].every((b) => "RrUM".includes(b))).toBe(true);
    expect([...bases("lse")].every((b) => "UM".includes(b))).toBe(true);
  });
});
