// Proves each library in the PRD tech stack installs and loads.
// OpenCV.js is left out: it is a ~10MB WASM bundle that will be lazy-loaded in the browser.
import { describe, expect, it } from "vitest";
import Cube from "cubejs";
import { create } from "zustand";
import * as THREE from "three";

describe("tech stack smoke test", () => {
  it("cubejs applies Roux moves (M, r, U) and inverts them", () => {
    const cube = new Cube();
    const alg = "M' U r U' M2 R";
    cube.move(alg);
    expect(cube.isSolved()).toBe(false);
    cube.move(Cube.inverse(alg));
    expect(cube.isSolved()).toBe(true);
  });

  it("zustand creates a store", () => {
    const useStep = create<{ step: number; next: () => void }>((set) => ({
      step: 0,
      next: () => set((s) => ({ step: s.step + 1 })),
    }));
    useStep.getState().next();
    expect(useStep.getState().step).toBe(1);
  });

  it("three, R3F, drei, vaul and supabase load", async () => {
    expect(new THREE.BoxGeometry(1, 1, 1).type).toBe("BoxGeometry");
    const [fiber, drei, vaul, supabase] = await Promise.all([
      import("@react-three/fiber"),
      import("@react-three/drei"),
      import("vaul"),
      import("@supabase/supabase-js"),
    ]);
    expect(fiber.Canvas).toBeDefined();
    expect(drei.OrbitControls).toBeDefined();
    expect(vaul.Drawer).toBeDefined();
    expect(typeof supabase.createClient).toBe("function");
  });
});
