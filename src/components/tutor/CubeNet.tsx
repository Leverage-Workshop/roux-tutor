"use client";
// Flat map of all six faces, drawn from the cube store. Shown instead of the
// 3D cube when the browser has no WebGL (see CubeView).
import { FACES, FACE_COLOR, STICKER_HEX, type Face } from "@/lib/cube/model";
import { useCubeStore } from "@/lib/cube/CubeStoreProvider";

// Grid cell (column, row) of each face in a 4x3 net: U above F, D below it.
const NET_POSITION: Record<Face, [number, number]> = {
  U: [2, 1],
  L: [1, 2],
  F: [2, 2],
  R: [3, 2],
  B: [4, 2],
  D: [2, 3],
};

export function CubeNet() {
  const facelets = useCubeStore((s) => s.facelets);
  return (
    <div
      role="img"
      aria-label="Flat map of the cube's six faces"
      className="grid aspect-[4/3] grid-cols-4 grid-rows-3 gap-1"
      style={{ width: "min(100%, calc((60dvh - 6rem) * 4 / 3))" }}
    >
      {FACES.map((face, f) => {
        const [col, row] = NET_POSITION[face];
        return (
          <div
            key={face}
            data-face={face}
            className="grid grid-cols-3 grid-rows-3 gap-0.5 rounded-md bg-zinc-900 p-0.5"
            style={{ gridColumn: col, gridRow: row }}
          >
            {[...facelets.slice(f * 9, f * 9 + 9)].map((letter, i) => (
              <div
                key={i}
                className="rounded-[3px]"
                style={{ backgroundColor: STICKER_HEX[FACE_COLOR[letter as Face]] }}
              />
            ))}
          </div>
        );
      })}
    </div>
  );
}
