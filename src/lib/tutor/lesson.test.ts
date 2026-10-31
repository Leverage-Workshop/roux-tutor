import { describe, expect, it } from "vitest";
import { createLesson, stageEnds, stageInProgress } from "./lesson";

describe("stageEnds", () => {
  it("counts moves up to the end of each stage", () => {
    const lesson = createLesson("", [
      { stage: "fb", alg: "R U" },
      { stage: "sb", alg: "R'" },
      { stage: "cmll", alg: "" },
      { stage: "lse", alg: "M U M'" },
    ]);
    expect(stageEnds(lesson.steps)).toEqual([2, 3, 3, 6]);
  });

  it("is all zeros for an empty solve", () => {
    expect(stageEnds([])).toEqual([0, 0, 0, 0]);
  });
});

describe("stageInProgress", () => {
  const ends = [2, 3, 3, 6];
  it("names the first stage not yet finished", () => {
    expect(stageInProgress(ends, 0)?.id).toBe("fb");
    expect(stageInProgress(ends, 2)?.id).toBe("sb");
    // CMLL has no moves here, so finishing SB moves straight on to LSE.
    expect(stageInProgress(ends, 3)?.id).toBe("lse");
    expect(stageInProgress(ends, 6)).toBeNull();
  });
});
