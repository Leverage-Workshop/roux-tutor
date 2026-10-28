import { describe, expect, it, vi } from "vitest";
import { SOLVED_FACELETS, applyMoves, solvedState, toFacelets } from "./model";
import { createCubeStore } from "./store";
import { createTurnAnimator, followCubeStore } from "./turnAnimator";

const A = "state-a";
const B = "state-b";
const C = "state-c";

describe("turn animator", () => {
  it("shows the old state while a turn plays, then the new one", () => {
    const anim = createTurnAnimator(A, { duration: 1 });
    anim.play(A, B, "R");
    expect(anim.getFrame()).toMatchObject({ facelets: A, move: "R" });
    expect(anim.isAnimating()).toBe(true);

    const half = anim.tick(0.5);
    expect(half).toBeCloseTo(-Math.PI / 4); // R turns clockwise from +x; eased halfway
    expect(anim.getFrame().move).toBe("R");

    expect(anim.tick(0.6)).toBe(0);
    expect(anim.getFrame()).toMatchObject({ facelets: B, move: null });
    expect(anim.isAnimating()).toBe(false);
  });

  it("eases in: the angle grows slowly at the start", () => {
    const anim = createTurnAnimator(A, { duration: 1 });
    anim.play(A, B, "U2");
    expect(Math.abs(anim.tick(0.1))).toBeLessThan(Math.PI * 0.1);
  });

  it("queues turns that arrive mid-turn and plays them faster", () => {
    const anim = createTurnAnimator(A, { duration: 1 });
    anim.play(A, B, "R");
    anim.play(B, C, "U");
    // With one turn waiting, the current one takes half as long.
    anim.tick(0.5);
    expect(anim.getFrame()).toMatchObject({ facelets: B, move: "U" });
    anim.tick(1);
    expect(anim.getFrame()).toMatchObject({ facelets: C, move: null });
  });

  it("notifies subscribers when a turn starts and ends, with a new key each time", () => {
    const anim = createTurnAnimator(A, { duration: 1 });
    const listener = vi.fn();
    const unsubscribe = anim.subscribe(listener);
    anim.play(A, B, "M");
    const first = anim.getFrame().key;
    anim.tick(2);
    anim.play(B, A, "M'");
    expect(listener).toHaveBeenCalledTimes(3);
    expect(anim.getFrame().key).not.toBe(first);
    unsubscribe();
    anim.tick(2);
    expect(listener).toHaveBeenCalledTimes(3);
  });

  it("snaps to a jump, dropping turns in progress and queued", () => {
    const anim = createTurnAnimator(A, { duration: 1 });
    anim.play(A, B, "R");
    anim.play(B, C, "U");
    anim.snap(A);
    expect(anim.getFrame()).toMatchObject({ facelets: A, move: null });
    expect(anim.tick(1)).toBe(0);
  });

  it("does not notify when snapping to what is already shown", () => {
    const anim = createTurnAnimator(A);
    const listener = vi.fn();
    anim.subscribe(listener);
    anim.snap(A);
    expect(listener).not.toHaveBeenCalled();
  });

  it("skips animation when the duration is 0 (reduced motion)", () => {
    const anim = createTurnAnimator(A, { duration: 0 });
    anim.play(A, B, "R");
    expect(anim.getFrame()).toMatchObject({ facelets: B, move: null });

    const slow = createTurnAnimator(A, { duration: 1 });
    slow.play(A, B, "R");
    slow.play(B, C, "U");
    slow.setDuration(0);
    expect(slow.getFrame()).toMatchObject({ facelets: C, move: null });
  });
});

describe("followCubeStore", () => {
  const scrambled = applyMoves(solvedState(), "R U");

  it("animates Next and Back as single turns, Back as the inverse move", () => {
    const store = createCubeStore(scrambled, "U' R'");
    const anim = createTurnAnimator(toFacelets(scrambled), { duration: 1 });
    const stop = followCubeStore(store, anim);

    store.getState().next();
    expect(anim.getFrame()).toMatchObject({ facelets: toFacelets(scrambled), move: "U'" });
    anim.tick(1);
    expect(anim.getFrame().facelets).toBe(store.getState().facelets);

    store.getState().back();
    expect(anim.getFrame().move).toBe("U");
    anim.tick(1);
    expect(anim.getFrame().facelets).toBe(toFacelets(scrambled));
    stop();
  });

  it("snaps on a jump instead of animating", () => {
    const store = createCubeStore(scrambled, "U' R'");
    const anim = createTurnAnimator(toFacelets(scrambled), { duration: 1 });
    followCubeStore(store, anim);
    store.getState().goTo(2);
    expect(anim.getFrame()).toMatchObject({ facelets: SOLVED_FACELETS, move: null });
  });

  it("catches up with changes made before it subscribed", () => {
    const store = createCubeStore(scrambled, "U' R'");
    const anim = createTurnAnimator(toFacelets(scrambled), { duration: 1 });
    store.getState().goTo(2);
    followCubeStore(store, anim);
    expect(anim.getFrame().facelets).toBe(SOLVED_FACELETS);
  });
});
