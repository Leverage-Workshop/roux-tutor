// How the tutor holds the cube for the whole solve: red in front and white on
// the bottom, so yellow on top, blue on the left, green on the right and
// orange at the back (the standard color scheme). Every move of a lesson is
// relative to this hold, and the 3D cube starts out held this way.
//
// The solver works in its own frame, the cubejs solved cube (white top, green
// front, orange left). To solve a held cube, its stickers are relabeled so
// the held centers count as that frame (solverView). Face turns don't depend
// on colors, so the solver's moves work unchanged on the held cube; only the
// color names in the solver's text need translating (holdColors).
//
// No solver imports here: the tutor screen uses this in the browser.
import { FACES, FACE_COLOR, applyMoves, fromFacelets, toFacelets, type CubeState, type Face, type StickerColor } from "@/lib/cube/model";
import type { Move } from "@/lib/cube/notation";

/** The color facing each way while the tutor holds the cube. */
export const HOLD: Readonly<Record<Face, StickerColor>> = {
  U: "yellow",
  R: "green",
  F: "red",
  D: "white",
  L: "blue",
  B: "orange",
};

/** How to hold the cube, for the screen. */
export const HOLD_TEXT = "Red in front, white on the bottom";

/** Facelet letter of each color (letters name a color by its home face, see model.ts). */
const LETTER = Object.fromEntries(FACES.map((f) => [FACE_COLOR[f], f])) as Record<StickerColor, Face>;

/** Center letters, U R F D L B, when the cube is held the tutor's way. */
const HELD_CENTERS = FACES.map((f) => LETTER[HOLD[f]]).join("");

/** All 24 ways to hold the cube, shortest rotation first. */
const ROTATIONS: readonly Move[][] = (() => {
  const singles: Move[] = ["x", "x'", "x2", "y", "y'", "y2", "z", "z'", "z2"];
  return [[], ...singles.map((m) => [m]), ...singles.flatMap((a) => singles.map((b) => [a, b]))];
})();

function centers(state: CubeState): string {
  const facelets = toFacelets(state);
  return FACES.map((_, i) => facelets[i * 9 + 4]).join("");
}

/**
 * The whole-cube rotation that turns `state` to the tutor's hold. Centers
 * only move together (rotations, slice and wide turns keep their order), so
 * one always exists. For a cube entered with white on top and green in
 * front it is x2 y.
 */
export function holdRotation(state: CubeState): Move[] {
  const rotation = ROTATIONS.find((r) => centers(applyMoves(state, r)) === HELD_CENTERS);
  if (!rotation) throw new Error("No rotation holds this cube the tutor's way");
  return rotation;
}

/**
 * A held cube (see holdRotation) relabeled into the solver's frame: each
 * sticker is named after the face whose center has its color. Solving this
 * state solves the held cube with the same moves.
 */
export function solverView(held: CubeState): CubeState {
  const relabel = Object.fromEntries(FACES.map((f) => [LETTER[HOLD[f]], f])) as Record<Face, Face>;
  return fromFacelets([...toFacelets(held)].map((ch) => relabel[ch as Face]).join(""));
}

/** Solver color name -> the color in that place on the held cube. */
const TO_HELD = Object.fromEntries(FACES.map((f) => [FACE_COLOR[f], HOLD[f]])) as Record<StickerColor, StickerColor>;

/**
 * Translate the color names in the solver's text (written for its frame,
 * e.g. "the yellow-orange edge") to the held cube ("the white-blue edge").
 */
export function holdColors(text: string): string {
  return text.replace(/\b(white|yellow|red|green|orange|blue)\b/gi, (word) => {
    const color = TO_HELD[word.toLowerCase() as StickerColor];
    return word[0] === word[0].toUpperCase() ? color[0].toUpperCase() + color.slice(1) : color;
  });
}
