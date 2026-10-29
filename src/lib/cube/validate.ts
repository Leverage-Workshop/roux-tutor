// Legality check for a hand-entered (or scanned) cube. Used by the facelet
// editor to point at mistakes while the user is still tapping, and by /tutor
// before it solves a cube from the URL.
//
// A draft is a 54-character facelet string (see model.ts) where "." marks a
// sticker that has no color yet. Centers must be in the standard places
// (white top, green front): the editor fixes them and asks the user to hold
// the cube that way.
//
// A cube can be solved only if every piece is a real piece, each piece is
// there once, the corner twists add up to a multiple of 3, the edge flips to a
// multiple of 2, and corners and edges have the same permutation parity.
import { FACES, FACE_COLOR, SOLVED_FACELETS, fromFacelets, type CubeState, type Face } from "./model";

export const BLANK = ".";

/** Facelet indexes of each corner slot (URF UFL ULB UBR DFR DLF DBL DRB), U/D sticker first, then clockwise. */
export const CORNER_FACELETS: readonly (readonly [number, number, number])[] = [
  [8, 9, 20],
  [6, 18, 38],
  [0, 36, 47],
  [2, 45, 11],
  [29, 26, 15],
  [27, 44, 24],
  [33, 53, 42],
  [35, 17, 51],
];

/** Facelet indexes of each edge slot (UR UF UL UB DR DF DL DB FR FL BL BR); the first is the U/D (or F/B) sticker. */
export const EDGE_FACELETS: readonly (readonly [number, number])[] = [
  [5, 10],
  [7, 19],
  [3, 37],
  [1, 46],
  [32, 16],
  [28, 25],
  [30, 43],
  [34, 52],
  [23, 12],
  [21, 41],
  [50, 39],
  [48, 14],
];

// The pieces of a solved cube: the colors of each slot, in slot order.
const CORNER_PIECES = CORNER_FACELETS.map((slot) => slot.map((i) => SOLVED_FACELETS[i]).join(""));
const EDGE_PIECES = EDGE_FACELETS.map((slot) => slot.map((i) => SOLVED_FACELETS[i]).join(""));

const CORNER_SLOT_NAMES = [
  "top front right",
  "top front left",
  "top back left",
  "top back right",
  "bottom front right",
  "bottom front left",
  "bottom back left",
  "bottom back right",
];
const EDGE_SLOT_NAMES = [
  "top right",
  "top front",
  "top left",
  "top back",
  "bottom right",
  "bottom front",
  "bottom left",
  "bottom back",
  "front right",
  "front left",
  "back left",
  "back right",
];

const OPPOSITE: Record<Face, Face> = { U: "D", D: "U", R: "L", L: "R", F: "B", B: "F" };

export type FaceletProblemKind =
  | "centers"
  | "count"
  | "repeated-color"
  | "opposite-colors"
  | "mirrored-corner"
  | "duplicate-piece"
  | "corner-twist"
  | "edge-flip"
  | "parity";

export interface FaceletProblem {
  kind: FaceletProblemKind;
  message: string;
  /** Stickers to mark in the editor (empty when the problem can't be pinned to stickers). */
  facelets: number[];
}

export interface FaceletCheck {
  /** Stickers with no color yet. */
  blanks: number;
  /** How many stickers of each color are placed, centers included. */
  counts: Record<Face, number>;
  problems: FaceletProblem[];
  /** The cube, when every sticker is filled in and it is a legal, solvable cube. */
  state: CubeState | null;
}

/** A draft with only the six centers filled in. */
export const EMPTY_DRAFT = SOLVED_FACELETS.split("")
  .map((ch, i) => (i % 9 === 4 ? ch : BLANK))
  .join("");

/**
 * Read a draft from untrusted input (e.g. a URL). Returns null unless it is 54
 * characters of U R F D L B or "." with the centers in their standard places.
 */
export function parseDraft(input: string | null | undefined): string | null {
  if (typeof input !== "string" || !/^[URFDLB.]{54}$/.test(input)) return null;
  return FACES.every((face, f) => input[f * 9 + 4] === face) ? input : null;
}

const colorName = (ch: string) => FACE_COLOR[ch as Face];
const pieceName = (colors: string) => [...colors].map(colorName).join("-");

/** Check a draft (see the top of this file) for everything that makes a cube impossible. */
export function checkFacelets(draft: string): FaceletCheck {
  if (draft.length !== 54) throw new RangeError(`Expected 54 facelets, got ${draft.length}`);
  const counts = Object.fromEntries(FACES.map((f) => [f, 0])) as Record<Face, number>;
  let blanks = 0;
  for (const ch of draft) {
    if (ch === BLANK) blanks++;
    else if (ch in counts) counts[ch as Face]++;
    else throw new RangeError(`Unknown facelet "${ch}"`);
  }
  const problems: FaceletProblem[] = [];

  const wrongCenters = FACES.map((face, f) => f * 9 + 4).filter((i) => draft[i] !== SOLVED_FACELETS[i]);
  if (wrongCenters.length > 0) {
    problems.push({
      kind: "centers",
      message: "Centers must be white on top, green in front, red right, orange left, blue back and yellow bottom.",
      facelets: wrongCenters,
    });
  }

  // Each slot: which piece is there (index into CORNER_PIECES / EDGE_PIECES)
  // and how it is turned, or null while it has blanks or isn't a real piece.
  const corners = CORNER_FACELETS.map((slot, s) =>
    readPiece(draft, slot, CORNER_PIECES, `${CORNER_SLOT_NAMES[s]} corner`, problems),
  );
  const edges = EDGE_FACELETS.map((slot, s) =>
    readPiece(draft, slot, EDGE_PIECES, `${EDGE_SLOT_NAMES[s]} edge`, problems),
  );
  findDuplicates(corners, CORNER_FACELETS, CORNER_PIECES, "corner", problems);
  findDuplicates(edges, EDGE_FACELETS, EDGE_PIECES, "edge", problems);

  // After the piece problems, which point at the stickers to fix. Marking all
  // ten stickers of a color would light up most of the cube, so none are.
  for (const face of FACES) {
    if (counts[face] > 9) {
      problems.push({
        kind: "count",
        message: `There are ${counts[face]} ${FACE_COLOR[face]} stickers, but a cube has 9.`,
        facelets: [],
      });
    }
  }

  if (blanks > 0 || problems.length > 0) return { blanks, counts, problems, state: null };

  // Every slot now holds a different real piece, so all 20 pieces are there.
  const twist = corners.reduce((sum, c) => sum + c!.turn, 0) % 3;
  if (twist !== 0) {
    problems.push({
      kind: "corner-twist",
      message:
        "One corner is twisted: its colors are right, but turned. Check the corners' stickers. If they match your cube, it was put back together twisted; twist that corner back to solve it.",
      facelets: [],
    });
  }
  const flip = edges.reduce((sum, e) => sum + e!.turn, 0) % 2;
  if (flip !== 0) {
    problems.push({
      kind: "edge-flip",
      message:
        "One edge is flipped: its colors are swapped. Check the edges' stickers. If they match your cube, it was put back together with an edge flipped.",
      facelets: [],
    });
  }
  if (parity(corners.map((c) => c!.piece)) !== parity(edges.map((e) => e!.piece))) {
    problems.push({
      kind: "parity",
      message:
        "Two pieces are swapped. Check the stickers. If they match your cube, it was put back together with two pieces swapped.",
      facelets: [],
    });
  }
  if (problems.length > 0) return { blanks, counts, problems, state: null };
  return { blanks, counts, problems, state: fromFacelets(draft) };
}

interface PlacedPiece {
  piece: number;
  /** Corners: where the U/D sticker sits (0-2). Edges: 1 if flipped. */
  turn: number;
}

function readPiece(
  draft: string,
  slot: readonly number[],
  pieces: readonly string[],
  where: string,
  problems: FaceletProblem[],
): PlacedPiece | null {
  const colors = slot.map((i) => draft[i]);
  const filled = colors.filter((ch) => ch !== BLANK);
  const facelets = [...slot];
  // Two problems a part-filled piece can already show.
  const repeated = filled.find((ch, i) => filled.indexOf(ch) !== i);
  if (repeated) {
    problems.push({
      kind: "repeated-color",
      message: `The ${where} has two ${colorName(repeated)} stickers; every piece has different colors.`,
      facelets,
    });
    return null;
  }
  const opposite = filled.find((ch) => filled.includes(OPPOSITE[ch as Face]));
  if (opposite) {
    problems.push({
      kind: "opposite-colors",
      message: `The ${where} has ${colorName(opposite)} and ${colorName(OPPOSITE[opposite as Face])} stickers, which are on opposite sides of a cube and never share a piece.`,
      facelets,
    });
    return null;
  }
  if (filled.length < slot.length) return null;

  // A real piece reads as its solved colors, turned.
  for (let turn = 0; turn < slot.length; turn++) {
    const turned = colors.map((_, n) => colors[(n + turn) % slot.length]).join("");
    const piece = pieces.indexOf(turned);
    if (piece >= 0) return { piece, turn };
  }
  // Three different, non-opposite colors in the mirror-image order.
  problems.push({
    kind: "mirrored-corner",
    message: `The ${where}'s colors are in an order no corner has (a mirror image of the ${pieceName(colors.join(""))} corner). Check its three stickers.`,
    facelets,
  });
  return null;
}

function findDuplicates(
  placed: readonly (PlacedPiece | null)[],
  slots: readonly (readonly number[])[],
  pieces: readonly string[],
  kind: "corner" | "edge",
  problems: FaceletProblem[],
) {
  pieces.forEach((colors, piece) => {
    const at = placed.flatMap((p, s) => (p?.piece === piece ? [s] : []));
    if (at.length > 1) {
      problems.push({
        kind: "duplicate-piece",
        message: `There are ${at.length} ${pieceName(colors)} ${kind}s, but a cube has one. One of them has a wrong sticker.`,
        facelets: at.flatMap((s) => [...slots[s]]),
      });
    }
  });
}

/** 0 for an even permutation, 1 for odd. */
function parity(perm: readonly number[]): number {
  let swaps = 0;
  const seen = new Array<boolean>(perm.length).fill(false);
  for (let i = 0; i < perm.length; i++) {
    for (let j = i, len = 0; !seen[j]; j = perm[j], len++) {
      seen[j] = true;
      if (seen[perm[j]]) swaps += len;
    }
  }
  return swaps % 2;
}
