// Links into the tutor and the facelet editor for a cube.

/** The tutor solving the given cube (54 facelet letters). */
export function tutorHref(facelets: string): string {
  return `/tutor?cube=${facelets}`;
}

/** The facelet editor with the given draft. */
export function editorHref(draft: string): string {
  return `/enter?cube=${draft}`;
}
