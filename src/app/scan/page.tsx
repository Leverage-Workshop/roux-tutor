import type { Metadata, Viewport } from "next";
import { CubeScanner } from "@/components/scan/CubeScanner";

export const metadata: Metadata = {
  title: "Scan your cube · Roux Tutor",
  description: "Turn your cube in front of the camera to scan it, then get a Roux solve explained move by move.",
};

export const viewport: Viewport = {
  viewportFit: "cover",
};

export default function ScanPage() {
  return <CubeScanner />;
}
