// Supabase connection settings. Returns null when they are not set (e.g. a
// fresh clone without .env.local), so the app still builds and runs with
// sign-in hidden. Each variable is read by its full name so Next.js can
// inline it into the browser bundle.
export interface SupabaseEnv {
  url: string;
  publishableKey: string;
}

export function getSupabaseEnv(): SupabaseEnv | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) return null;
  return { url, publishableKey };
}
