import type { Metadata, Viewport } from "next";
import { TutorScreen } from "@/components/tutor/TutorScreen";
import { demoLesson } from "@/lib/tutor/demoLesson";

export const metadata: Metadata = {
  title: "Tutor · Roux Tutor",
  description: "Step through a Roux solve one explained move at a time.",
};

// "cover" lets the drawer pad itself clear of the iPhone home indicator.
export const viewport: Viewport = {
  viewportFit: "cover",
};

// A Server Component: the demo solve (and its explanations) is worked out
// while the page is prerendered at build time, and only the finished lesson
// is sent to the browser.
export default function TutorPage() {
  return <TutorScreen lesson={demoLesson()} />;
}
