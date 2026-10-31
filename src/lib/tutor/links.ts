// Links into the tutor and editor that remember where a cube came from, so a
// solve of a scanned cube is saved as `scan` even after a stop in the editor.
import type { SessionSource } from "@/lib/supabase/tutoringSessions";

/** `?from=` value -> session source; only scans are marked in links. */
export function sourceFromParam(from: string | string[] | undefined): SessionSource | undefined {
  return from === "scan" ? "scan" : undefined;
}

const fromSuffix = (source: SessionSource | undefined) => (source === "scan" ? "&from=scan" : "");

/** The tutor solving the given cube (54 facelet letters). */
export function tutorHref(facelets: string, source?: SessionSource): string {
  return `/tutor?cube=${facelets}${fromSuffix(source)}`;
}

/** The facelet editor with the given draft. */
export function editorHref(draft: string, source?: SessionSource): string {
  return `/enter?cube=${draft}${fromSuffix(source)}`;
}
