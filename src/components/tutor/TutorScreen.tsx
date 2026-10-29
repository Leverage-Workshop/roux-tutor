"use client";
// Tutor viewport: cube view in the top 60% of the screen, persistent drawer in
// the bottom 40%. Both read the same cube store.
import { useState } from "react";
import Link from "next/link";
import { AuthButton } from "@/components/AuthButton";
import { CubeStoreProvider } from "@/lib/cube/CubeStoreProvider";
import { applyMoves, fromFacelets, solvedState } from "@/lib/cube/model";
import type { Lesson } from "@/lib/tutor/lesson";
import { CubeView } from "./CubeView";
import { TutorDrawer } from "./TutorDrawer";

export function TutorScreen({ lesson }: { lesson: Lesson }) {
  const [start] = useState(() =>
    lesson.start ? fromFacelets(lesson.start) : applyMoves(solvedState(), lesson.scramble),
  );
  return (
    <CubeStoreProvider initial={start} moves={lesson.steps.map((s) => s.move)}>
      <main className="relative h-dvh overflow-hidden">
        <section aria-label="Cube" className="flex h-[60dvh] flex-col">
          <header className="flex min-h-14 items-center justify-between gap-2 px-4 pt-2">
            <Link href="/" className="flex min-h-11 items-center font-semibold">
              Roux Tutor
            </Link>
            <div className="flex items-center gap-3">
              {lesson.start && (
                <Link
                  href={`/enter?cube=${lesson.start}`}
                  className="flex min-h-11 items-center text-sm font-medium text-zinc-600 underline underline-offset-2 dark:text-zinc-400"
                >
                  Edit cube
                </Link>
              )}
              <AuthButton />
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
