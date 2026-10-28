"use client";
// Persistent bottom sheet (bottom 40% of the screen): stage indicator, step
// counter, the next move in large notation, tutorial text, and Back / Next
// buttons sized for one thumb.
//
// A plain section, not a Vaul drawer: the sheet never opens, closes or drags,
// and Vaul 1.1.2 ignores modal={false}, so its Radix dialog would hide the cube
// view from screen readers and trap keyboard focus in the sheet.
import { useCubeStore } from "@/lib/cube/CubeStoreProvider";
import { ROUX_STAGES, stageById, type Lesson, type RouxStageId } from "@/lib/tutor/lesson";

export function TutorDrawer({ lesson }: { lesson: Lesson }) {
  const stepIndex = useCubeStore((s) => s.stepIndex);
  const next = useCubeStore((s) => s.next);
  const back = useCubeStore((s) => s.back);

  const total = lesson.steps.length;
  const finished = stepIndex >= total;
  const step = finished ? null : lesson.steps[stepIndex];
  const stage = step ? stageById(step.stage) : null;
  const stageMoves = step ? lesson.steps.map((s, i) => ({ ...s, i })).filter((s) => s.stage === step.stage) : [];

  return (
    <section
      aria-labelledby="tutor-stage"
      className="fixed inset-x-0 bottom-0 z-10 mx-auto flex h-[40dvh] max-w-md flex-col gap-3 [@media(max-height:700px)]:gap-2 rounded-t-3xl border-t border-zinc-200 bg-white px-4 pt-3 shadow-[0_-8px_24px_rgba(0,0,0,0.08)] dark:border-zinc-800 dark:bg-zinc-900"
      style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
    >
      <StageIndicator current={step?.stage ?? null} />

      <div className="flex items-baseline justify-between gap-2">
        <h2 id="tutor-stage" className="text-base font-semibold">
          {stage ? stage.name : "Solved"}
        </h2>
        <p aria-live="polite" className="text-sm text-zinc-600 tabular-nums dark:text-zinc-400">
          {finished ? `All ${total} moves played` : `Move ${stepIndex + 1} of ${total}`}
        </p>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
        <div className="flex items-center gap-4">
          <p className="min-w-[2.5ch] text-5xl leading-none font-bold tracking-tight [@media(max-height:700px)]:text-4xl">
            {step ? (
              <>
                <span className="sr-only">Next move: </span>
                {step.move}
              </>
            ) : (
              <span aria-hidden="true">✓</span>
            )}
          </p>
          {stageMoves.length > 0 && (
            <ol aria-label="Moves in this stage" className="flex flex-wrap gap-x-1.5 gap-y-1 text-base font-medium">
              {stageMoves.map((s) => (
                <li
                  key={s.i}
                  aria-current={s.i === stepIndex ? "step" : undefined}
                  className={
                    s.i === stepIndex
                      ? "rounded bg-foreground px-1 font-bold text-background"
                      : s.i < stepIndex
                        ? "px-1 text-zinc-400 dark:text-zinc-500"
                        : "px-1"
                  }
                >
                  {s.move}
                </li>
              ))}
            </ol>
          )}
        </div>
        <p className="text-base text-zinc-700 dark:text-zinc-300 [@media(max-height:700px)]:text-sm">
          {step
            ? (step.explanation ?? stage?.goal)
            : "The cube is solved. Step back through any stage to see it again."}
        </p>
      </div>

      <div className="grid grid-cols-[1fr_2fr] gap-3">
        <button
          type="button"
          onClick={back}
          disabled={stepIndex === 0}
          className="h-16 rounded-2xl border [@media(max-height:700px)]:h-14 border-zinc-300 text-lg font-semibold active:bg-zinc-100 disabled:opacity-40 dark:border-zinc-700 dark:active:bg-zinc-800"
        >
          Back
        </button>
        <button
          type="button"
          onClick={next}
          disabled={finished}
          className="h-16 rounded-2xl bg-foreground [@media(max-height:700px)]:h-14 text-lg font-semibold text-background active:opacity-80 disabled:opacity-40"
        >
          Next move
        </button>
      </div>
    </section>
  );
}

function StageIndicator({ current }: { current: RouxStageId | null }) {
  const currentIndex = current ? ROUX_STAGES.findIndex((s) => s.id === current) : ROUX_STAGES.length;
  return (
    <ol aria-label="Roux stages" className="grid grid-cols-4 gap-1.5">
      {ROUX_STAGES.map((s, i) => {
        const state = i < currentIndex ? "done" : i === currentIndex ? "current" : "upcoming";
        return (
          <li
            key={s.id}
            aria-current={state === "current" ? "step" : undefined}
            title={s.name}
            className={`flex flex-col items-center gap-1 text-xs font-semibold ${
              state === "upcoming" ? "text-zinc-400 dark:text-zinc-500" : ""
            }`}
          >
            <span
              aria-hidden="true"
              className={`h-1.5 w-full rounded-full ${
                state === "upcoming" ? "bg-zinc-200 dark:bg-zinc-800" : state === "done" ? "bg-zinc-400 dark:bg-zinc-500" : "bg-foreground"
              }`}
            />
            <span>
              {s.short}
              <span className="sr-only">{state === "done" ? " (done)" : state === "current" ? " (current)" : ""}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
