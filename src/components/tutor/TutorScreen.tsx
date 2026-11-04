"use client";
// Tutor viewport: cube view in the top 60% of the screen, persistent drawer in
// the bottom 40% (30% / 70% while the drawer is expanded). Both read the same cube store. For signed-in users the solve
// is saved as a tutoring session as they step through it, and the header's
// bookmark saves the cube. A continued solve (`resume`) opens at its saved
// move and keeps writing to the same session.
//
// The cube starts held the way the solve holds it (red in front, white on the
// bottom, see hold.ts), and a hint under the cube view says how to hold it,
// also once the middle slice turns the centers.
import { useState } from "react";
import Link from "next/link";
import { AuthButton } from "@/components/AuthButton";
import { CubeStoreProvider, useCubeStore } from "@/lib/cube/CubeStoreProvider";
import { STICKER_HEX, applyMoves, fromFacelets, solvedState, toFacelets, type StickerColor } from "@/lib/cube/model";
import type { NewTutoringSession, SessionSource } from "@/lib/supabase/tutoringSessions";
import { HOLD, HOLD_TEXT, HOLD_TURNED_TEXT, holdCentersStraight } from "@/lib/tutor/hold";
import { stageEnds, type Lesson } from "@/lib/tutor/lesson";
import { editorHref } from "@/lib/tutor/links";
import { CubeView } from "./CubeView";
import { SaveCubeButton } from "./SaveCubeButton";
import { TutorDrawer } from "./TutorDrawer";
import { useTutoringRecorder, type TutoringResume } from "./useTutoringRecorder";

/**
 * `source` says where an entered cube came from (a scan); it defaults to
 * `manual` for entered cubes and `scramble` for the demo.
 */
export function TutorScreen({
  lesson,
  source,
  resume,
}: {
  lesson: Lesson;
  source?: SessionSource;
  resume?: TutoringResume;
}) {
  const [start] = useState(() =>
    lesson.start ? fromFacelets(lesson.start) : applyMoves(solvedState(), lesson.scramble),
  );
  const [session] = useState<NewTutoringSession>(() => ({
    startFacelets: lesson.start ?? toFacelets(start),
    source: source ?? (lesson.start ? "manual" : "scramble"),
    moves: lesson.steps.map((s) => s.move),
    stageEnds: stageEnds(lesson.steps),
  }));
  // Fixed on first render, like `session` (the recorder must not restart).
  const [resumeAt] = useState(resume);
  // The cube store starts with the cube held the way the solve holds it.
  const [held] = useState(() => applyMoves(start, lesson.hold ?? []));
  // The drawer's expand button trades cube room for text: 30/70 instead of 60/40.
  const [expanded, setExpanded] = useState(false);
  return (
    <CubeStoreProvider initial={held} moves={session.moves} step={resumeAt?.stepsCompleted}>
      <RecordSession session={session} resume={resumeAt} />
      <main className="relative h-dvh overflow-hidden">
        <section aria-label="Cube" className={`flex flex-col ${expanded ? "h-[30dvh]" : "h-[60dvh]"}`}>
          <header className="flex min-h-14 items-center justify-between gap-2 px-4 pt-2">
            <Link href="/" className="flex min-h-11 shrink-0 items-center font-semibold">
              Roux Tutor
            </Link>
            <div className="flex items-center gap-2">
              {lesson.start && (
                <Link
                  href={editorHref(lesson.start, session.source)}
                  className="flex min-h-11 items-center px-1 text-sm font-medium text-zinc-600 underline underline-offset-2 dark:text-zinc-400"
                >
                  Edit cube
                </Link>
              )}
              <SaveCubeButton facelets={session.startFacelets} source={session.source} />
              <AuthButton compact />
            </div>
          </header>
          <div className="min-h-0 flex-1">
            <CubeView caption={lesson.hold && <HoldHint />} />
          </div>
        </section>
        <TutorDrawer lesson={lesson} expanded={expanded} onExpandedChange={setExpanded} />
      </main>
    </CubeStoreProvider>
  );
}

/**
 * How to hold the cube, under the cube view. It follows the cube: red front
 * and white bottom while the middle slice is straight; once M or r turns the
 * middle centers, the left and right centers and the blocks' white side down
 * (what a Roux solver holds the cube by).
 */
function HoldHint() {
  const straight = useCubeStore((s) => holdCentersStraight(s.facelets));
  const side = (color: StickerColor, where: string) => (
    <span className="flex items-center gap-1.5">
      <span
        className="inline-block size-3 shrink-0 rounded-sm border border-zinc-400 dark:border-zinc-600"
        style={{ backgroundColor: STICKER_HEX[color] }}
      />
      <span className="capitalize">{color}</span> {where}
    </span>
  );
  return (
    <p className="flex min-h-11 flex-col justify-center text-sm text-zinc-600 dark:text-zinc-400">
      <span className="sr-only">Hold the cube: {straight ? HOLD_TEXT : HOLD_TURNED_TEXT}.</span>
      <span aria-hidden="true" className="flex items-center gap-3">
        {straight ? side(HOLD.F, "front") : side(HOLD.L, "left")}
        {straight ? side(HOLD.D, "bottom") : side(HOLD.R, "right")}
      </span>
      {!straight && (
        <span aria-hidden="true" className="text-xs leading-tight">
          Blocks: {HOLD.D} side down
        </span>
      )}
    </p>
  );
}

function RecordSession({ session, resume }: { session: NewTutoringSession; resume?: TutoringResume }) {
  useTutoringRecorder(session, resume);
  return null;
}
