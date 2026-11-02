import Cube from "cubejs";
import { describe, expect, it } from "vitest";
import { applyMoves, fromFacelets, solvedState, toFacelets } from "@/lib/cube/model";
import { DEMO_HELD_SCRAMBLE, DEMO_SCRAMBLE } from "./demoLesson";
import { HOLD, holdColors, holdRotation, solverView } from "./hold";
import { rouxLessonFromState, rouxLesson } from "./rouxLesson";

const COLOR_LETTER = { white: "U", red: "R", green: "F", yellow: "D", orange: "L", blue: "B" } as const;

/** The solved cube, held the tutor's way. */
const HELD_SOLVED = toFacelets(applyMoves(solvedState(), "x2 y"));

function centers(facelets: string) {
  return [4, 13, 22, 31, 40, 49].map((i) => facelets[i]).join("");
}

describe("hold", () => {
  it("is red in front and white on the bottom", () => {
    expect(HOLD.F).toBe("red");
    expect(HOLD.D).toBe("white");
    expect(centers(HELD_SOLVED)).toBe(["U", "R", "F", "D", "L", "B"].map((f) => COLOR_LETTER[HOLD[f as keyof typeof HOLD]]).join(""));
  });

  it("turns a cube entered white on top and green in front with x2 y", () => {
    expect(holdRotation(solvedState())).toEqual(["x2", "y"]);
  });

  it("finds the rotation for cubes whose centers have moved", () => {
    for (const alg of ["M", "x", "y' z", "E S'", "r u' f2", "x2 y"]) {
      const start = applyMoves(solvedState(), alg);
      expect(centers(toFacelets(applyMoves(start, holdRotation(start)))), alg).toBe(centers(HELD_SOLVED));
    }
  });

  it("relabels the held cube into the solver's frame", () => {
    expect(toFacelets(solverView(applyMoves(solvedState(), "x2 y")))).toBe(toFacelets(solvedState()));
    // The demo scrambles are the same cube: one as entered, one as held.
    const held = applyMoves(solvedState(), [...DEMO_SCRAMBLE.split(" "), "x2", "y"].join(" "));
    expect(toFacelets(solverView(held))).toBe(toFacelets(applyMoves(solvedState(), DEMO_HELD_SCRAMBLE)));
  });

  it("translates color names to the held cube", () => {
    expect(holdColors("the yellow-orange edge next to the orange center")).toBe("the white-blue edge next to the blue center");
    expect(holdColors("White top, green front, red right, Blue back.")).toBe("Yellow top, red front, green right, Orange back.");
    expect(holdColors("centered and covered")).toBe("centered and covered");
  });
});

describe("held lessons", () => {
  it("solve random cubes to the solved cube, still held the tutor's way", () => {
    for (let i = 0; i < 20; i++) {
      const start = fromFacelets(Cube.random().asString());
      const lesson = rouxLessonFromState(start);
      expect(lesson.hold).toEqual(["x2", "y"]);
      const end = applyMoves(applyMoves(start, lesson.hold!), lesson.steps.map((s) => s.move));
      expect(toFacelets(end)).toBe(HELD_SOLVED);
    }
  });

  it("solve scrambles with slice turns and rotations", () => {
    for (const alg of ["M U2 r' x F", "y R U' E2 l", "z' S f2 D M'"]) {
      const lesson = rouxLesson(alg);
      const start = applyMoves(solvedState(), alg);
      const end = applyMoves(applyMoves(start, lesson.hold!), lesson.steps.map((s) => s.move));
      expect(toFacelets(end), alg).toBe(HELD_SOLVED);
      // Already held the tutor's way, so the solve starts without a rotation.
      expect(lesson.phases?.[0].id).not.toBe("orient");
    }
  });

  it("name the held colors: the first block is blue and white", () => {
    const lesson = rouxLesson(DEMO_SCRAMBLE);
    const dlEdge = lesson.phases!.find((p) => p.id === "dl-edge")!;
    expect(dlEdge.goal).toContain("white-blue edge");
    const text = [...lesson.phases!.flatMap((p) => [p.name, p.goal]), ...lesson.steps.map((s) => s.explanation)].join(" ");
    expect(text).toContain("blue against the blue center");
    expect(text).toContain("white on the bottom like the left block");
    expect(text).not.toMatch(/orange center|yellow bottom/);
  });
});
