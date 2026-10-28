// Cube state store shared by the 3D canvas and the HTML UI.
// Holds a start position, a move list, and how many of those moves are applied.
// Back/Next walk the list without losing it (undo/redo); applying new moves
// after stepping back drops the moves that were ahead, like an editor's redo.
import { createStore } from "zustand/vanilla";
import { applyMoves, solvedState, toFacelets, type CubeState } from "./model";
import { invertMove, toMoves, type Move } from "./notation";

/** The single move most recently animated onto the cube. */
export interface Turn {
  move: Move;
  /** Increases on every turn so the same move twice in a row is still a change. */
  id: number;
}

export interface CubeStoreState {
  /** Position before any move in `moves` (a scramble or a scanned cube). */
  initial: CubeState;
  /** Move history, or the solve sequence being stepped through. */
  moves: Move[];
  /** Number of moves from `moves` currently applied (0..moves.length). */
  stepIndex: number;
  /** `initial` with the first `stepIndex` moves applied. */
  cube: CubeState;
  /** `cube` as a 54-letter facelet string (cheap to compare in selectors). */
  facelets: string;
  /** Set when one move was applied (Next, Back, single move); null after a jump. */
  lastTurn: Turn | null;
}

export interface CubeStoreActions {
  /** Start from this position with an empty move list. */
  setInitial: (state: CubeState) => void;
  /** Start from a solved cube scrambled by `alg`, with an empty move list. */
  scramble: (alg: string | readonly Move[]) => void;
  /** Replace the move list (e.g. a generated solve) and rewind to its start. */
  loadMoves: (alg: string | readonly Move[]) => void;
  /** Apply moves now: drops moves ahead of the current step, then appends. */
  applyMoves: (alg: string | readonly Move[]) => void;
  /** Apply the next move in the list (redo). No-op at the end. */
  next: () => void;
  /** Undo the last applied move, keeping it in the list. No-op at the start. */
  back: () => void;
  /** Jump to a step (clamped to 0..moves.length). */
  goTo: (stepIndex: number) => void;
}

export type CubeStore = CubeStoreState & CubeStoreActions;

let turnCounter = 0;
function turn(move: Move): Turn {
  turnCounter += 1;
  return { move, id: turnCounter };
}

function snapshot(initial: CubeState, moves: Move[], stepIndex: number): CubeStoreState {
  const cube = applyMoves(initial, moves.slice(0, stepIndex));
  return { initial, moves, stepIndex, cube, facelets: toFacelets(cube), lastTurn: null };
}

/** A store at `initial`, with `moves` loaded and none applied yet. */
export function createCubeStore(initial: CubeState = solvedState(), moves: string | readonly Move[] = []) {
  return createStore<CubeStore>()((set, get) => ({
    ...snapshot(initial, toMoves(moves), 0),

    setInitial: (state) => set(snapshot(state, [], 0)),

    scramble: (alg) => set(snapshot(applyMoves(solvedState(), alg), [], 0)),

    loadMoves: (alg) => set(snapshot(get().initial, toMoves(alg), 0)),

    applyMoves: (alg) => {
      const added = toMoves(alg);
      if (added.length === 0) return;
      const { moves, stepIndex, cube } = get();
      const next = applyMoves(cube, added);
      set({
        moves: [...moves.slice(0, stepIndex), ...added],
        stepIndex: stepIndex + added.length,
        cube: next,
        facelets: toFacelets(next),
        lastTurn: added.length === 1 ? turn(added[0]) : null,
      });
    },

    next: () => {
      const { moves, stepIndex, cube } = get();
      if (stepIndex >= moves.length) return;
      const move = moves[stepIndex];
      const next = applyMoves(cube, [move]);
      set({ stepIndex: stepIndex + 1, cube: next, facelets: toFacelets(next), lastTurn: turn(move) });
    },

    back: () => {
      const { moves, stepIndex, cube } = get();
      if (stepIndex <= 0) return;
      const move = invertMove(moves[stepIndex - 1]);
      const next = applyMoves(cube, [move]);
      set({ stepIndex: stepIndex - 1, cube: next, facelets: toFacelets(next), lastTurn: turn(move) });
    },

    goTo: (target) => {
      if (!Number.isFinite(target)) return;
      const { initial, moves, stepIndex } = get();
      const clamped = Math.max(0, Math.min(moves.length, Math.trunc(target)));
      if (clamped === stepIndex) return;
      set(snapshot(initial, moves, clamped));
    },
  }));
}

export type CubeStoreApi = ReturnType<typeof createCubeStore>;
