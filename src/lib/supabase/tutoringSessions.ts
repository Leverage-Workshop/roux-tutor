// Read and write a signed-in user's tutoring sessions (one row per guided
// solve). RLS on the table limits every call to the current user's rows, and
// user_id is filled in by the database from the session.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Tables } from "@/types/database";
import type { Move } from "@/lib/cube/notation";

export type TutoringSession = Tables<"tutoring_sessions">;
export type SessionSource = "scan" | "manual" | "scramble";
type Client = SupabaseClient<Database>;

export interface NewTutoringSession {
  /** 54-letter facelet string of the cube before the solve. */
  startFacelets: string;
  source: SessionSource;
  /** The solve being taught. */
  moves: readonly Move[];
}

/** Create a session row and return its id. */
export async function startTutoringSession(supabase: Client, session: NewTutoringSession): Promise<string> {
  const { data, error } = await supabase
    .from("tutoring_sessions")
    .insert({ start_facelets: session.startFacelets, source: session.source, moves: [...session.moves] })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

/** Record how many moves the user has stepped through. */
export async function saveTutoringProgress(supabase: Client, id: string, stepsCompleted: number): Promise<void> {
  const { error } = await supabase
    .from("tutoring_sessions")
    .update({ steps_completed: stepsCompleted })
    .eq("id", id);
  if (error) throw error;
}

/** Mark the solve finished. */
export async function completeTutoringSession(supabase: Client, id: string, stepsCompleted: number): Promise<void> {
  const { error } = await supabase
    .from("tutoring_sessions")
    .update({ steps_completed: stepsCompleted, completed_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

/** The current user's sessions, newest first. */
export async function listTutoringSessions(supabase: Client, limit = 20): Promise<TutoringSession[]> {
  const { data, error } = await supabase
    .from("tutoring_sessions")
    .select("*")
    .order("started_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data;
}
