// Move notation: parse algorithm strings into normalized moves and invert them.
// Supports everything cubejs supports: face turns (U R F D L B), slices (M E S),
// wide turns (u r f d l b, also written Rw), and rotations (x y z).

export const FACE_TURNS = ["U", "R", "F", "D", "L", "B"] as const;
export const SLICE_TURNS = ["M", "E", "S"] as const;
export const WIDE_TURNS = ["u", "r", "f", "d", "l", "b"] as const;
export const ROTATIONS = ["x", "y", "z"] as const;

export type MoveBase =
  | (typeof FACE_TURNS)[number]
  | (typeof SLICE_TURNS)[number]
  | (typeof WIDE_TURNS)[number]
  | (typeof ROTATIONS)[number];

/** "" = quarter turn clockwise, "'" = counterclockwise, "2" = half turn. */
export type MoveSuffix = "" | "'" | "2";

/** A single normalized move, e.g. "R", "M'", "r2", "x". */
export type Move = `${MoveBase}${MoveSuffix}`;

const BASES = new Set<string>([...FACE_TURNS, ...SLICE_TURNS, ...WIDE_TURNS, ...ROTATIONS]);
const FACE_SET = new Set<string>(FACE_TURNS);
// Straight and curly apostrophes: phone keyboards often insert the curly ones.
const PRIMES = new Set(["'", "’", "′"]);

export class InvalidMoveError extends Error {
  constructor(
    readonly input: string,
    readonly position: number,
  ) {
    super(`Invalid move at position ${position} in "${input}"`);
    this.name = "InvalidMoveError";
  }
}

/**
 * Parse an algorithm string into normalized moves.
 * Accepts spaces or no spaces ("RUR'U'"), parentheses, "Rw" for "r",
 * and "R2'" / "R'2" for "R2". Throws InvalidMoveError on anything else.
 */
export function parseAlgorithm(input: string): Move[] {
  const moves: Move[] = [];
  let i = 0;
  while (i < input.length) {
    const ch = input[i];
    if (/\s/.test(ch) || ch === "(" || ch === ")") {
      i++;
      continue;
    }
    if (!BASES.has(ch)) throw new InvalidMoveError(input, i);

    let base = ch;
    i++;
    if (FACE_SET.has(base) && input[i] === "w") {
      base = base.toLowerCase();
      i++;
    }

    let suffix: MoveSuffix = "";
    if (input[i] === "2") {
      suffix = "2";
      i++;
      if (PRIMES.has(input[i])) i++; // R2' is the same state change as R2
    } else if (PRIMES.has(input[i])) {
      suffix = "'";
      i++;
      if (input[i] === "2") {
        suffix = "2"; // R'2
        i++;
      }
    }
    moves.push(`${base}${suffix}` as Move);
  }
  return moves;
}

/** Accept either a string or an already-parsed move list. */
export function toMoves(alg: string | readonly Move[]): Move[] {
  return typeof alg === "string" ? parseAlgorithm(alg) : [...alg];
}

export function invertMove(move: Move): Move {
  if (move.endsWith("2")) return move;
  if (move.endsWith("'")) return move.slice(0, -1) as Move;
  return `${move}'` as Move;
}

export function invertAlgorithm(moves: readonly Move[]): Move[] {
  return [...moves].reverse().map(invertMove);
}

export function formatAlgorithm(moves: readonly Move[]): string {
  return moves.join(" ");
}
