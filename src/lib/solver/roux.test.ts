import { describe, expect, it } from "vitest";
import { applyMoves, isSolved, solvedState, type CubeState } from "@/lib/cube/model";
import { formatAlgorithm, parseAlgorithm, type Move } from "@/lib/cube/notation";
import { DEMO_LESSON } from "@/lib/tutor/demoLesson";
import { createLesson } from "@/lib/tutor/lesson";
import { isCmllSolved, solveThroughCmll } from "./cmll";
import { isFirstBlockSolved } from "./firstBlock";
import { isLseSolved, solveLse } from "./lse";
import { solveRoux } from "./roux";
import { isSecondBlockSolved } from "./secondBlock";

// Face turns plus slice and wide turns, so many scrambles start with turned centers.
const SCRAMBLE_MOVES = parseAlgorithm("U U' U2 D D' D2 F F' F2 B B' B2 L L' L2 R R' R2 M M' M2 E E' S S' r u' f2");

/** Repeatable random-move scrambles (Park-Miller generator, fixed seed). */
function scrambles(count: number, length = 25): Move[][] {
  let seed = 9202611;
  const next = () => (seed = (seed * 48271) % 2147483647);
  return Array.from({ length: count }, () => {
    const moves: Move[] = [];
    while (moves.length < length) {
      const move = SCRAMBLE_MOVES[next() % SCRAMBLE_MOVES.length];
      if (moves.length > 0 && moves[moves.length - 1][0] === move[0]) continue;
      moves.push(move);
    }
    return moves;
  });
}

const scrambled = (alg: string | Move[]): CubeState => applyMoves(solvedState(), alg);
const STEP_IDS: Record<string, RegExp> = {
  fb: /^(orient|dl-edge|(front|back)-pair-(free|join|insert))$/,
  sb: /^(dr-edge|(front|back)-right-pair-(free|join|insert))$/,
  cmll: /^cmll(-pre-auf|-post-auf)?$/,
  lse: /^lse-(eo|ulur|ep)$/,
};
/** Blocks and top corners solved, maybe with the top layer turned (CMLL's last U turn may be left to LSE). */
const cornersDone = (s: CubeState) => ["", "U", "U2", "U'"].some((auf) => isCmllSolved(applyMoves(s, auf)));

describe("solveRoux", () => {
  it("solves 120 random scrambles (many with turned centers) through FB, SB, CMLL and LSE", () => {
    let centersTurnedAtLse = 0;
    let startsTurned = 0;
    let postAufLeftToLse = 0;
    for (const scramble of scrambles(120)) {
      const label = scramble.join(" ");
      const start = scrambled(scramble);
      if (start.center.some((c, i) => c !== i)) startsTurned++;
      const solution = solveRoux(start);
      expect(solution.stages.map((s) => s.stage), label).toEqual(["fb", "sb", "cmll", "lse"]);
      expect(solution.moves, label).toEqual(solution.stages.flatMap((s) => s.moves));

      let state = start;
      for (const stage of solution.stages) {
        expect(stage.moves, label).toEqual(stage.steps.flatMap((s) => s.moves));
        for (const step of stage.steps) {
          expect(step.id, label).toMatch(STEP_IDS[stage.stage]);
          expect(step.moves.length, label).toBeGreaterThan(0);
          expect(step.name.length > 0 && step.goal.length > 0, label).toBe(true);
        }
        if (stage.stage === "lse") {
          if (stage.steps[0] && stage.steps[0].centersOff !== 0) centersTurnedAtLse++;
          for (const move of stage.moves) expect(move, label).toMatch(/^[UM][2']?$/);
        }
        state = applyMoves(state, stage.moves);
        if (stage.stage === "fb") expect(isFirstBlockSolved(state), label).toBe(true);
        if (stage.stage === "sb") expect(isSecondBlockSolved(state), label).toBe(true);
        if (stage.stage === "cmll") expect(cornersDone(state), label).toBe(true);
      }
      expect(isLseSolved(state), label).toBe(true);
      expect(isSolved(state), label).toBe(true);
      // Applying the flat move list to the scrambled cube gives the same result.
      expect(isLseSolved(applyMoves(start, solution.moves)), label).toBe(true);

      // Leaving CMLL's last top-layer turn to LSE is never longer than keeping it.
      const kept = solveThroughCmll(start);
      const keptLse = solveLse(applyMoves(start, kept.moves), { previousMove: kept.moves.at(-1) });
      expect(solution.moves.length, label).toBeLessThanOrEqual(kept.moves.length + keptLse.moves.length);
      if (kept.cmll.steps.at(-1)?.id === "cmll-post-auf" && solution.stages[2].steps.at(-1)?.id !== "cmll-post-auf") {
        postAufLeftToLse++;
      }
    }
    expect(startsTurned).toBeGreaterThan(60);
    expect(centersTurnedAtLse).toBeGreaterThan(60);
    expect(postAufLeftToLse).toBeGreaterThan(30);
  }, 30_000);

  it("solves the demo lesson's scramble", () => {
    const start = scrambled(DEMO_LESSON.scramble);
    expect(isLseSolved(applyMoves(start, solveRoux(start).moves))).toBe(true);
  });

  it("does nothing on a solved cube and only turns the middle slice when that is all that's off", () => {
    expect(solveRoux(solvedState()).moves).toEqual([]);
    // M2 turns the centers too, so the solve starts by holding the cube the standard way.
    const solution = solveRoux(scrambled("M2"));
    expect(isLseSolved(applyMoves(scrambled("M2"), solution.moves))).toBe(true);
  });

  it("maps straight onto a tutor lesson", () => {
    const scramble = scrambles(1)[0];
    const solution = solveRoux(scrambled(scramble));
    const lesson = createLesson(
      formatAlgorithm(scramble),
      solution.stages.map((s) => ({ stage: s.stage, alg: formatAlgorithm(s.moves) })),
    );
    expect(lesson.steps.map((s) => s.move)).toEqual(solution.moves);
    expect(lesson.steps.map((s) => s.stage)).toEqual(solution.stages.flatMap((s) => s.moves.map(() => s.stage)));
  });
});
