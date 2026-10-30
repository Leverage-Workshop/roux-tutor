import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Cube from "cubejs";
import { FACES, toFacelets, type Face } from "@/lib/cube/model";
import { rgbToLab, type Rgb } from "@/lib/scan/color";
import type { FaceRead } from "@/lib/scan/grid";
import { CAMERA_RGB } from "@/lib/scan/testImages";
import { CubeScanner } from "./CubeScanner";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

// Each analyzed frame takes the next reading from this queue (null = no side).
let frames: (FaceRead | null)[] = [];
vi.mock("@/lib/scan/frame", () => ({
  SNAPSHOT_IN_VIEW: 0.84,
  GUIDE_IN_VIEW: 0.7,
  readFrame: () => frames.shift() ?? null,
}));

const stop = vi.fn();
function mockCamera(result: "ok" | "denied" | "missing" | "unsupported") {
  const getUserMedia = vi.fn(async () => {
    if (result === "denied") throw Object.assign(new Error("denied"), { name: "NotAllowedError" });
    if (result === "missing") throw Object.assign(new Error("none"), { name: "NotFoundError" });
    return {
      getTracks: () => [{ stop }],
      getVideoTracks: () => [{ getSettings: () => ({ facingMode: "environment" }) }],
    } as unknown as MediaStream;
  });
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: result === "unsupported" ? undefined : { getUserMedia },
  });
  return getUserMedia;
}

function reading(side: readonly Face[]): FaceRead {
  const rgb = side.map((f) => CAMERA_RGB[f] as Rgb);
  const p = { x: 10, y: 10 };
  return { corners: [p, p, p, p], rgb, lab: rgb.map(rgbToLab), contrast: 80 };
}

const CUBE = (() => {
  const cube = new Cube();
  cube.move("R U F' L2 D B' R2 U'");
  return toFacelets(cube.toJSON());
})();
/** The cube's sides as the camera would see them, the top one turned. */
const SIDES = FACES.map((_, f) => [...CUBE.slice(f * 9, f * 9 + 9)] as Face[]);
SIDES[0] = [6, 3, 0, 7, 4, 1, 8, 5, 2].map((i) => SIDES[0][i]);

const status = () => screen.getByRole("status").textContent;
const frame = async (n = 1) => {
  for (let k = 0; k < n; k++) await act(() => vi.advanceTimersByTimeAsync(160));
};
const holdSide = (side: readonly Face[]) => (frames.push(null, reading(side), reading(side), reading(side)), frame(4));

beforeEach(() => {
  vi.useFakeTimers();
  frames = [];
  push.mockClear();
  stop.mockClear();
  HTMLMediaElement.prototype.play = vi.fn(async () => {});
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("CubeScanner", () => {
  it("asks for the rear camera and shows the guide", async () => {
    const getUserMedia = mockCamera("ok");
    render(<CubeScanner />);
    expect(status()).toBe("Starting the camera…");
    await frame();
    expect(getUserMedia).toHaveBeenCalledWith(
      expect.objectContaining({ video: expect.objectContaining({ facingMode: { ideal: "environment" } }) }),
    );
    expect(status()).toBe("Hold one side of the cube inside the square.");
    expect(screen.getAllByLabelText(/not scanned yet/)).toHaveLength(6);
  });

  it("captures sides as they are held steady, knows repeats, and opens the editor with the cube", async () => {
    mockCamera("ok");
    render(<CubeScanner />);
    await frame();
    frames.push(reading(SIDES[2]), reading(SIDES[2]));
    await frame(2);
    expect(status()).toBe("Hold still…");
    frames.push(reading(SIDES[2]));
    await frame();
    expect(status()).toBe("Got it! 1 of 6. Turn the cube to show another side.");
    expect(screen.getAllByRole("button", { name: /scanned\. Tap to scan it again/ })).toHaveLength(1);

    await holdSide(SIDES[2]);
    expect(status()).toBe("You already scanned this side. Show another one.");

    for (const s of [0, 1, 3, 4]) await holdSide(SIDES[s]);
    expect(status()).toBe("Got it! 5 of 6. Turn the cube to show another side.");
    expect(push).not.toHaveBeenCalled();
    await holdSide(SIDES[5]);
    expect(status()).toBe("All 6 sides scanned. Opening them for you to check…");
    expect(push).toHaveBeenCalledWith(`/enter?cube=${CUBE}`);
    expect(stop).toHaveBeenCalled();
  });

  it("lets the user redo a scanned side", async () => {
    mockCamera("ok");
    render(<CubeScanner />);
    await frame();
    await holdSide(SIDES[1]);
    fireEvent.click(screen.getByRole("button", { name: /^Side 1: scanned/ }));
    expect(screen.getAllByLabelText(/not scanned yet/)).toHaveLength(6);
    await holdSide(SIDES[1]);
    expect(status()).toBe("Got it! 1 of 6. Turn the cube to show another side.");
  });

  it("explains a blocked camera and offers to try again or enter by hand", async () => {
    const getUserMedia = mockCamera("denied");
    render(<CubeScanner />);
    await frame();
    expect(screen.getByRole("heading", { name: "Camera access is off" })).toBeDefined();
    expect(screen.getByRole("link", { name: "Enter colors by hand" }).getAttribute("href")).toBe("/enter");
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    await frame();
    expect(getUserMedia).toHaveBeenCalledTimes(2);
  });

  it("falls back to manual entry without a camera", async () => {
    mockCamera("missing");
    const { unmount } = render(<CubeScanner />);
    await frame();
    expect(screen.getByRole("heading", { name: "No camera available" })).toBeDefined();
    unmount();
    mockCamera("unsupported");
    render(<CubeScanner />);
    await frame();
    expect(screen.getByRole("heading", { name: "No camera available" })).toBeDefined();
  });
});
