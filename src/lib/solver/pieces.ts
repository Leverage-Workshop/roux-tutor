// Fast piece tracking for the solver. Instead of whole cubejs states, the
// search follows only the few pieces a step cares about. Each piece is one
// number 0-23: position * orientations + orientation (corners: 8 x 3,
// edges: 12 x 2). Move tables are read from cubejs, so they always agree
// with the cube model (pieces.test.ts checks this).
import Cube, { type CubeState } from "cubejs";
import type { Move } from "@/lib/cube/notation";

// Piece and position numbers, in cubejs order.
export const CORNERS = { URF: 0, UFL: 1, ULB: 2, UBR: 3, DFR: 4, DLF: 5, DBL: 6, DRB: 7 } as const;
export const EDGES = {
  UR: 0, UF: 1, UL: 2, UB: 3, DR: 4, DF: 5, DL: 6, DB: 7, FR: 8, FL: 9, BL: 10, BR: 11,
} as const;

export type PieceKind = "corner" | "edge";

export interface TrackedPiece {
  kind: PieceKind;
  /** Piece number (also its home position). */
  piece: number;
}

/** The value a piece has when it is home and correctly oriented. */
export function homeCoord(p: TrackedPiece): number {
  return p.kind === "corner" ? p.piece * 3 : p.piece * 2;
}

/** Where a piece is in a cubejs state, as a 0-23 coordinate. */
export function pieceCoord(state: CubeState, p: TrackedPiece): number {
  if (p.kind === "corner") {
    const pos = state.cp.indexOf(p.piece);
    return pos * 3 + state.co[pos];
  }
  const pos = state.ep.indexOf(p.piece);
  return pos * 2 + state.eo[pos];
}

export interface MoveTable {
  corner: Uint8Array; // [24], coordinate after the move
  edge: Uint8Array; // [24]
}

export function buildMoveTable(move: Move): MoveTable {
  // Multiplying by a move sends the piece at position `from = m.cp[to]` to `to`,
  // adding m.co[to] to its orientation (see cubejs cornerMultiply).
  const m = new Cube().move(move).toJSON();
  const corner = new Uint8Array(24);
  const edge = new Uint8Array(24);
  for (let to = 0; to < 8; to++) {
    for (let o = 0; o < 3; o++) corner[m.cp[to] * 3 + o] = to * 3 + ((o + m.co[to]) % 3);
  }
  for (let to = 0; to < 12; to++) {
    for (let o = 0; o < 2; o++) edge[m.ep[to] * 2 + o] = to * 2 + ((o + m.eo[to]) % 2);
  }
  return { corner, edge };
}
