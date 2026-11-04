// How the tutor solves the four top corners (the CMLL stage): the beginner's
// two algorithms (orient, then swap: 9 to learn) or full CMLL (one algorithm
// out of 42). The choice is kept in a cookie so the server, which works out
// the solve, can read it. Safe to import from the browser (no solver code).
import type { CmllMethod } from "@/lib/solver/cmll";

export type { CmllMethod };

export const CORNERS_COOKIE = "roux-corners";
export const DEFAULT_CORNERS: CmllMethod = "beginner";

export function cornersFromCookie(value: string | undefined): CmllMethod {
  return value === "full" || value === "beginner" ? value : DEFAULT_CORNERS;
}
