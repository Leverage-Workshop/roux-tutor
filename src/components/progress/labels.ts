import type { SessionSource } from "@/lib/supabase/tutoringSessions";

/** How each source of a cube is named on the progress page. */
export const SOURCE_LABEL: Record<SessionSource, string> = {
  scan: "Scanned",
  manual: "Entered by hand",
  scramble: "Demo scramble",
};
