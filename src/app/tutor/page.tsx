import { Suspense } from "react";
import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { AuthButton } from "@/components/AuthButton";
import { TutorScreen } from "@/components/tutor/TutorScreen";
import { createClient } from "@/lib/supabase/server";
import { getTutoringSession, type SessionSource } from "@/lib/supabase/tutoringSessions";
import { lessonForCube } from "@/lib/tutor/cubeLesson";
import { sourceFromParam } from "@/lib/tutor/links";
import { lessonForSession } from "@/lib/tutor/sessionLesson";

export const metadata: Metadata = {
  title: "Tutor · Roux Tutor",
  description: "Step through a Roux solve one explained move at a time.",
};

// "cover" lets the drawer pad itself clear of the iPhone home indicator.
export const viewport: Viewport = {
  viewportFit: "cover",
};

// A Server Component: the solve (and its explanations) is worked out on the
// server and only the finished lesson is sent to the browser, so the solver
// never ships to phones. `/tutor?cube=<54 facelet letters>` solves a cube from
// the facelet editor (`&from=scan` when it was scanned); without it the page
// plays the demo scramble. `/tutor?session=<id>` continues one of the
// signed-in user's saved solves (the tutor switches to this link once a solve
// is saved, so a refresh continues it too).
export default function TutorPage({ searchParams }: PageProps<"/tutor">) {
  return (
    <Suspense fallback={<SolvingScreen />}>
      {searchParams.then(({ cube, from, session }) =>
        typeof session === "string" ? (
          <TutorForSession id={session} />
        ) : (
          <TutorForCube cube={cube} source={sourceFromParam(from)} />
        ),
      )}
    </Suspense>
  );
}

// Reads the session cookie, so only this branch is per-user.
async function TutorForSession({ id }: { id: string }) {
  const supabase = await createClient();
  const row = supabase ? await getTutoringSession(supabase, id).catch(() => null) : null;
  const result = row && lessonForSession(row);
  if (!result) {
    return (
      <Message
        title="Can't find this solve"
        text="Saved solves open only for the account that made them. Sign in with that Google account (top right), or start a new solve."
        signIn
      />
    );
  }
  return (
    <TutorScreen
      key={result.resume?.id ?? result.lesson.start}
      lesson={result.lesson}
      source={result.source}
      resume={result.resume}
    />
  );
}

function TutorForCube({ cube, source }: { cube: string | string[] | undefined; source?: SessionSource }) {
  const result = lessonForCube(cube);
  if ("error" in result) {
    return <Message title="This cube can't be solved" text={result.error} editHref={result.editHref} />;
  }
  return <TutorScreen key={result.lesson.start ?? "demo"} lesson={result.lesson} source={source} />;
}

// The static shell, shown while the server works out the solve (a few
// milliseconds, ~0.3s on a cold server).
function SolvingScreen() {
  return (
    <main className="flex h-dvh flex-col">
      <header className="flex min-h-14 items-center px-4 pt-2 font-semibold">Roux Tutor</header>
      <p role="status" className="m-auto text-zinc-600 dark:text-zinc-400">
        Working out the solve…
      </p>
    </main>
  );
}

function Message({
  title,
  text,
  editHref,
  signIn = false,
}: {
  title: string;
  text: string;
  /** Offer the facelet editor with this draft. */
  editHref?: string;
  /** Show the sign-in button in the header. */
  signIn?: boolean;
}) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 px-6 pt-2 pb-8">
      <header className="flex min-h-14 items-center justify-between gap-3">
        <Link href="/" className="flex min-h-11 shrink-0 items-center font-semibold">
          Roux Tutor
        </Link>
        {signIn && <AuthButton />}
      </header>
      <h1 className="text-2xl font-bold">{title}</h1>
      <p className="text-zinc-700 dark:text-zinc-300">{text}</p>
      {editHref && (
        <Link
          href={editHref}
          className="flex min-h-12 items-center justify-center rounded-full bg-foreground px-6 font-semibold text-background"
        >
          Fix it in the editor
        </Link>
      )}
      <Link href="/tutor" className="flex min-h-12 items-center justify-center rounded-full border border-zinc-300 px-6 font-semibold dark:border-zinc-700">
        Watch the demo solve
      </Link>
    </main>
  );
}
