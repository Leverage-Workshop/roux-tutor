// The lesson /tutor shows until the scanner (feat-011) hands over a real cube:
// a fixed random-move scramble solved by the Roux solver, so the page is the
// same on every build and in tests. This scramble's solve touches most kinds
// of step: free / join / insert pairs, a CMLL case with a pre-turn (Anti-Sune),
// and all three LSE steps (arrow edge orientation).
//
// Only server code imports this (the /tutor page builds the lesson while it
// is prerendered), so the solver stays out of the browser bundle.
import type { Lesson } from "./lesson";
import { rouxLesson } from "./rouxLesson";

/**
 * The demo scramble as turned with the cube held the tutor's way (red in
 * front, white on the bottom, see hold.ts): the cube the solver sees. Solver
 * tests use it.
 */
export const DEMO_HELD_SCRAMBLE = "F U R' D R' L' D' R' U F D' U F D L' B D2 U D' F L U2 L' D R2";

/** The same scramble from a solved cube with white on top and green in front (the lesson's `scramble`). */
export const DEMO_SCRAMBLE = "R D F' U F' B' U' F' D R U' D R U B' L U2 D U' R B D2 B' U F2";

let demo: Lesson | undefined;
/** The demo lesson, solved on first use (~300ms the first time, while the solver builds its tables). */
export function demoLesson(): Lesson {
  return (demo ??= rouxLesson(DEMO_SCRAMBLE));
}
