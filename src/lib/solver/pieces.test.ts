import { describe, expect, it } from "vitest";
import { applyMoves, solvedState } from "@/lib/cube/model";
import { parseAlgorithm, type Move } from "@/lib/cube/notation";
import { CORNERS, EDGES, buildMoveTable, homeCoord, pieceCoord, type TrackedPiece } from "./pieces";

const ALL_PIECES: TrackedPiece[] = [
  ...Object.values(CORNERS).map((piece) => ({ kind: "corner" as const, piece })),
  ...Object.values(EDGES).map((piece) => ({ kind: "edge" as const, piece })),
];

const MOVES = parseAlgorithm(
  "U U' U2 D D' D2 F F' F2 B B' B2 L L' L2 R R' R2 M M' M2 r r' r2",
);

describe("piece tracking", () => {
  it("puts every piece home on a solved cube", () => {
    const solved = solvedState();
    for (const p of ALL_PIECES) expect(pieceCoord(solved, p)).toBe(homeCoord(p));
  });

  it("moves every piece exactly like cubejs for every search move", () => {
    // Start from a mixed state so pieces sit away from home with twists and flips.
    const start = applyMoves(solvedState(), "R U2 F' L D B2 M r' U F2 D' L2");
    for (const move of MOVES) {
      const table = buildMoveTable(move);
      const after = applyMoves(start, [move as Move]);
      for (const p of ALL_PIECES) {
        const before = pieceCoord(start, p);
        const moved = p.kind === "corner" ? table.corner[before] : table.edge[before];
        expect(moved, `${move} on ${p.kind} ${p.piece}`).toBe(pieceCoord(after, p));
      }
    }
  });
});
