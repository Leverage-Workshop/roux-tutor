import { describe, expect, it, vi } from "vitest";
import { SessionRecorder, type SessionWriter } from "./sessionRecorder";

/** A writer that logs calls, plus a hand-run timer. */
function setup(total = 10, start: () => Promise<string> = async () => "s1") {
  const log: string[] = [];
  const writer: SessionWriter = {
    start: vi.fn(async () => {
      log.push("start");
      return start();
    }),
    progress: vi.fn(async (id, n) => {
      log.push(`progress ${id} ${n}`);
    }),
    complete: vi.fn(async (id, n) => {
      log.push(`complete ${id} ${n}`);
    }),
  };
  let pending: (() => void) | null = null;
  const onError = vi.fn();
  const recorder = new SessionRecorder(writer, total, {
    onError,
    setTimer: (fn) => {
      pending = fn;
      return 1;
    },
    clearTimer: () => {
      pending = null;
    },
  });
  const tick = () => {
    const fn = pending;
    pending = null;
    fn?.();
  };
  return { recorder, writer, log, tick, onError, hasTimer: () => pending !== null };
}

describe("SessionRecorder", () => {
  it("does nothing until the first step forward", async () => {
    const { recorder, log } = setup();
    recorder.step(0);
    recorder.flush();
    await recorder.settled();
    expect(log).toEqual([]);
  });

  it("creates the session on the first step and batches progress", async () => {
    const { recorder, log, tick } = setup();
    recorder.step(1);
    recorder.step(2);
    recorder.step(3);
    await recorder.settled();
    expect(log).toEqual(["start"]);
    tick();
    await recorder.settled();
    expect(log).toEqual(["start", "progress s1 3"]);
  });

  it("keeps the furthest move reached when stepping back", async () => {
    const { recorder, log, tick } = setup();
    recorder.step(4);
    tick();
    recorder.step(2);
    recorder.step(3);
    tick();
    await recorder.settled();
    expect(log).toEqual(["start", "progress s1 4"]);
  });

  it("flushes a pending save right away", async () => {
    const { recorder, log, hasTimer } = setup();
    recorder.step(2);
    recorder.flush();
    await recorder.settled();
    expect(log).toEqual(["start", "progress s1 2"]);
    expect(hasTimer()).toBe(false);
    recorder.flush();
    await recorder.settled();
    expect(log).toHaveLength(2);
  });

  it("finishes the session on the last move and stops recording", async () => {
    const { recorder, log, tick, hasTimer } = setup(3);
    recorder.step(1);
    recorder.step(3);
    expect(hasTimer()).toBe(false);
    recorder.step(2);
    recorder.step(3);
    tick();
    recorder.flush();
    await recorder.settled();
    expect(log).toEqual(["start", "complete s1 3"]);
  });

  it("waits for the row to exist before writing to it", async () => {
    let resolve!: (id: string) => void;
    const { recorder, log } = setup(5, () => new Promise((r) => (resolve = r)));
    recorder.step(5);
    await Promise.resolve();
    expect(log).toEqual(["start"]);
    resolve("late");
    await recorder.settled();
    expect(log).toEqual(["start", "complete late 5"]);
  });

  it("stops if the session can't be created", async () => {
    const failure = new Error("offline");
    const { recorder, log, tick, onError } = setup(5, async () => {
      throw failure;
    });
    recorder.step(1);
    recorder.flush();
    await recorder.settled();
    recorder.step(5);
    tick();
    await recorder.settled();
    expect(log).toEqual(["start"]);
    expect(onError).toHaveBeenCalledWith(failure);
  });

  it("reports a failed save and keeps going", async () => {
    const { recorder, writer, log, onError } = setup(5);
    vi.mocked(writer.progress).mockRejectedValueOnce(new Error("timeout"));
    recorder.step(2);
    recorder.flush();
    await recorder.settled();
    expect(onError).toHaveBeenCalledTimes(1);
    recorder.step(5);
    await recorder.settled();
    expect(log).toEqual(["start", "complete s1 5"]);
  });
});
