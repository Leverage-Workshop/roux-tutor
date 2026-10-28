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

export const DEMO_SCRAMBLE = "F U R' D R' L' D' R' U F D' U F D L' B D2 U D' F L U2 L' D R2";

let demo: Lesson | undefined;
/** The demo lesson, solved on first use (~300ms the first time, while the solver builds its tables). */
export function demoLesson(): Lesson {
  return (demo ??= rouxLesson(DEMO_SCRAMBLE));
}
