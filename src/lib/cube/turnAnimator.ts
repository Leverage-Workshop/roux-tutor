// Plays layer turns one at a time for the 3D renderer, independent of React
// and three.js so it can be unit tested.
//
// The store jumps straight to the new state; the animator keeps showing the
// state before the move while the turning layer rotates, then swaps to the new
// state at the end. Taps that arrive mid-turn queue up and play faster so the
// view catches up. A jump (goTo, new lesson) cancels everything and snaps.
import { turnAngle } from "./geometry";
import type { Move } from "./notation";
import type { CubeStoreApi } from "./store";

/** What the renderer draws: stickers from `facelets`, with `move`'s layers turned by `angle()`. */
export interface AnimatorFrame {
  facelets: string;
  move: Move | null;
  /** Changes whenever a turn starts, so the same move twice still re-renders. */
  key: number;
}

interface PendingTurn {
  from: string;
  to: string;
  move: Move;
}

export interface TurnAnimatorOptions {
  /** Seconds for one turn when nothing is queued. 0 disables animation. */
  duration?: number;
}

export const DEFAULT_TURN_SECONDS = 0.28;

/** Ease in and out so turns start and stop gently. */
function ease(t: number): number {
  return -(Math.cos(Math.PI * t) - 1) / 2;
}

export function createTurnAnimator(facelets: string, options: TurnAnimatorOptions = {}) {
  let duration = options.duration ?? DEFAULT_TURN_SECONDS;
  let shown = facelets;
  let active: PendingTurn | null = null;
  const queue: PendingTurn[] = [];
  let elapsed = 0;
  let key = 0;
  let frame: AnimatorFrame = { facelets, move: null, key };
  const listeners = new Set<() => void>();

  function publish() {
    key += 1;
    frame = active ? { facelets: active.from, move: active.move, key } : { facelets: shown, move: null, key };
    for (const listener of listeners) listener();
  }

  /** Current turn's length: shorter while more turns wait, so the view catches up. */
  function currentDuration() {
    return duration / (1 + queue.length);
  }

  function snap(target: string) {
    const changed = active !== null || shown !== target;
    queue.length = 0;
    active = null;
    elapsed = 0;
    shown = target;
    if (changed) publish();
  }

  function angle(): number {
    if (!active) return 0;
    return turnAngle(active.move) * ease(Math.min(1, elapsed / currentDuration()));
  }

  return {
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    getFrame: (): AnimatorFrame => frame,

    /** Whether a turn is playing (the renderer keeps requesting frames while true). */
    isAnimating: (): boolean => active !== null,

    /** Queue a single-move change from `from` to `to`. */
    play(from: string, to: string, move: Move) {
      if (duration <= 0) {
        snap(to);
        return;
      }
      const turn = { from, to, move };
      if (active) {
        queue.push(turn);
        return;
      }
      active = turn;
      elapsed = 0;
      publish();
    },

    /** Show `facelets` now, dropping any turns in progress or queued. */
    snap,

    /** Advance by `seconds`. Returns the active turn's angle in radians (0 when idle). */
    tick(seconds: number): number {
      if (!active) return 0;
      elapsed += Math.max(0, seconds);
      if (elapsed >= currentDuration()) {
        shown = active.to;
        active = queue.shift() ?? null;
        elapsed = 0;
        publish();
      }
      return angle();
    },

    /** Angle of the active turn right now, in radians. */
    angle,

    /** Change the turn length (0 = no animation, e.g. for reduced motion). */
    setDuration(seconds: number) {
      duration = seconds;
      if (duration <= 0 && active) snap(queue.at(-1)?.to ?? active.to);
    },
  };
}

export type TurnAnimator = ReturnType<typeof createTurnAnimator>;

/**
 * Feed a cube store's changes into an animator: single moves (Next, Back)
 * animate, anything else (goTo, a new lesson) snaps. Returns an unsubscribe.
 */
export function followCubeStore(store: CubeStoreApi, animator: TurnAnimator): () => void {
  animator.snap(store.getState().facelets);
  return store.subscribe((state, prev) => {
    if (state.lastTurn && state.lastTurn !== prev.lastTurn) {
      animator.play(prev.facelets, state.facelets, state.lastTurn.move);
    } else if (state.facelets !== prev.facelets) {
      animator.snap(state.facelets);
    }
  });
}
