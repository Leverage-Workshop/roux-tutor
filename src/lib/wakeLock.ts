// Keep the phone's screen on while the app is open, so it doesn't go dark
// while both hands are on the cube (Screen Wake Lock API).
//
// The browser drops the lock whenever the page is hidden (tab switched, phone
// locked), so it is asked for again each time the page is shown. A request can
// also be refused (battery saver, or a browser that wants a tap first); the
// next tap tries again. Browsers without the API keep their usual timeout.

/** The parts of `document` this uses (tests pass a fake). */
export interface WakeLockDocument {
  readonly visibilityState: DocumentVisibilityState;
  addEventListener(type: string, listener: () => void, options?: AddEventListenerOptions): void;
  removeEventListener(type: string, listener: () => void): void;
}

/** Start keeping the screen on; returns a function that stops it and releases the lock. */
export function keepScreenOn(
  wakeLock: WakeLock | undefined = typeof navigator === "undefined" ? undefined : navigator.wakeLock,
  doc: WakeLockDocument = document,
): () => void {
  if (!wakeLock) return () => {};
  let sentinel: WakeLockSentinel | null = null;
  let pending = false;
  let stopped = false;

  const request = async () => {
    if (stopped || pending || sentinel || doc.visibilityState !== "visible") return;
    pending = true;
    try {
      const lock = await wakeLock.request("screen");
      if (stopped) {
        void lock.release();
        return;
      }
      sentinel = lock;
      lock.addEventListener("release", () => {
        if (sentinel === lock) sentinel = null;
      });
    } catch {
      // Refused for now; the next tap or the page being shown again retries.
    } finally {
      pending = false;
    }
  };
  const retry = () => void request();

  doc.addEventListener("visibilitychange", retry);
  doc.addEventListener("pointerdown", retry, { passive: true });
  retry();

  return () => {
    stopped = true;
    doc.removeEventListener("visibilitychange", retry);
    doc.removeEventListener("pointerdown", retry);
    void sentinel?.release();
    sentinel = null;
  };
}
