// Typed, immutable wrapper around cubejs. Every function takes and returns a
// plain CubeState (safe to keep in zustand); cubejs objects never leak out.
//
// Facelet strings are 54 characters in Kociemba order: faces U R F D L B,
// 9 stickers each, read row by row. Each letter names the face whose color
// the sticker has in the solved cube (so "U" = white). Viewing each face:
//   U: from above, B edge at the top       D: from below, F edge at the top
//   F, R, B, L: from the front of that face, U edge at the top
// Do NOT use cubejs's Kociemba solve() for teaching output (see AGENTS.md).
import Cube, { type CubeState } from "cubejs";
import { toMoves, type Move } from "./notation";

export type { CubeState };

export type Face = "U" | "R" | "F" | "D" | "L" | "B";
export const FACES: readonly Face[] = ["U", "R", "F", "D", "L", "B"];

export type StickerColor = "white" | "red" | "green" | "yellow" | "orange" | "blue";

/** Standard Western color scheme: white top, green front. */
export const FACE_COLOR: Record<Face, StickerColor> = {
  U: "white",
  R: "red",
  F: "green",
  D: "yellow",
  L: "orange",
  B: "blue",
};

/** Shared palette for the 3D renderer and the 2D facelet editor. */
export const STICKER_HEX: Record<StickerColor, string> = {
  white: "#ffffff",
  red: "#c41e3a",
  green: "#009e60",
  yellow: "#ffd500",
  orange: "#ff5800",
  blue: "#0051ba",
};

export const SOLVED_FACELETS = FACES.map((f) => f.repeat(9)).join("");

export class InvalidFaceletsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidFaceletsError";
  }
}

export function solvedState(): CubeState {
  return new Cube().toJSON();
}

/** Return a new state with the moves applied. The input is not changed. */
export function applyMoves(state: CubeState, alg: string | readonly Move[]): CubeState {
  const moves = toMoves(alg);
  const cube = new Cube(state);
  if (moves.length > 0) cube.move(moves.join(" "));
  return cube.toJSON();
}

export function isSolved(state: CubeState): boolean {
  // cubejs ignores whole-cube orientation, so a solved cube after "x y" counts.
  return new Cube(state).isSolved();
}

export function toFacelets(state: CubeState): string {
  return new Cube(state).asString();
}

/**
 * Build a state from a 54-letter facelet string.
 * Checks the format (length, letters, 9 of each, distinct centers) and that
 * every corner and edge is a real piece. Full legality (each piece used once,
 * twist, flip, parity) is checked by the facelet editor (feat-005).
 */
export function fromFacelets(facelets: string): CubeState {
  if (facelets.length !== 54) {
    throw new InvalidFaceletsError(`Expected 54 facelets, got ${facelets.length}`);
  }
  const counts = new Map<string, number>();
  for (const ch of facelets) {
    if (!FACES.includes(ch as Face)) {
      throw new InvalidFaceletsError(`Unknown facelet "${ch}"`);
    }
    counts.set(ch, (counts.get(ch) ?? 0) + 1);
  }
  for (const face of FACES) {
    if (counts.get(face) !== 9) {
      throw new InvalidFaceletsError(`Expected 9 ${FACE_COLOR[face]} stickers, got ${counts.get(face) ?? 0}`);
    }
  }
  const centers = new Set(FACES.map((_, i) => facelets[i * 9 + 4]));
  if (centers.size !== 6) {
    throw new InvalidFaceletsError("Each face needs a different center color");
  }
  // cubejs silently maps unknown corners/edges to defaults; a round trip exposes them.
  const state = Cube.fromString(facelets).toJSON();
  if (toFacelets(state) !== facelets) {
    throw new InvalidFaceletsError("Some corners or edges have impossible color combinations");
  }
  return state;
}

/** Colors of all 54 stickers, in facelet order. */
export function faceletColors(state: CubeState): StickerColor[] {
  return [...toFacelets(state)].map((ch) => FACE_COLOR[ch as Face]);
}

/** Colors of one face's 9 stickers, row by row (see viewing notes above). */
export function faceColors(state: CubeState, face: Face): StickerColor[] {
  const start = FACES.indexOf(face) * 9;
  return faceletColors(state).slice(start, start + 9);
}

/** Which face, row and column (0-2) a facelet index (0-53) sits at. */
export function faceletPosition(index: number): { face: Face; row: number; col: number } {
  if (!Number.isInteger(index) || index < 0 || index > 53) {
    throw new RangeError(`Facelet index must be 0-53, got ${index}`);
  }
  const within = index % 9;
  return { face: FACES[Math.floor(index / 9)], row: Math.floor(within / 3), col: within % 3 };
}
