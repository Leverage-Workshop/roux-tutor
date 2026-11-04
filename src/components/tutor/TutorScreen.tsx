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
import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { setCornersMethod } from "@/app/tutor/actions";
import { AuthButton } from "@/components/AuthButton";
import { CubeStoreProvider, useCubeStore, useCubeStoreApi } from "@/lib/cube/CubeStoreProvider";
import { STICKER_HEX, applyMoves, fromFacelets, solvedState, toFacelets, type StickerColor } from "@/lib/cube/model";
import type { NewTutoringSession, SessionSource } from "@/lib/supabase/tutoringSessions";
import { HOLD, HOLD_TEXT, HOLD_TURNED_TEXT, holdCentersStraight } from "@/lib/tutor/hold";
import { stageEnds, type Lesson } from "@/lib/tutor/lesson";
import type { CmllMethod } from "@/lib/tutor/corners";
import { editorHref, tutorHref } from "@/lib/tutor/links";
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

  // Switching how the corners are solved re-solves the cube on the server. The
  // blocks come out the same, so the new lesson opens where the user was, or
  // at the start of the corners if they were past the blocks.
  const router = useRouter();
  const [switchingCorners, startSwitch] = useTransition();
  const switchCorners = (corners: CmllMethod, stepIndex: number) => {
    if (corners === lesson.corners) return;
    const blocksEnd = lesson.steps.findIndex((s) => s.stage === "cmll" || s.stage === "lse");
    carryStep(lessonKey(lesson, corners), Math.min(stepIndex, blocksEnd === -1 ? lesson.steps.length : blocksEnd));
    startSwitch(async () => {
      // The action re-renders this page with the new solve; a saved-session
      // link (/tutor?session=) would keep the old one, so leave it for the cube's link.
      await setCornersMethod(corners);
      const href = lesson.start ? tutorHref(lesson.start, session.source) : "/tutor";
      if (window.location.pathname + window.location.search !== href) router.replace(href);
    });
  };

  return (
    <CubeStoreProvider initial={held} moves={session.moves} step={resumeAt?.stepsCompleted}>
      {!resumeAt && <ApplyCarriedStep lessonKey={lessonKey(lesson, lesson.corners)} />}
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
        <TutorDrawer
          lesson={lesson}
          expanded={expanded}
          onExpandedChange={setExpanded}
          onCornersChange={lesson.corners ? switchCorners : undefined}
          switchingCorners={switchingCorners}
        />
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

// The step to open a re-solved lesson at, handed over in sessionStorage
// across the page update: only to that lesson and only for a few seconds,
// since the page may mount it more than once on the way (action, then link).
const CARRY_KEY = "roux-tutor:carry-step";
const lessonKey = (lesson: Lesson, corners: CmllMethod | undefined) => `${lesson.start ?? "demo"}-${corners}`;

function carryStep(key: string, step: number) {
  try {
    sessionStorage.setItem(CARRY_KEY, JSON.stringify({ key, step, at: Date.now() }));
  } catch {
    // Storage blocked: the new lesson starts at move 1.
  }
}

function takeCarriedStep(key: string): number | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = sessionStorage.getItem(CARRY_KEY);
    if (!raw) return undefined;
    const carry = JSON.parse(raw) as { key?: string; step?: number; at?: number };
    if (carry.key !== key) return undefined;
    return typeof carry.step === "number" && Date.now() - (carry.at ?? 0) < 15_000 ? carry.step : undefined;
  } catch {
    return undefined;
  }
}

/** After a corners switch, jump to the move the user was on (after mount, so hydration matches the server). */
function ApplyCarriedStep({ lessonKey }: { lessonKey: string }) {
  const store = useCubeStoreApi();
  useEffect(() => {
    const step = takeCarriedStep(lessonKey);
    if (step) store.getState().goTo(step);
  }, [store, lessonKey]);
  return null;
}

function RecordSession({ session, resume }: { session: NewTutoringSession; resume?: TutoringResume }) {
  useTutoringRecorder(session, resume);
  return null;
}
