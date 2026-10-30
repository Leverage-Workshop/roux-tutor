// Placeholder landing page until the scanner and tutor screens exist.
import Link from "next/link";
import { AuthButton } from "@/components/AuthButton";

const FACE_COLORS = [
  "bg-white",
  "bg-red-500",
  "bg-blue-500",
  "bg-orange-500",
  "bg-green-500",
  "bg-yellow-400",
  "bg-blue-500",
  "bg-white",
  "bg-red-500",
];

const STAGES = [
  { name: "First Block", detail: "Build a 1x2x3 block on the left." },
  { name: "Second Block", detail: "Build the matching block on the right." },
  { name: "CMLL", detail: "Solve the four top corners." },
  { name: "Last Six Edges", detail: "Finish with only U and M moves." },
];

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center gap-10 px-6 pt-4 pb-16 text-center">
      <header className="flex min-h-11 w-full justify-end">
        <AuthButton />
      </header>
      <div
        aria-hidden="true"
        className="grid grid-cols-3 gap-1.5 rounded-xl bg-zinc-900 p-1.5 shadow-lg"
      >
        {FACE_COLORS.map((color, i) => (
          <div key={i} className={`size-12 rounded-md ${color}`} />
        ))}
      </div>

      <div className="flex flex-col gap-3">
        <h1 className="text-4xl font-bold tracking-tight">Roux Tutor</h1>
        <p className="text-lg text-zinc-600 dark:text-zinc-400">
          Learn to solve a Rubik&apos;s Cube with the Roux method, one
          explained move at a time.
        </p>
        <p className="mx-auto rounded-full bg-zinc-100 px-4 py-1 text-sm font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
          Coming soon
        </p>
        <Link
          href="/tutor"
          className="mx-auto mt-2 flex min-h-12 items-center rounded-full bg-foreground px-6 font-semibold text-background"
        >
          Try a demo solve
        </Link>
        <Link
          href="/scan"
          className="mx-auto flex min-h-12 items-center rounded-full border border-zinc-300 px-6 font-semibold dark:border-zinc-700"
        >
          Scan your cube
        </Link>
        <Link
          href="/enter"
          className="mx-auto flex min-h-12 items-center rounded-full border border-zinc-300 px-6 font-semibold dark:border-zinc-700"
        >
          Enter your cube
        </Link>
      </div>

      <ol className="flex w-full flex-col gap-3 text-left">
        {STAGES.map((stage, i) => (
          <li
            key={stage.name}
            className="flex items-start gap-4 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800"
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-foreground font-semibold text-background">
              {i + 1}
            </span>
            <div>
              <h2 className="font-semibold">{stage.name}</h2>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                {stage.detail}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </main>
  );
}
