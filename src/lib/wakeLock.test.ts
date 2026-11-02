import { describe, expect, it, vi } from "vitest";
import { keepScreenOn, type WakeLockDocument } from "./wakeLock";

class FakeSentinel extends EventTarget {
  released = false;
  async release() {
    this.released = true;
    this.dispatchEvent(new Event("release"));
  }
}

function fakes({ refuse = 0 } = {}) {
  const sentinels: FakeSentinel[] = [];
  let refusals = refuse;
  const wakeLock = {
    request: vi.fn(async () => {
      if (refusals > 0) {
        refusals--;
        throw new DOMException("Not allowed", "NotAllowedError");
      }
      const s = new FakeSentinel();
      sentinels.push(s);
      return s;
    }),
  } as unknown as WakeLock;
  const listeners = new Map<string, Set<() => void>>();
  const doc = {
    visibilityState: "visible" as DocumentVisibilityState,
    addEventListener: (type: string, fn: () => void) => listeners.set(type, (listeners.get(type) ?? new Set()).add(fn)),
    removeEventListener: (type: string, fn: () => void) => listeners.get(type)?.delete(fn),
    fire: (type: string) => listeners.get(type)?.forEach((fn) => fn()),
    listenerCount: () => [...listeners.values()].reduce((n, s) => n + s.size, 0),
  };
  return { wakeLock, doc: doc as WakeLockDocument & typeof doc, sentinels };
}

const settle = () => new Promise((r) => setTimeout(r, 0));

describe("keepScreenOn", () => {
  it("holds a screen wake lock while the page is visible", async () => {
    const { wakeLock, doc, sentinels } = fakes();
    keepScreenOn(wakeLock, doc);
    await settle();
    expect(wakeLock.request).toHaveBeenCalledWith("screen");
    expect(sentinels).toHaveLength(1);
    // Taps while the lock is held don't ask again.
    doc.fire("pointerdown");
    await settle();
    expect(wakeLock.request).toHaveBeenCalledTimes(1);
  });

  it("asks again when the page is shown after the browser dropped the lock", async () => {
    const { wakeLock, doc, sentinels } = fakes();
    keepScreenOn(wakeLock, doc);
    await settle();
    doc.visibilityState = "hidden";
    await sentinels[0].release(); // the browser releases it on hide
    doc.fire("visibilitychange");
    await settle();
    expect(wakeLock.request).toHaveBeenCalledTimes(1);
    doc.visibilityState = "visible";
    doc.fire("visibilitychange");
    await settle();
    expect(sentinels).toHaveLength(2);
    expect(sentinels[1].released).toBe(false);
  });

  it("tries again on the next tap when a request is refused", async () => {
    const { wakeLock, doc, sentinels } = fakes({ refuse: 1 });
    keepScreenOn(wakeLock, doc);
    await settle();
    expect(sentinels).toHaveLength(0);
    doc.fire("pointerdown");
    await settle();
    expect(sentinels).toHaveLength(1);
  });

  it("releases the lock and stops listening when stopped", async () => {
    const { wakeLock, doc, sentinels } = fakes();
    const stop = keepScreenOn(wakeLock, doc);
    await settle();
    stop();
    expect(sentinels[0].released).toBe(true);
    expect(doc.listenerCount()).toBe(0);
  });

  it("releases a lock granted after it was stopped", async () => {
    const { wakeLock, doc, sentinels } = fakes();
    const stop = keepScreenOn(wakeLock, doc);
    stop(); // before the request resolves
    await settle();
    expect(sentinels[0].released).toBe(true);
  });

  it("does nothing in browsers without the API", () => {
    const { doc } = fakes();
    keepScreenOn(undefined, doc)();
    expect(doc.listenerCount()).toBe(0);
  });
});
