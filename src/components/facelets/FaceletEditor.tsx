"use client";
// Manual facelet entry: the user picks a color and taps stickers, one face at
// a time, while the checker (validate.ts) marks impossible pieces as soon as
// they show up. When the cube is complete and legal, "Solve this cube" opens
// the tutor with it. The camera scanner (/scan) opens this screen with its
// guesses filled in, for the user to correct.
//
// Centers are fixed: the user holds the cube with white on top and green in
// front, and each face's hint says which way to turn it.
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { FACE_COLOR, STICKER_HEX, type Face } from "@/lib/cube/model";
import { BLANK, EMPTY_DRAFT, checkFacelets } from "@/lib/cube/validate";
import type { SessionSource } from "@/lib/supabase/tutoringSessions";
import { editorHref, tutorHref } from "@/lib/tutor/links";

/** The order the faces are entered in: around the sides, then top and bottom. */
const FACE_ORDER: readonly Face[] = ["F", "R", "B", "L", "U", "D"];

const FACE_NAME: Record<Face, string> = {
  F: "Front",
  R: "Right",
  B: "Back",
  L: "Left",
  U: "Top",
  D: "Bottom",
};

// How each face is seen in the editor (matches the facelet order, model.ts):
// the face whose center is above it, then right, below, left.
const NEIGHBORS: Record<Face, [Face, Face, Face, Face]> = {
  F: ["U", "R", "D", "L"],
  R: ["U", "B", "D", "F"],
  B: ["U", "L", "D", "R"],
  L: ["U", "F", "D", "B"],
  U: ["B", "R", "F", "L"],
  D: ["F", "R", "B", "L"],
};

const ROW_NAMES = ["top", "middle", "bottom"];
const COL_NAMES = ["left", "center", "right"];

const faceStart = (face: Face) => "URFDLB".indexOf(face) * 9;

function stickerName(within: number): string {
  if (within === 4) return "center";
  const row = ROW_NAMES[Math.floor(within / 3)];
  const col = COL_NAMES[within % 3];
  return row === "middle" ? `middle ${col}` : col === "center" ? `${row} middle` : `${row} ${col}`;
}

/** `source` is "scan" when the draft came from the scanner; links keep it. */
export function FaceletEditor({ initial, source }: { initial: string; source?: SessionSource }) {
  const [draft, setDraft] = useState(initial);
  const [face, setFace] = useState<Face>("F");
  const [color, setColor] = useState<Face>("F");
  const check = useMemo(() => checkFacelets(draft), [draft]);
  const marked = useMemo(() => new Set(check.problems.flatMap((p) => p.facelets)), [check]);

  // Keep the draft in the address bar, so a refresh or coming back from the
  // tutor doesn't lose it. Only after an edit: the page's loading fallback is
  // a blank editor and must not wipe a draft that is still on its way.
  const synced = useRef(initial);
  useEffect(() => {
    if (draft === synced.current) return;
    synced.current = draft;
    window.history.replaceState(null, "", draft === EMPTY_DRAFT ? "/enter" : editorHref(draft, source));
  }, [draft, source]);

  const paint = (index: number) =>
    setDraft((d) => (d[index] === color ? d : d.slice(0, index) + color + d.slice(index + 1)));
  const clearFace = () => {
    const start = faceStart(face);
    const blankFace = [...draft.slice(start, start + 9)].map((ch, i) => (i === 4 ? ch : BLANK)).join("");
    setDraft((d) => d.slice(0, start) + blankFace + d.slice(start + 9));
  };

  const [above, right, below, left] = NEIGHBORS[face];
  const start = faceStart(face);
  const problem = check.problems[0];

  return (
    <main
      className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-3 px-4 pt-2 [@media(max-height:700px)]:gap-2"
      style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
    >
      <header className="flex min-h-12 items-center justify-between gap-2">
        <Link href="/" className="flex min-h-11 items-center font-semibold">
          Roux Tutor
        </Link>
        <h1 className="text-base font-semibold text-zinc-600 dark:text-zinc-400">Enter your cube</h1>
      </header>

      <div role="tablist" aria-label="Faces" className="grid grid-cols-6 gap-1.5">
        {FACE_ORDER.map((f) => {
          const s = faceStart(f);
          const hasProblem = [...marked].some((i) => i >= s && i < s + 9);
          const selected = f === face;
          return (
            <button
              key={f}
              type="button"
              role="tab"
              id={`face-tab-${f}`}
              aria-selected={selected}
              aria-controls="face-panel"
              aria-label={`${FACE_NAME[f]} face${hasProblem ? ", has a problem" : ""}`}
              onClick={() => setFace(f)}
              className={`relative flex flex-col items-center gap-1 rounded-xl p-1 text-xs font-medium ${
                selected ? "bg-zinc-200 dark:bg-zinc-800" : ""
              }`}
            >
              <span aria-hidden="true" className="grid aspect-square w-full max-w-10 grid-cols-3 gap-px rounded-md bg-zinc-900 p-px">
                {[...draft.slice(s, s + 9)].map((ch, i) => (
                  <span key={i} className="rounded-[2px]" style={{ backgroundColor: swatch(ch) }} />
                ))}
              </span>
              {FACE_NAME[f]}
              {hasProblem && (
                <span aria-hidden="true" className="absolute top-0 right-1 size-2.5 rounded-full bg-red-600 ring-2 ring-background" />
              )}
            </button>
          );
        })}
      </div>

      <section id="face-panel" role="tabpanel" aria-labelledby={`face-tab-${face}`} className="flex flex-col items-center gap-2">
        <p className="text-center text-sm text-zinc-700 dark:text-zinc-300">
          Hold the cube with <strong>{FACE_COLOR[face]}</strong> facing you and <strong>{FACE_COLOR[above]}</strong> on top.
        </p>
        {/* The face, with the colors of the centers around it as edge bars. */}
        <div
          className="grid grid-cols-[0.5rem_1fr_0.5rem] grid-rows-[0.5rem_1fr_0.5rem] gap-1.5"
          style={{ width: "min(100%, max(10rem, 100dvh - 27rem))" }}
        >
          <EdgeBar face={above} side="top" className="col-start-2 row-start-1" />
          <EdgeBar face={left} side="left" className="col-start-1 row-start-2" />
          <div className="col-start-2 row-start-2 grid aspect-square grid-cols-3 gap-1.5 rounded-2xl bg-zinc-900 p-1.5">
            {[...draft.slice(start, start + 9)].map((ch, i) => {
              const index = start + i;
              const isCenter = i === 4;
              const bad = marked.has(index);
              const colorName = ch === BLANK ? "no color" : FACE_COLOR[ch as Face];
              return (
                <button
                  key={index}
                  type="button"
                  data-facelet={index}
                  disabled={isCenter}
                  aria-label={`${stickerName(i)}: ${colorName}${isCenter ? " (fixed)" : ""}${bad ? ", has a problem" : ""}`}
                  onClick={() => paint(index)}
                  className={`relative rounded-lg disabled:cursor-default ${
                    bad ? "outline-4 -outline-offset-4 outline-red-600 outline-dashed" : ""
                  } ${ch === BLANK ? "bg-[repeating-linear-gradient(45deg,#3f3f46_0_6px,#27272a_6px_12px)]" : ""}`}
                  style={ch === BLANK ? undefined : { backgroundColor: STICKER_HEX[FACE_COLOR[ch as Face]] }}
                >
                  {isCenter && (
                    <span aria-hidden="true" className="text-[0.65rem] font-semibold tracking-wide text-black/50 uppercase">
                      {FACE_NAME[face]}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <EdgeBar face={right} side="right" className="col-start-3 row-start-2" />
          <EdgeBar face={below} side="bottom" className="col-start-2 row-start-3" />
        </div>
      </section>

      <div role="radiogroup" aria-label="Color to paint" className="grid grid-cols-6 gap-2">
        {FACE_ORDER.map((f) => {
          const left = 9 - check.counts[f];
          const selected = f === color;
          return (
            <button
              key={f}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={`${FACE_COLOR[f]}, ${left >= 0 ? `${left} left` : `${-left} too many`}`}
              onClick={() => setColor(f)}
              className="flex flex-col items-center gap-1"
            >
              <span
                aria-hidden="true"
                className={`block h-11 w-full max-w-14 rounded-xl border border-zinc-300 dark:border-zinc-700 ${
                  selected ? "ring-4 ring-foreground ring-offset-2 ring-offset-background" : ""
                }`}
                style={{ backgroundColor: STICKER_HEX[FACE_COLOR[f]] }}
              />
              <span aria-hidden="true" className={`text-xs tabular-nums ${left < 0 ? "font-semibold text-red-600" : "text-zinc-600 dark:text-zinc-400"}`}>
                {left >= 0 ? `${left} left` : `${-left} over`}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-auto flex flex-col gap-2">
        <p role="status" className="min-h-10 text-sm text-zinc-800 dark:text-zinc-200">
          {problem ? (
            <span className="text-red-700 dark:text-red-400">
              {problem.message}
              {check.problems.length > 1 && ` (+${check.problems.length - 1} more)`}
            </span>
          ) : check.state ? (
            "All stickers are in and this is a real cube. Ready to solve!"
          ) : (
            `${check.blanks} sticker${check.blanks === 1 ? "" : "s"} left to color.`
          )}
        </p>
        <div className="grid grid-cols-[1fr_2fr] gap-3">
          <button
            type="button"
            onClick={clearFace}
            className="h-14 rounded-2xl border border-zinc-300 font-semibold active:bg-zinc-100 dark:border-zinc-700 dark:active:bg-zinc-800"
          >
            Clear face
          </button>
          {check.state ? (
            <Link
              href={tutorHref(draft, source)}
              className="flex h-14 items-center justify-center rounded-2xl bg-foreground text-lg font-semibold text-background active:opacity-80"
            >
              Solve this cube
            </Link>
          ) : (
            <button type="button" disabled className="h-14 rounded-2xl bg-foreground text-lg font-semibold text-background opacity-40">
              Solve this cube
            </button>
          )}
        </div>
      </div>
    </main>
  );
}

function swatch(ch: string): string {
  return ch === BLANK ? "#52525b" : STICKER_HEX[FACE_COLOR[ch as Face]];
}

function EdgeBar({ face, side, className }: { face: Face; side: string; className: string }) {
  return (
    <span
      role="img"
      aria-label={`${FACE_COLOR[face]} side ${side === "top" ? "above" : side === "bottom" ? "below" : `to the ${side}`}`}
      className={`rounded-full border border-zinc-300 dark:border-zinc-700 ${className}`}
      style={{ backgroundColor: STICKER_HEX[FACE_COLOR[face]] }}
    />
  );
}
