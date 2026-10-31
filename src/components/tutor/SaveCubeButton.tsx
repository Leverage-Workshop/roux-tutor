"use client";
// Bookmark button in the tutor header: saves the cube being solved to the
// signed-in user's cubes (see /progress), or removes it again. Hidden when
// signed out.
import { useEffect, useState } from "react";
import { useSupabaseUser } from "@/lib/supabase/useSupabaseUser";
import { isScrambleSaved, saveScramble, unsaveScramble } from "@/lib/supabase/savedScrambles";
import type { SessionSource } from "@/lib/supabase/tutoringSessions";

export function SaveCubeButton({ facelets, source }: { facelets: string; source: SessionSource }) {
  const { supabase, user } = useSupabaseUser();
  const userId = user?.id;
  // undefined until we know whether this cube is already saved.
  const [saved, setSaved] = useState<boolean | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    if (!supabase || !userId) return;
    let live = true;
    isScrambleSaved(supabase, facelets).then(
      (isSaved) => live && setSaved(isSaved),
      () => live && setSaved(false),
    );
    return () => {
      live = false;
    };
  }, [supabase, userId, facelets]);

  if (!supabase || !user || saved === undefined) return null;

  const toggle = async () => {
    setBusy(true);
    try {
      if (saved) {
        await unsaveScramble(supabase, facelets);
        setSaved(false);
        setStatus("Removed from your cubes");
      } else {
        await saveScramble(supabase, facelets, source);
        setSaved(true);
        setStatus("Saved to your cubes");
      }
    } catch {
      setStatus(saved ? "Couldn't remove this cube. Try again." : "Couldn't save this cube. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={toggle}
        disabled={busy}
        aria-pressed={saved}
        aria-label="Save this cube"
        className="flex size-11 shrink-0 items-center justify-center rounded-full disabled:opacity-50 active:bg-zinc-100 dark:active:bg-zinc-800"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" className="size-6" strokeWidth={2} stroke="currentColor" strokeLinejoin="round" fill={saved ? "currentColor" : "none"}>
          <path d="M6 3.5h12a1 1 0 0 1 1 1V21l-7-4.5L5 21V4.5a1 1 0 0 1 1-1Z" />
        </svg>
      </button>
      <span role="status" className="sr-only">
        {status}
      </span>
    </>
  );
}
