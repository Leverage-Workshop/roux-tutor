import { describe, expect, it } from "vitest";
import { FACES, type Face } from "@/lib/cube/model";
import { rgbToLab, type Rgb } from "./color";
import type { FaceRead } from "./grid";
import { CAMERA_RGB } from "./testImages";
import { STEADY_READINGS, ScanTracker, sameSide } from "./tracker";

/** A side as the camera reads it; `light` scales brightness, like auto exposure does. */
function reading(side: readonly Face[], wobble = 0, light = 1): FaceRead {
  const rgb = side.map(
    (f, i) => CAMERA_RGB[f].map((v) => Math.min(255, v * light + ((i * 7 + wobble) % 5) - 2)) as unknown as Rgb,
  );
  const p = { x: 0, y: 0 };
  return { corners: [p, p, p, p], rgb, lab: rgb.map(rgbToLab), contrast: 80 };
}

const SIDES: Face[][] = FACES.map((f, n) => [f, FACES[(n + 1) % 6], f, FACES[(n + 2) % 6], f, f, FACES[(n + 3) % 6], f, f]);
const turned = (side: readonly Face[]) => [6, 3, 0, 7, 4, 1, 8, 5, 2].map((i) => side[i]);

function hold(tracker: ScanTracker, side: readonly Face[], times = STEADY_READINGS) {
  const events = [];
  for (let k = 0; k < times; k++) events.push(tracker.push(reading(side, k)));
  return events;
}

describe("ScanTracker", () => {
  it("captures a side once it is held steady", () => {
    const tracker = new ScanTracker();
    const events = hold(tracker, SIDES[0]);
    expect(events.slice(0, -1).map((e) => e.kind)).toEqual(Array(STEADY_READINGS - 1).fill("steadying"));
    const last = events.at(-1)!;
    expect(last.kind).toBe("captured");
    expect(tracker.sides).toHaveLength(1);
    // Held there longer, it is the side we already have.
    expect(tracker.push(reading(SIDES[0], 9))).toEqual({ kind: "already", id: tracker.sides[0].id });
  });

  it("does not capture while the view keeps changing", () => {
    const tracker = new ScanTracker();
    for (let k = 0; k < 10; k++) tracker.push(reading(SIDES[k % 2]));
    expect(tracker.sides).toHaveLength(0);
    expect(tracker.push(null)).toEqual({ kind: "searching" });
  });

  it("knows a side it already has, however it is turned", () => {
    const tracker = new ScanTracker();
    hold(tracker, SIDES[2]);
    tracker.push(null);
    const again = hold(tracker, turned(turned(SIDES[2])));
    expect(again.at(-1)).toEqual({ kind: "already", id: tracker.sides[0].id });
    expect(tracker.sides).toHaveLength(1);
  });

  it("collects six different sides, then stops", () => {
    const tracker = new ScanTracker();
    for (const side of SIDES) {
      expect(hold(tracker, side).at(-1)!.kind).toBe("captured");
      tracker.push(null);
    }
    expect(tracker.sides).toHaveLength(6);
    const extra: Face[] = ["U", "U", "U", "U", "D", "U", "U", "U", "U"];
    expect(hold(tracker, extra).at(-1)).toEqual({ kind: "full" });
  });

  it("can forget a side and capture it again", () => {
    const tracker = new ScanTracker();
    hold(tracker, SIDES[1]);
    const id = tracker.sides[0].id;
    tracker.remove(id);
    expect(tracker.sides).toHaveLength(0);
    const again = hold(tracker, SIDES[1]).at(-1)!;
    expect(again.kind).toBe("captured");
    expect(again.kind === "captured" && again.side.id).not.toBe(id);
  });

  it("tells solved red and orange sides apart", () => {
    const red = reading(Array(9).fill("R")).lab;
    const orange = reading(Array(9).fill("L")).lab;
    expect(sameSide(red, orange)).toBe(false);
    expect(sameSide(red, reading(Array(9).fill("R"), 3).lab)).toBe(true);
  });

  it("captures a side once, even with blurry frames and the exposure drifting", () => {
    const tracker = new ScanTracker();
    hold(tracker, SIDES[1]);
    // The camera keeps adjusting and the hand shakes: the same side, steadily darker.
    for (let k = 0; k < 40; k++) {
      const event = k % 5 === 4 ? tracker.push(null) : tracker.push(reading(SIDES[1], k, 1 - k * 0.01));
      expect(event.kind).not.toBe("captured");
    }
    expect(tracker.sides).toHaveLength(1);
    // Then a different side is captured right away.
    expect(hold(tracker, SIDES[2]).at(-1)!.kind).toBe("captured");
  });

  it("knows a side shown again in dimmer or brighter light, or with glare on one sticker", () => {
    const tracker = new ScanTracker();
    hold(tracker, SIDES[3]);
    tracker.push(null);
    hold(tracker, SIDES[4]);
    tracker.push(null);
    const id = tracker.sides[0].id;
    for (const light of [0.8, 1.15]) {
      const again = [0, 1, 2].map((k) => tracker.push(reading(turned(SIDES[3]), k, light)));
      expect(again.at(-1)).toEqual({ kind: "already", id });
      tracker.push(null);
    }
    const glare = reading(SIDES[3]);
    glare.lab[2] = rgbToLab([250, 250, 250]);
    expect(sameSide(tracker.sides[0].lab, glare.lab)).toBe(true);
    expect(tracker.sides.map((s) => s.id)).toEqual([id, id + 1]);
  });

  it("keeps different sides apart in any light", () => {
    for (const light of [0.6, 0.8, 1, 1.15]) {
      for (let a = 0; a < 6; a++) {
        for (let b = 0; b < 6; b++) {
          if (a !== b) expect(sameSide(reading(SIDES[a]).lab, reading(SIDES[b], 2, light).lab)).toBe(false);
        }
      }
      const solved = (f: Face) => reading(Array(9).fill(f), 0, light).lab;
      expect(sameSide(solved("R"), solved("L"))).toBe(false);
    }
  });
});
