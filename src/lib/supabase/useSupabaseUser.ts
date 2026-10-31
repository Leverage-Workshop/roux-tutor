"use client";
// The browser Supabase client and the signed-in user, kept up to date as the
// user signs in or out. `user` is undefined while loading and null when signed
// out; `supabase` is null when Supabase is not configured.
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient, type BrowserSupabase } from "./client";

export function useSupabaseUser(): { supabase: BrowserSupabase | null; user: User | null | undefined } {
  const [supabase] = useState(createClient);
  const [user, setUser] = useState<User | null | undefined>(undefined);

  useEffect(() => {
    if (!supabase) return;
    // Fires INITIAL_SESSION right away, then on every sign-in or sign-out.
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => data.subscription.unsubscribe();
  }, [supabase]);

  return { supabase, user };
}
