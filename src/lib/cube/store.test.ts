import { describe, expect, it } from "vitest";
import { applyMoves, SOLVED_FACELETS, solvedState, toFacelets } from "./model";
import { createCubeStore } from "./store";

const after = (alg: string) => toFacelets(applyMoves(solvedState(), alg));

describe("cube store", () => {
  it("starts solved with no moves", () => {
    const s = createCubeStore().getState();
    expect(s.facelets).toBe(SOLVED_FACELETS);
    expect(s.moves).toEqual([]);
    expect(s.stepIndex).toBe(0);
    expect(s.lastTurn).toBeNull();
  });

  it("steps through a loaded sequence with next and back", () => {
    const store = createCubeStore();
    store.getState().scramble("R U");
    const scrambled = store.getState().facelets;
    store.getState().loadMoves("U' R'");
    expect(store.getState().stepIndex).toBe(0);

    store.getState().next();
    expect(store.getState().facelets).toBe(after("R U U'"));
    expect(store.getState().lastTurn?.move).toBe("U'");

    store.getState().next();
    expect(store.getState().facelets).toBe(SOLVED_FACELETS);
    store.getState().next(); // at the end: no-op
    expect(store.getState().stepIndex).toBe(2);

    store.getState().back();
    expect(store.getState().lastTurn?.move).toBe("R"); // inverse of R', for animation
    store.getState().back();
    store.getState().back(); // at the start: no-op
    expect(store.getState().stepIndex).toBe(0);
    expect(store.getState().facelets).toBe(scrambled);
    expect(store.getState().moves).toEqual(["U'", "R'"]); // back keeps the list
  });

  it("gives repeated moves distinct turn ids", () => {
    const store = createCubeStore();
    store.getState().applyMoves("M");
    const first = store.getState().lastTurn!;
    store.getState().applyMoves("M");
    expect(store.getState().lastTurn!.move).toBe(first.move);
    expect(store.getState().lastTurn!.id).not.toBe(first.id);
  });

  it("applyMoves after back drops the moves that were ahead", () => {
    const store = createCubeStore();
    store.getState().applyMoves("R U F");
    expect(store.getState().lastTurn).toBeNull(); // several moves: no single turn to animate
    store.getState().back();
    store.getState().back();
    store.getState().applyMoves("M'");
    expect(store.getState().moves).toEqual(["R", "M'"]);
    expect(store.getState().stepIndex).toBe(2);
    expect(store.getState().facelets).toBe(after("R M'"));
  });

  it("goTo jumps and clamps", () => {
    const store = createCubeStore();
    store.getState().loadMoves("R U r' x");
    store.getState().goTo(3);
    expect(store.getState().facelets).toBe(after("R U r'"));
    expect(store.getState().lastTurn).toBeNull();
    store.getState().goTo(99);
    expect(store.getState().stepIndex).toBe(4);
    store.getState().goTo(-5);
    expect(store.getState().facelets).toBe(SOLVED_FACELETS);
  });

  it("setInitial and scramble reset the move list", () => {
    const store = createCubeStore();
    store.getState().applyMoves("R U");
    store.getState().setInitial(applyMoves(solvedState(), "F"));
    expect(store.getState().moves).toEqual([]);
    expect(store.getState().facelets).toBe(after("F"));
    store.getState().applyMoves("L");
    store.getState().scramble("D");
    expect(store.getState().moves).toEqual([]);
    expect(store.getState().facelets).toBe(after("D"));
  });

  it("rejects invalid moves without changing state", () => {
    const store = createCubeStore();
    expect(() => store.getState().applyMoves("R Q")).toThrow();
    expect(store.getState().moves).toEqual([]);
  });

  it("accepts a starting position", () => {
    const store = createCubeStore(applyMoves(solvedState(), "M2"));
    expect(store.getState().facelets).toBe(after("M2"));
  });
});
