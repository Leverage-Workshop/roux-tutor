// 3D layout of the cube for the renderer: where each of the 54 stickers sits,
// and which layers a move turns, about which axis, and how far.
//
// Coordinates follow three.js: +x = R, +y = U, +z = F. Cubelet centers sit on
// the grid {-1, 0, 1}^3. Angles follow the right-hand rule about the +axis, so
// a positive quarter turn is counterclockwise when looking from +axis.
// geometry.test.ts checks every move against cubejs, so the end of each
// animated turn matches the state the store moves to.
import type { Face } from "./model";
import { FACES } from "./model";
import type { Move, MoveBase } from "./notation";

export type Axis = "x" | "y" | "z";
export type Layer = -1 | 0 | 1;
export type Vec3 = readonly [number, number, number];

export interface Sticker {
  /** Facelet index (0-53, Kociemba order: see model.ts). */
  index: number;
  face: Face;
  /** Center of the cubelet the sticker is on. */
  cubelet: Vec3;
  /** Outward direction of the sticker (a unit axis vector). */
  normal: Vec3;
}

/** Cubelet position of the sticker at (row, col) on a face, per model.ts's viewing notes. */
function stickerCubelet(face: Face, row: number, col: number): Vec3 {
  switch (face) {
    case "U":
      return [col - 1, 1, row - 1];
    case "R":
      return [1, 1 - row, 1 - col];
    case "F":
      return [col - 1, 1 - row, 1];
    case "D":
      return [col - 1, -1, 1 - row];
    case "L":
      return [-1, 1 - row, col - 1];
    case "B":
      return [1 - col, 1 - row, -1];
  }
}

export const FACE_NORMAL: Record<Face, Vec3> = {
  U: [0, 1, 0],
  R: [1, 0, 0],
  F: [0, 0, 1],
  D: [0, -1, 0],
  L: [-1, 0, 0],
  B: [0, 0, -1],
};

/** All 54 stickers, in facelet order. */
export const STICKERS: readonly Sticker[] = FACES.flatMap((face, f) =>
  Array.from({ length: 9 }, (_, i) => ({
    index: f * 9 + i,
    face,
    cubelet: stickerCubelet(face, Math.floor(i / 3), i % 3),
    normal: FACE_NORMAL[face],
  })),
);

/** The 27 cubelet centers (including the hidden core). */
export const CUBELETS: readonly Vec3[] = [-1, 0, 1].flatMap((x) =>
  [-1, 0, 1].flatMap((y) => [-1, 0, 1].map((z) => [x, y, z] as const)),
);

export interface TurnSpec {
  axis: Axis;
  /** Layers along `axis` that move. */
  layers: readonly Layer[];
  /** Signed quarter turns about +axis (right-hand rule): -2..2. */
  quarterTurns: number;
}

const ALL: readonly Layer[] = [-1, 0, 1];

// Each base move as one clockwise quarter turn (viewed from its own face).
// Slices follow the face they're named after (M like L, E like D, S like F);
// rotations follow R (x), U (y) and F (z).
const BASE_TURN: Record<MoveBase, TurnSpec> = {
  R: { axis: "x", layers: [1], quarterTurns: -1 },
  L: { axis: "x", layers: [-1], quarterTurns: 1 },
  U: { axis: "y", layers: [1], quarterTurns: -1 },
  D: { axis: "y", layers: [-1], quarterTurns: 1 },
  F: { axis: "z", layers: [1], quarterTurns: -1 },
  B: { axis: "z", layers: [-1], quarterTurns: 1 },
  M: { axis: "x", layers: [0], quarterTurns: 1 },
  E: { axis: "y", layers: [0], quarterTurns: 1 },
  S: { axis: "z", layers: [0], quarterTurns: -1 },
  r: { axis: "x", layers: [0, 1], quarterTurns: -1 },
  l: { axis: "x", layers: [-1, 0], quarterTurns: 1 },
  u: { axis: "y", layers: [0, 1], quarterTurns: -1 },
  d: { axis: "y", layers: [-1, 0], quarterTurns: 1 },
  f: { axis: "z", layers: [0, 1], quarterTurns: -1 },
  b: { axis: "z", layers: [-1, 0], quarterTurns: 1 },
  x: { axis: "x", layers: ALL, quarterTurns: -1 },
  y: { axis: "y", layers: ALL, quarterTurns: -1 },
  z: { axis: "z", layers: ALL, quarterTurns: -1 },
};

export function turnSpec(move: Move): TurnSpec {
  const base = BASE_TURN[move[0] as MoveBase];
  const factor = move.endsWith("2") ? 2 : move.endsWith("'") ? -1 : 1;
  return { ...base, quarterTurns: base.quarterTurns * factor };
}

export function turnAngle(move: Move): number {
  return (turnSpec(move).quarterTurns * Math.PI) / 2;
}

const AXIS_INDEX: Record<Axis, 0 | 1 | 2> = { x: 0, y: 1, z: 2 };

export function axisIndex(axis: Axis): 0 | 1 | 2 {
  return AXIS_INDEX[axis];
}

/** Whether a cubelet at `position` moves during the turn. */
export function isInTurn(position: Vec3, spec: TurnSpec): boolean {
  return spec.layers.includes(position[AXIS_INDEX[spec.axis]] as Layer);
}

/** Rotate an integer vector by quarter turns about an axis (right-hand rule). */
export function rotateVec(v: Vec3, axis: Axis, quarterTurns: number): Vec3 {
  const n = ((quarterTurns % 4) + 4) % 4;
  let [x, y, z] = v;
  for (let i = 0; i < n; i++) {
    if (axis === "x") [y, z] = [-z, y];
    else if (axis === "y") [z, x] = [-x, z];
    else [x, y] = [-y, x];
  }
  // Avoid -0 so vectors compare cleanly.
  return [x + 0, y + 0, z + 0];
}
