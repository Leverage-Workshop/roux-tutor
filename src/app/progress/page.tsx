import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { AuthButton } from "@/components/AuthButton";
import { ProgressView } from "@/components/progress/ProgressView";
import { listSavedScrambles } from "@/lib/supabase/savedScrambles";
import { createClient } from "@/lib/supabase/server";
import { getTutoringStats, listTutoringSessions } from "@/lib/supabase/tutoringSessions";

export const metadata: Metadata = {
  title: "Your progress · Roux Tutor",
  description: "Your saved cubes and how far your Roux solves got, stage by stage.",
};

// The header and title are the static shell; the user's data is read per
// request (it depends on the session cookie) and streams in.
export default function ProgressPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-6 px-4 pt-2 pb-12">
      <header className="flex min-h-14 items-center justify-between gap-3">
        <Link href="/" className="flex min-h-11 shrink-0 items-center font-semibold">
          Roux Tutor
        </Link>
        <AuthButton />
      </header>
      <h1 className="text-3xl font-bold tracking-tight">Your progress</h1>
      <Suspense
        fallback={
          <p role="status" className="text-zinc-600 dark:text-zinc-400">
            Loading your progress…
          </p>
        }
      >
        <ProgressContent />
      </Suspense>
    </main>
  );
}

async function ProgressContent() {
  const supabase = await createClient();
  if (!supabase) {
    return <Note text="Accounts aren't set up on this copy of Roux Tutor, so there's no progress to show." />;
  }
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) {
    return (
      <Note text="Sign in with Google (top right) to save cubes and see how far your solves get, stage by stage. The tutor works without an account too." />
    );
  }
  const loaded = await Promise.all([
    getTutoringStats(supabase),
    listSavedScrambles(supabase),
    listTutoringSessions(supabase, 10),
  ]).catch((error: unknown) => {
    console.error("Couldn't load progress", error);
    return null;
  });
  if (!loaded) return <Note text="Couldn't load your progress just now. Refresh the page to try again." />;
  const [stats, savedCubes, sessions] = loaded;
  return <ProgressView stats={stats} savedCubes={savedCubes} sessions={sessions} />;
}

function Note({ text }: { text: string }) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-zinc-700 dark:text-zinc-300">{text}</p>
      <Link
        href="/tutor"
        className="flex min-h-12 items-center justify-center rounded-full bg-foreground px-6 font-semibold text-background"
      >
        Try a demo solve
      </Link>
    </div>
  );
}
