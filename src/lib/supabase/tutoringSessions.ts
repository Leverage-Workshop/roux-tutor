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
  /** Where each Roux stage ends in `moves` (see `stageEnds` in lesson.ts). */
  stageEnds: readonly number[];
}

/** Create a session row and return its id. */
export async function startTutoringSession(supabase: Client, session: NewTutoringSession): Promise<string> {
  const { data, error } = await supabase
    .from("tutoring_sessions")
    .insert({
      start_facelets: session.startFacelets,
      source: session.source,
      moves: [...session.moves],
      stage_ends: [...session.stageEnds],
    })
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

/** Totals across all of the user's sessions (the tutoring_stats view). */
export interface TutoringStats {
  solvesStarted: number;
  solvesFinished: number;
  /** Sessions that recorded stage boundaries: the base for the per-stage counts. */
  stagedSolves: number;
  /** Sessions that got through each stage, in order FB, SB, CMLL, LSE. */
  stagesDone: [number, number, number, number];
  movesStepped: number;
  lastActiveAt: string | null;
}

export const EMPTY_STATS: TutoringStats = {
  solvesStarted: 0,
  solvesFinished: 0,
  stagedSolves: 0,
  stagesDone: [0, 0, 0, 0],
  movesStepped: 0,
  lastActiveAt: null,
};

/** The current user's totals; all zeros before their first session. */
export async function getTutoringStats(supabase: Client): Promise<TutoringStats> {
  const { data, error } = await supabase.from("tutoring_stats").select("*").maybeSingle();
  if (error) throw error;
  if (!data) return EMPTY_STATS;
  return {
    solvesStarted: data.solves_started ?? 0,
    solvesFinished: data.solves_finished ?? 0,
    stagedSolves: data.staged_solves ?? 0,
    stagesDone: [data.fb_done ?? 0, data.sb_done ?? 0, data.cmll_done ?? 0, data.lse_done ?? 0],
    movesStepped: data.moves_stepped ?? 0,
    lastActiveAt: data.last_active_at,
  };
}
