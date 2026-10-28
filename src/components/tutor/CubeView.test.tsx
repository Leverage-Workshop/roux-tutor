import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The real 3D cube needs WebGL, which jsdom lacks; a stub stands in for it.
const cube3d = vi.hoisted(() => ({ fail: false }));
vi.mock("@/components/cube3d/Cube3D", () => ({
  Cube3D: () => {
    if (cube3d.fail) throw new Error("WebGL context lost");
    return <div role="img" aria-label="3D view of the cube" />;
  },
}));

function fakeWebGL(available: boolean) {
  const gl = { getExtension: () => ({ loseContext: vi.fn() }) } as unknown as WebGL2RenderingContext;
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(available ? gl : null);
}

// CubeView checks WebGL once per page load, so each test loads a fresh copy.
async function renderCubeView() {
  vi.resetModules();
  const { CubeView } = await import("./CubeView");
  const { CubeStoreProvider } = await import("@/lib/cube/CubeStoreProvider");
  render(
    <CubeStoreProvider>
      <CubeView />
    </CubeStoreProvider>,
  );
}

beforeEach(() => {
  cube3d.fail = false;
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("CubeView", () => {
  it("shows the 3D cube when the browser has WebGL", async () => {
    fakeWebGL(true);
    await renderCubeView();
    expect(await screen.findByRole("img", { name: /3D view/ })).toBeDefined();
    expect(screen.queryByRole("img", { name: /six faces/ })).toBeNull();
  });

  it("shows the flat net without WebGL", async () => {
    fakeWebGL(false);
    await renderCubeView();
    expect(screen.getByRole("img", { name: /six faces/ })).toBeDefined();
  });

  it("falls back to the flat net if the 3D cube fails", async () => {
    fakeWebGL(true);
    cube3d.fail = true;
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    await renderCubeView();
    expect(await screen.findByRole("img", { name: /six faces/ })).toBeDefined();
  });
});
