// A signed-in user's saved cubes: starting positions to solve again later.
// RLS limits every call to the current user's rows; user_id is filled in by
// the database from the session, and saving the same cube twice keeps one row.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Tables } from "@/types/database";
import type { SessionSource } from "./tutoringSessions";

export type SavedScramble = Tables<"saved_scrambles">;
type Client = SupabaseClient<Database>;

/** Save a cube (54 facelet letters). Saving one that is already saved does nothing. */
export async function saveScramble(supabase: Client, facelets: string, source: SessionSource): Promise<void> {
  const { error } = await supabase
    .from("saved_scrambles")
    .upsert({ facelets, source }, { onConflict: "user_id,facelets", ignoreDuplicates: true });
  if (error) throw error;
}

/** Remove a saved cube by its facelets. */
export async function unsaveScramble(supabase: Client, facelets: string): Promise<void> {
  const { error } = await supabase.from("saved_scrambles").delete().eq("facelets", facelets);
  if (error) throw error;
}

/** Remove a saved cube by its row id. */
export async function deleteSavedScramble(supabase: Client, id: string): Promise<void> {
  const { error } = await supabase.from("saved_scrambles").delete().eq("id", id);
  if (error) throw error;
}

export async function isScrambleSaved(supabase: Client, facelets: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("saved_scrambles")
    .select("id")
    .eq("facelets", facelets)
    .maybeSingle();
  if (error) throw error;
  return data !== null;
}

/** The current user's saved cubes, newest first. */
export async function listSavedScrambles(supabase: Client, limit = 50): Promise<SavedScramble[]> {
  const { data, error } = await supabase
    .from("saved_scrambles")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data;
}
