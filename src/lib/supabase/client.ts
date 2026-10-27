// Supabase client for Client Components. createBrowserClient keeps a single
// instance per page, so calling this repeatedly is cheap.
import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";
import { getSupabaseEnv } from "./env";

export type BrowserSupabase = ReturnType<typeof createBrowserClient<Database>>;

/** Returns null when Supabase is not configured. */
export function createClient(): BrowserSupabase | null {
  const env = getSupabaseEnv();
  if (!env) return null;
  return createBrowserClient<Database>(env.url, env.publishableKey);
}
