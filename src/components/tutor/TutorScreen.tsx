"use client";
// Tutor viewport: cube view in the top 60% of the screen, persistent drawer in
// the bottom 40%. Both read the same cube store. For signed-in users the solve
// is saved as a tutoring session as they step through it, and the header's
// bookmark saves the cube.
import { useState } from "react";
import Link from "next/link";
import { AuthButton } from "@/components/AuthButton";
import { CubeStoreProvider } from "@/lib/cube/CubeStoreProvider";
import { applyMoves, fromFacelets, solvedState, toFacelets } from "@/lib/cube/model";
import type { NewTutoringSession, SessionSource } from "@/lib/supabase/tutoringSessions";
import { stageEnds, type Lesson } from "@/lib/tutor/lesson";
import { editorHref } from "@/lib/tutor/links";
import { CubeView } from "./CubeView";
import { SaveCubeButton } from "./SaveCubeButton";
import { TutorDrawer } from "./TutorDrawer";
import { useTutoringRecorder } from "./useTutoringRecorder";

/**
 * `source` says where an entered cube came from (a scan); it defaults to
 * `manual` for entered cubes and `scramble` for the demo.
 */
export function TutorScreen({ lesson, source }: { lesson: Lesson; source?: SessionSource }) {
  const [start] = useState(() =>
    lesson.start ? fromFacelets(lesson.start) : applyMoves(solvedState(), lesson.scramble),
  );
  const [session] = useState<NewTutoringSession>(() => ({
    startFacelets: lesson.start ?? toFacelets(start),
    source: source ?? (lesson.start ? "manual" : "scramble"),
    moves: lesson.steps.map((s) => s.move),
    stageEnds: stageEnds(lesson.steps),
  }));
  return (
    <CubeStoreProvider initial={start} moves={session.moves}>
      <RecordSession session={session} />
      <main className="relative h-dvh overflow-hidden">
        <section aria-label="Cube" className="flex h-[60dvh] flex-col">
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
            <CubeView />
          </div>
        </section>
        <TutorDrawer lesson={lesson} />
      </main>
    </CubeStoreProvider>
  );
}

function RecordSession({ session }: { session: NewTutoringSession }) {
  useTutoringRecorder(session);
  return null;
}
