// The signed-in user's progress: solve totals, how many solves got through
// each Roux stage, saved cubes and recent solves.
import Link from "next/link";
import type { SavedScramble } from "@/lib/supabase/savedScrambles";
import type { SessionSource, TutoringSession, TutoringStats } from "@/lib/supabase/tutoringSessions";
import { ROUX_STAGES, stageInProgress } from "@/lib/tutor/lesson";
import { tutorHref } from "@/lib/tutor/links";
import { LocalDate } from "./LocalDate";
import { SavedCubes } from "./SavedCubes";
import { SOURCE_LABEL } from "./labels";

export function ProgressView({
  stats,
  savedCubes,
  sessions,
}: {
  stats: TutoringStats;
  savedCubes: SavedScramble[];
  sessions: TutoringSession[];
}) {
  return (
    <div className="flex flex-col gap-8">
      <section aria-labelledby="totals" className="flex flex-col gap-3">
        <h2 id="totals" className="sr-only">
          Totals
        </h2>
        <dl className="grid grid-cols-2 gap-3">
          <Stat label="Solves started" value={stats.solvesStarted} />
          <Stat label="Solves finished" value={stats.solvesFinished} />
        </dl>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {stats.movesStepped === 1 ? "1 move" : `${stats.movesStepped} moves`} stepped through in total.
        </p>
      </section>

      <section aria-labelledby="by-stage" className="flex flex-col gap-3">
        <h2 id="by-stage" className="text-lg font-semibold">
          By stage
        </h2>
        {stats.stagedSolves === 0 ? (
          <p className="text-zinc-600 dark:text-zinc-400">
            Step through a solve while signed in, and this shows how many of your solves got through each stage.
          </p>
        ) : (
          <ol className="flex flex-col gap-3">
            {ROUX_STAGES.map((stage, i) => {
              const done = stats.stagesDone[i];
              const percent = Math.round((done / stats.stagedSolves) * 100);
              return (
                <li key={stage.id} className="flex flex-col gap-1.5">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="font-medium">{stage.name}</span>
                    <span className="text-sm text-zinc-600 dark:text-zinc-400">
                      {done} of {stats.stagedSolves} {stats.stagedSolves === 1 ? "solve" : "solves"}
                    </span>
                  </div>
                  <div
                    role="progressbar"
                    aria-label={`${stage.name} finished`}
                    aria-valuemin={0}
                    aria-valuemax={stats.stagedSolves}
                    aria-valuenow={done}
                    aria-valuetext={`${done} of ${stats.stagedSolves}`}
                    className="h-2.5 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800"
                  >
                    <div className="h-full rounded-full bg-foreground" style={{ width: `${percent}%` }} />
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      <section aria-labelledby="saved" className="flex flex-col gap-3">
        <h2 id="saved" className="text-lg font-semibold">
          Saved cubes
        </h2>
        <SavedCubes initial={savedCubes} />
      </section>

      <section aria-labelledby="recent" className="flex flex-col gap-3">
        <h2 id="recent" className="text-lg font-semibold">
          Recent solves
        </h2>
        {sessions.length === 0 ? (
          <p className="text-zinc-600 dark:text-zinc-400">
            No solves yet.{" "}
            <Link href="/tutor" className="font-medium underline underline-offset-2">
              Try the demo solve
            </Link>{" "}
            to get started.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {sessions.map((session) => (
              <SessionRow key={session.id} session={session} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col-reverse gap-1 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
      <dt className="text-sm text-zinc-600 dark:text-zinc-400">{label}</dt>
      <dd className="text-3xl font-bold tabular-nums">{value}</dd>
    </div>
  );
}

/** "Finished", "Working on Second Block" or, for old rows without stages, nothing. */
export function sessionStatus(session: Pick<TutoringSession, "completed_at" | "stage_ends" | "steps_completed">): string {
  if (session.completed_at) return "Finished";
  if (session.stage_ends.length !== ROUX_STAGES.length) return "Not finished";
  const stage = stageInProgress(session.stage_ends, session.steps_completed);
  return stage ? `Working on ${stage.name}` : "Finished";
}

/** Unfinished solves can be continued where they stopped. */
function canContinue(session: TutoringSession): boolean {
  return session.completed_at === null && session.steps_completed < session.moves.length;
}

function SessionRow({ session }: { session: TutoringSession }) {
  const source = session.source as SessionSource;
  const resumable = canContinue(session);
  return (
    <li className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">
      <div className="flex min-w-0 flex-col">
        <span className="font-medium">{sessionStatus(session)}</span>
        <span className="text-sm text-zinc-600 dark:text-zinc-400">
          {session.steps_completed} of {session.moves.length} moves · {SOURCE_LABEL[source] ?? "Cube"} ·{" "}
          <LocalDate iso={session.started_at} />
        </span>
      </div>
      {resumable ? (
        <Link
          href={`/tutor?session=${session.id}`}
          className="flex min-h-11 shrink-0 items-center rounded-full bg-foreground px-4 text-sm font-semibold text-background"
        >
          Continue
        </Link>
      ) : (
        <Link
          href={tutorHref(session.start_facelets, source)}
          className="flex min-h-11 shrink-0 items-center rounded-full border border-zinc-300 px-4 text-sm font-semibold dark:border-zinc-700"
        >
          Solve again
        </Link>
      )}
    </li>
  );
}
