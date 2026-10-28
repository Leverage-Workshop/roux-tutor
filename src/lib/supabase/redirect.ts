/**
 * Where to send the user after sign-in. Only same-site paths are allowed, so
 * a crafted link can't bounce someone to another website ("//evil.com" and
 * "/\evil.com" are treated by browsers as other hosts).
 */
export function safeNextPath(next: string | null | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) {
    return "/";
  }
  return next;
}
