"use client";
// Tutor viewport: cube view in the top 60% of the screen, persistent drawer in
// the bottom 40%. Both read the same cube store.
import { useState } from "react";
import Link from "next/link";
import { AuthButton } from "@/components/AuthButton";
import { CubeStoreProvider } from "@/lib/cube/CubeStoreProvider";
import { applyMoves, solvedState } from "@/lib/cube/model";
import type { Lesson } from "@/lib/tutor/lesson";
import { CubeNet } from "./CubeNet";
import { TutorDrawer } from "./TutorDrawer";

export function TutorScreen({ lesson }: { lesson: Lesson }) {
  const [start] = useState(() => applyMoves(solvedState(), lesson.scramble));
  return (
    <CubeStoreProvider initial={start} moves={lesson.steps.map((s) => s.move)}>
      <main className="relative h-dvh overflow-hidden">
        <section aria-label="Cube" className="flex h-[60dvh] flex-col">
          <header className="flex min-h-14 items-center justify-between gap-2 px-4 pt-2">
            <Link href="/" className="flex min-h-11 items-center font-semibold">
              Roux Tutor
            </Link>
            <AuthButton />
          </header>
          <div className="flex min-h-0 flex-1 items-center justify-center px-4 pb-4">
            <CubeNet />
          </div>
        </section>
        <TutorDrawer lesson={lesson} />
      </main>
    </CubeStoreProvider>
  );
}
