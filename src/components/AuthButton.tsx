"use client";
// Optional Google sign-in. Signed-out users can still use the tutor; signing
// in saves their tutoring sessions and lets them save cubes. When signed in,
// the user's name links to their progress page. `compact` (the tutor header)
// shows a round initial instead of the name and sign-out button. Renders
// nothing when Supabase is not configured.
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSupabaseUser } from "@/lib/supabase/useSupabaseUser";

const BUTTON_CLASS =
  "min-h-11 rounded-full border border-zinc-300 px-4 text-sm font-medium disabled:opacity-50 dark:border-zinc-700";

export function AuthButton({ compact = false }: { compact?: boolean }) {
  const { supabase, user } = useSupabaseUser();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  if (!supabase || user === undefined) return null;

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
      <button
        type="button"
        onClick={signIn}
        disabled={busy}
        aria-label="Sign in with Google"
        className={`${BUTTON_CLASS} shrink-0`}
      >
        {compact ? "Sign in" : "Sign in with Google"}
      </button>
    );
  }

  const name = (user.user_metadata?.full_name as string | undefined) ?? user.email ?? "Signed in";

  if (compact) {
    return (
      <Link
        href="/progress"
        aria-label={`Your progress (${name})`}
        className="flex size-11 shrink-0 items-center justify-center rounded-full bg-foreground text-base font-semibold text-background"
      >
        {name.trim().charAt(0).toUpperCase() || "?"}
      </Link>
    );
  }

  const signOut = async () => {
    setBusy(true);
    await supabase.auth.signOut();
    setBusy(false);
    router.refresh();
  };

  return (
    <div className="flex min-w-0 items-center gap-3">
      <Link
        href="/progress"
        className="flex min-h-11 min-w-0 items-center text-sm text-zinc-600 underline underline-offset-2 dark:text-zinc-400"
      >
        <span className="truncate">{name}</span>
      </Link>
      <button type="button" onClick={signOut} disabled={busy} className={`${BUTTON_CLASS} shrink-0`}>
        Sign out
      </button>
    </div>
  );
}
