// Records one guided solve as a tutoring session while the user steps through
// it. Kept free of React and Supabase so it can be tested with fakes:
//
// - The session row is created on the first step forward, so opening the
//   tutor and leaving doesn't count as a solve started.
// - Progress is the furthest move reached; stepping back doesn't undo it.
// - Progress saves are batched (one write per `delayMs` of activity), and
//   `flush` sends a pending one right away (when the page is hidden or left).
// - Reaching the last move marks the session finished right away.
// - A continued solve (`resume`) writes to its existing row and counts only
//   moves past the ones already saved.
// - Writes go out one at a time, in order. If creating the row fails the
//   recorder stops; a failed progress write is reported and the next one
//   carries the latest count anyway.

export interface SessionWriter {
  /** Create the session row; resolves to its id. */
  start(): Promise<string>;
  progress(id: string, stepsCompleted: number): Promise<void>;
  complete(id: string, stepsCompleted: number): Promise<void>;
}

export interface RecorderOptions {
  /** Continue an existing session instead of creating one. */
  resume?: { id: string; stepsCompleted: number };
  delayMs?: number;
  onError?: (error: unknown) => void;
  setTimer?: (fn: () => void, ms: number) => unknown;
  clearTimer?: (timer: unknown) => void;
}

export class SessionRecorder {
  private readonly delayMs: number;
  private readonly onError: (error: unknown) => void;
  private readonly setTimer: (fn: () => void, ms: number) => unknown;
  private readonly clearTimer: (timer: unknown) => void;

  private furthest = 0;
  private sent = 0;
  private id: Promise<string> | null = null;
  private queue: Promise<void> = Promise.resolve();
  private timer: unknown = null;
  private stopped = false;
  private finished = false;

  constructor(
    private readonly writer: SessionWriter,
    /** Number of moves in the solve. */
    private readonly total: number,
    options: RecorderOptions = {},
  ) {
    this.delayMs = options.delayMs ?? 1500;
    this.onError = options.onError ?? (() => {});
    this.setTimer = options.setTimer ?? ((fn, ms) => setTimeout(fn, ms));
    this.clearTimer = options.clearTimer ?? ((t) => clearTimeout(t as ReturnType<typeof setTimeout>));
    if (options.resume) {
      this.id = Promise.resolve(options.resume.id);
      this.furthest = this.sent = Math.min(options.resume.stepsCompleted, total);
    }
  }

  /** The user is now at move `stepIndex` (moves stepped through so far). */
  step(stepIndex: number): void {
    if (this.stopped || this.finished || stepIndex <= this.furthest) return;
    this.furthest = Math.min(stepIndex, this.total);
    if (!this.id) this.begin();
    if (this.furthest === this.total) {
      this.finish();
    } else if (this.timer === null) {
      this.timer = this.setTimer(() => {
        this.timer = null;
        this.sendProgress();
      }, this.delayMs);
    }
  }

  /** Send a pending progress save now. */
  flush(): void {
    this.cancelTimer();
    this.sendProgress();
  }

  /** Resolves when every write so far has settled (for tests and unmount). */
  settled(): Promise<void> {
    return this.queue;
  }

  private begin(): void {
    const id = this.writer.start();
    this.id = id;
    // Starting is the first thing in the queue; everything else waits for it.
    this.queue = id.then(
      () => {},
      (error) => {
        this.stopped = true;
        this.cancelTimer();
        this.onError(error);
      },
    );
  }

  private finish(): void {
    this.finished = true;
    this.cancelTimer();
    const steps = this.furthest;
    this.sent = steps;
    this.enqueue((id) => this.writer.complete(id, steps));
  }

  private sendProgress(): void {
    if (this.stopped || this.finished || this.furthest <= this.sent) return;
    const steps = this.furthest;
    this.sent = steps;
    this.enqueue((id) => this.writer.progress(id, steps));
  }

  private enqueue(write: (id: string) => Promise<void>): void {
    const id = this.id;
    if (!id) return;
    this.queue = this.queue.then(async () => {
      if (this.stopped) return;
      try {
        await write(await id);
      } catch (error) {
        this.onError(error);
      }
    });
  }

  private cancelTimer(): void {
    if (this.timer !== null) this.clearTimer(this.timer);
    this.timer = null;
  }
}
