import { Suspense } from "react";
import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { TutorScreen } from "@/components/tutor/TutorScreen";
import { lessonForCube } from "@/lib/tutor/cubeLesson";

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
// the facelet editor; without it the page plays the demo scramble.
export default function TutorPage({ searchParams }: PageProps<"/tutor">) {
  return (
    <Suspense fallback={<SolvingScreen />}>
      {searchParams.then(({ cube }) => (
        <TutorForCube cube={cube} />
      ))}
    </Suspense>
  );
}

function TutorForCube({ cube }: { cube: string | string[] | undefined }) {
  const result = lessonForCube(cube);
  if ("error" in result) {
    return <Message title="This cube can't be solved" text={result.error} editHref={result.editHref} />;
  }
  return <TutorScreen key={result.lesson.start ?? "demo"} lesson={result.lesson} />;
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

function Message({ title, text, editHref }: { title: string; text: string; editHref: string }) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 px-6 pt-2 pb-8">
      <header className="flex min-h-14 items-center">
        <Link href="/" className="flex min-h-11 items-center font-semibold">
          Roux Tutor
        </Link>
      </header>
      <h1 className="text-2xl font-bold">{title}</h1>
      <p className="text-zinc-700 dark:text-zinc-300">{text}</p>
      <Link
        href={editHref}
        className="flex min-h-12 items-center justify-center rounded-full bg-foreground px-6 font-semibold text-background"
      >
        Fix it in the editor
      </Link>
      <Link href="/tutor" className="flex min-h-12 items-center justify-center rounded-full border border-zinc-300 px-6 font-semibold dark:border-zinc-700">
        Watch the demo solve
      </Link>
    </main>
  );
}
