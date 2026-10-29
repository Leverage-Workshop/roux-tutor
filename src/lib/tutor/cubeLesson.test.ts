import { describe, expect, it } from "vitest";
import { applyMoves, isSolved, solvedState, toFacelets, fromFacelets } from "@/lib/cube/model";
import { EMPTY_DRAFT } from "@/lib/cube/validate";
import { DEMO_SCRAMBLE, demoLesson } from "./demoLesson";
import { lessonForCube } from "./cubeLesson";

const CUBE = toFacelets(applyMoves(solvedState(), DEMO_SCRAMBLE));

describe("lessonForCube", () => {
  it("plays the demo without a cube", () => {
    expect(lessonForCube(undefined)).toEqual({ lesson: demoLesson() });
  });

  it("solves an entered cube from its facelets", () => {
    const result = lessonForCube(CUBE);
    if (!("lesson" in result)) throw new Error(result.error);
    const { lesson } = result;
    expect(lesson.start).toBe(CUBE);
    expect(lesson.scramble).toEqual([]);
    // Same cube as the demo, so the same solve.
    expect(lesson.steps).toEqual(demoLesson().steps);
    const end = applyMoves(fromFacelets(CUBE), lesson.steps.map((s) => s.move));
    expect(isSolved(end)).toBe(true);
  });

  it("explains why a cube can't be solved and links back to the editor", () => {
    const flipped = CUBE.slice(0, 7) + CUBE[19] + CUBE.slice(8, 19) + CUBE[7] + CUBE.slice(20); // UF edge flipped
    expect(lessonForCube(flipped)).toEqual({
      error: expect.stringContaining("One edge is flipped"),
      editHref: `/enter?cube=${flipped}`,
    });
    expect(lessonForCube(EMPTY_DRAFT)).toEqual({
      error: "Some stickers have no color yet.",
      editHref: `/enter?cube=${EMPTY_DRAFT}`,
    });
  });

  it("rejects values that aren't a cube", () => {
    for (const cube of ["nonsense", [CUBE, CUBE], CUBE.toLowerCase()]) {
      expect(lessonForCube(cube)).toEqual({ error: "The link doesn't describe a cube.", editHref: "/enter" });
    }
  });
});
