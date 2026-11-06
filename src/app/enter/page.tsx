import { Suspense } from "react";
import type { Metadata, Viewport } from "next";
import { FaceletEditor } from "@/components/facelets/FaceletEditor";
import { EMPTY_DRAFT, parseDraft } from "@/lib/cube/validate";

export const metadata: Metadata = {
  title: "Enter your cube · Roux Tutor",
  description: "Tap in your cube's colors, face by face, and get a Roux solve explained move by move.",
};

export const viewport: Viewport = {
  viewportFit: "cover",
};

// `?cube=` holds a draft (54 letters, "." for blank stickers): the editor keeps
// it up to date, and the scanner (/scan) opens the editor with its guesses. The
// blank editor is the static shell; a draft from the URL streams in.
export default function EnterPage({ searchParams }: PageProps<"/enter">) {
  return (
    <Suspense fallback={<FaceletEditor initial={EMPTY_DRAFT} />}>
      {searchParams.then(({ cube }) => {
        const draft = parseDraft(typeof cube === "string" ? cube : undefined) ?? EMPTY_DRAFT;
        return <FaceletEditor key={draft} initial={draft} />;
      })}
    </Suspense>
  );
}
