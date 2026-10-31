"use client";
// Saves the solve on screen as a tutoring session while a signed-in user steps
// through it (see SessionRecorder for when rows are written). Does nothing when
// signed out or when Supabase is not configured.
import { useEffect } from "react";
import { useCubeStoreApi } from "@/lib/cube/CubeStoreProvider";
import { useSupabaseUser } from "@/lib/supabase/useSupabaseUser";
import {
  completeTutoringSession,
  saveTutoringProgress,
  startTutoringSession,
  type NewTutoringSession,
} from "@/lib/supabase/tutoringSessions";
import { SessionRecorder } from "@/lib/tutor/sessionRecorder";

/** `session` must keep the same identity for the life of the screen. */
export function useTutoringRecorder(session: NewTutoringSession): void {
  const { supabase, user } = useSupabaseUser();
  const userId = user?.id;
  const store = useCubeStoreApi();

  useEffect(() => {
    if (!supabase || !userId || session.moves.length === 0) return;
    const recorder = new SessionRecorder(
      {
        start: () => startTutoringSession(supabase, session),
        progress: (id, steps) => saveTutoringProgress(supabase, id, steps),
        complete: (id, steps) => completeTutoringSession(supabase, id, steps),
      },
      session.moves.length,
      { onError: (error) => console.warn("Couldn't save the tutoring session", error) },
    );
    // Moves stepped through before sign-in finished loading still count.
    recorder.step(store.getState().stepIndex);
    const unsubscribe = store.subscribe((state) => recorder.step(state.stepIndex));
    const flush = () => recorder.flush();
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flush();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", flush);
    return () => {
      unsubscribe();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, [supabase, userId, session, store]);
}
