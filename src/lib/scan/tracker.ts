// Decides, frame by frame, when a side of the cube is held steady enough to
// capture, and whether it is a side we already have. Pure logic: the camera
// screen feeds it one reading (or null) per analyzed frame.
import { colorDistance, type Lab, type Rgb } from "./color";
import type { FaceRead } from "./grid";

export interface CapturedSide {
  id: number;
  lab: Lab[];
  rgb: Rgb[];
}

export type TrackerEvent =
  | { kind: "searching" }
  /** A side is in view; `steady` goes from 0 to 1 while it is held still. */
  | { kind: "steadying"; steady: number }
  | { kind: "captured"; side: CapturedSide }
  /** The side in view was captured before. */
  | { kind: "already"; id: number }
  /** All six sides are in; nothing more is captured. */
  | { kind: "full" };

/** Readings in a row that must agree before a side is captured (~0.5 s at 6 per second). */
export const STEADY_READINGS = 3;
/** Two readings agree when their stickers are this close on average... */
const STEADY_MEAN = 9;
/** ...and none is further apart than this. */
const STEADY_MAX = 22;
/** A side matches a captured one when its center and its stickers (best rotation) are this close. */
const SAME_CENTER = 12;
const SAME_SIDE = 13;

const TURNS = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8],
  [6, 3, 0, 7, 4, 1, 8, 5, 2],
  [8, 7, 6, 5, 4, 3, 2, 1, 0],
  [2, 5, 8, 1, 4, 7, 0, 3, 6],
];

function agree(a: readonly Lab[], b: readonly Lab[]): boolean {
  const d = a.map((lab, i) => colorDistance(lab, b[i]));
  return Math.max(...d) < STEADY_MAX && d.reduce((x, y) => x + y, 0) / 9 < STEADY_MEAN;
}

/** Whether two readings are the same side, however it was turned. */
export function sameSide(a: readonly Lab[], b: readonly Lab[]): boolean {
  if (colorDistance(a[4], b[4]) >= SAME_CENTER) return false;
  return TURNS.some((t) => t.reduce((sum, j, i) => sum + colorDistance(a[i], b[j]), 0) / 9 < SAME_SIDE);
}

const average = <T extends readonly number[]>(items: readonly (readonly T[])[], i: number): T =>
  [0, 1, 2].map((ch) => items.reduce((sum, item) => sum + item[i][ch], 0) / items.length) as unknown as T;

export class ScanTracker {
  sides: CapturedSide[] = [];
  private run: FaceRead[] = [];
  /** After a capture, wait for the view to change before capturing again. */
  private settled = false;
  private nextId = 1;

  push(read: FaceRead | null): TrackerEvent {
    if (!read) {
      this.run = [];
      this.settled = false;
      return { kind: "searching" };
    }
    const last = this.run.at(-1);
    if (last && !agree(last.lab, read.lab)) {
      this.run = [];
      this.settled = false;
    }
    this.run.push(read);
    if (this.run.length > STEADY_READINGS) this.run.shift();
    if (this.run.length < STEADY_READINGS) return { kind: "steadying", steady: this.run.length / STEADY_READINGS };

    const lab = this.run[0].lab.map((_, i) => average(this.run.map((r) => r.lab), i));
    const known = this.sides.find((side) => sameSide(side.lab, lab));
    if (known) return { kind: "already", id: known.id };
    if (this.settled) return { kind: "steadying", steady: 1 };
    if (this.sides.length >= 6) return { kind: "full" };
    const side = { id: this.nextId++, lab, rgb: this.run[0].rgb.map((_, i) => average(this.run.map((r) => r.rgb), i)) };
    this.sides.push(side);
    this.settled = true;
    return { kind: "captured", side };
  }

  /** Forget a captured side, so it can be scanned again. */
  remove(id: number) {
    this.sides = this.sides.filter((side) => side.id !== id);
    this.settled = false;
    this.run = [];
  }
}
