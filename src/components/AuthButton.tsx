"use client";
// Optional Google sign-in. Signed-out users can still use the tutor; signing
// in lets their tutoring sessions be saved. Renders nothing when Supabase is
// not configured.
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

export function AuthButton() {
  const [supabase] = useState(createClient);
  const router = useRouter();
  // undefined = still loading, null = signed out.
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    // Fires INITIAL_SESSION right away, then on every sign-in or sign-out.
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => data.subscription.unsubscribe();
  }, [supabase]);

  if (!supabase || user === undefined) return null;

  const buttonClass =
    "min-h-11 rounded-full border border-zinc-300 px-4 text-sm font-medium disabled:opacity-50 dark:border-zinc-700";

  if (!user) {
    const signIn = async () => {
      setBusy(true);
      const { pathname, search, origin } = window.location;
      const next = encodeURIComponent(pathname + search);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${origin}/auth/callback?next=${next}` },
      });
      // On success the browser is already leaving for Google.
      if (error) setBusy(false);
    };
    return (
      <button type="button" onClick={signIn} disabled={busy} className={buttonClass}>
        Sign in with Google
      </button>
    );
  }

  const signOut = async () => {
    setBusy(true);
    await supabase.auth.signOut();
    setBusy(false);
    router.refresh();
  };
  const name = (user.user_metadata?.full_name as string | undefined) ?? user.email ?? "Signed in";

  return (
    <div className="flex min-w-0 items-center gap-3">
      <span className="truncate text-sm text-zinc-600 dark:text-zinc-400">{name}</span>
      <button type="button" onClick={signOut} disabled={busy} className={`${buttonClass} shrink-0`}>
        Sign out
      </button>
    </div>
  );
}
