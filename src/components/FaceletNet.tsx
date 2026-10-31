// Flat map of all six faces from a 54-letter facelet string: U above F, D
// below it, L F R B across. Used for the tutor's no-WebGL fallback and for
// saved-cube previews.
import type { CSSProperties } from "react";
import { FACES, FACE_COLOR, STICKER_HEX, type Face } from "@/lib/cube/model";

// Grid cell (column, row) of each face in a 4x3 net.
const NET_POSITION: Record<Face, [number, number]> = {
  U: [2, 1],
  L: [1, 2],
  F: [2, 2],
  R: [3, 2],
  B: [4, 2],
  D: [2, 3],
};

export function FaceletNet({
  facelets,
  label = "Flat map of the cube's six faces",
  small = false,
  className = "",
  style,
}: {
  facelets: string;
  label?: string;
  /** Tighter gaps and corners for thumbnails. */
  small?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      role="img"
      aria-label={label}
      className={`grid aspect-[4/3] grid-cols-4 grid-rows-3 ${small ? "gap-px" : "gap-1"} ${className}`}
      style={style}
    >
      {FACES.map((face, f) => {
        const [col, row] = NET_POSITION[face];
        return (
          <div
            key={face}
            data-face={face}
            className={`grid grid-cols-3 grid-rows-3 bg-zinc-900 ${small ? "gap-px rounded-[2px] p-px" : "gap-0.5 rounded-md p-0.5"}`}
            style={{ gridColumn: col, gridRow: row }}
          >
            {[...facelets.slice(f * 9, f * 9 + 9)].map((letter, i) => (
              <div
                key={i}
                className={small ? "rounded-[1px]" : "rounded-[3px]"}
                style={{ backgroundColor: STICKER_HEX[FACE_COLOR[letter as Face]] }}
              />
            ))}
          </div>
        );
      })}
    </div>
  );
}
