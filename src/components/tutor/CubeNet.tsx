"use client";
// Flat map of all six faces, drawn from the cube store. Shown instead of the
// 3D cube when the browser has no WebGL (see CubeView).
import { FaceletNet } from "@/components/FaceletNet";
import { useCubeStore } from "@/lib/cube/CubeStoreProvider";

export function CubeNet() {
  const facelets = useCubeStore((s) => s.facelets);
  return <FaceletNet facelets={facelets} style={{ width: "min(100%, calc((60dvh - 9rem) * 4 / 3))" }} />;
}
