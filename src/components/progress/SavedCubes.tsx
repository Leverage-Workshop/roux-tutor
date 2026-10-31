"use client";
// The user's saved cubes, each with a preview, a link to solve it and a
// Remove button.
import { useState } from "react";
import Link from "next/link";
import { FaceletNet } from "@/components/FaceletNet";
import { createClient } from "@/lib/supabase/client";
import { deleteSavedScramble, type SavedScramble } from "@/lib/supabase/savedScrambles";
import type { SessionSource } from "@/lib/supabase/tutoringSessions";
import { tutorHref } from "@/lib/tutor/links";
import { LocalDate } from "./LocalDate";
import { SOURCE_LABEL } from "./labels";

export function SavedCubes({ initial }: { initial: SavedScramble[] }) {
  const [supabase] = useState(createClient);
  const [cubes, setCubes] = useState(initial);
  const [removing, setRemoving] = useState<string | null>(null);
  const [error, setError] = useState("");

  if (cubes.length === 0) {
    return (
      <p className="text-zinc-600 dark:text-zinc-400">
        No saved cubes yet. Tap the bookmark at the top of the tutor screen to save the cube you&apos;re solving.
      </p>
    );
  }

  const remove = async (cube: SavedScramble) => {
    if (!supabase) return;
    setRemoving(cube.id);
    setError("");
    try {
      await deleteSavedScramble(supabase, cube.id);
      setCubes((list) => list.filter((c) => c.id !== cube.id));
    } catch {
      setError("Couldn't remove that cube. Try again.");
    } finally {
      setRemoving(null);
    }
  };

  return (
    <>
      <ul className="flex flex-col gap-3">
        {cubes.map((cube, i) => {
          const label = SOURCE_LABEL[cube.source as SessionSource] ?? "Cube";
          return (
            <li key={cube.id} className="flex items-center gap-3 rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">
              <FaceletNet facelets={cube.facelets} small label={`Cube ${i + 1}, flat map`} className="w-20 shrink-0" />
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  {label} · saved <LocalDate iso={cube.created_at} />
                </p>
                <div className="flex gap-2">
                  <Link
                    href={tutorHref(cube.facelets, cube.source as SessionSource)}
                    className="flex min-h-11 items-center rounded-full bg-foreground px-4 text-sm font-semibold text-background"
                  >
                    Solve
                  </Link>
                  <button
                    type="button"
                    onClick={() => remove(cube)}
                    disabled={removing === cube.id}
                    aria-label={`Remove cube ${i + 1}`}
                    className="min-h-11 rounded-full border border-zinc-300 px-4 text-sm font-medium disabled:opacity-50 dark:border-zinc-700"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      {error && (
        <p role="alert" className="text-sm text-red-700 dark:text-red-400">
          {error}
        </p>
      )}
    </>
  );
}
