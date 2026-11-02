// Move explanations: every move of a Roux solve gets a short, plain-language
// reason, taken from the EXPLANATIONS dictionary below.
//
// A move's dictionary entry is picked from its stage and step (fb/sb/cmll/
// lse, step id, the CMLL or LSE case) and from what the move does on the
// cube at that point, worked out by playing the solve: which pieces of the
// pair it moves, whether it joins them, lifts a finished piece out or puts it
// back, slots the pair in, starts or ends an algorithm, flips edges, and so
// on. The entry's {placeholders} are then filled with that move's context
// (piece colors, positions, case names, moves left in the step).
//
// Colors and positions are as the solver holds the cube: orange left, yellow
// down, white up, green front (the first step rotates the cube there). The
// tutor holds it differently and translates the colors (see hold.ts).
import type { CubeState } from "cubejs";
import { applyMoves, solvedState } from "@/lib/cube/model";
import type { Move } from "@/lib/cube/notation";
import { CMLL_SETS, type CmllCase } from "@/lib/solver/cmllCases";
import type { CmllStep } from "@/lib/solver/cmll";
import { isFirstBlockSolved, joinedPlacements, type PairId, type SolveStep } from "@/lib/solver/firstBlock";
import { lseBadEdges, type LseStep } from "@/lib/solver/lse";
import { CORNERS, EDGES, pieceCoord, type TrackedPiece } from "@/lib/solver/pieces";
import type { RouxSolution } from "@/lib/solver/roux";
import { isSecondBlockSolved } from "@/lib/solver/secondBlock";

/**
 * The dictionary. Keys are "<stage>.<step>.<what the move does>"; values are
 * templates whose {placeholders} are filled per move. Entries ending in
 * ".other" are fallbacks for a move that fits no other entry; tests check
 * random solves never need them.
 */
export const EXPLANATIONS = {
  // --- First block -----------------------------------------------------------
  "fb.orient.final":
    "{move} turns the whole cube so orange faces left and yellow faces down, the way this solve holds it. Rotations move no pieces, only your view.",
  "fb.orient.yellow-down": "{move} turns the whole cube so yellow faces down. One more rotation brings orange to the left.",
  "fb.orient.orange-left": "{move} turns the whole cube so orange faces left. One more rotation brings yellow to the bottom.",
  "fb.orient.partway": "{move} is the first of two whole-cube turns that bring orange to the left and yellow to the bottom.",

  "fb.dl-edge.place":
    "{move} drops the yellow-orange edge into the bottom-left, orange against the orange center. The first block is built around it.",
  "fb.dl-edge.move": "{move} moves the yellow-orange edge to the {pos}. {remaining} to drop it into the bottom-left.",
  "fb.dl-edge.other": "{move} sets up the yellow-orange edge for the bottom-left.",

  "fb.free.lift": "{move} gets the {piece} out of the {from}, where it was stuck: U, R, r and M can't reach the left side.{also}",
  "fb.free.aside": "{move} moves the {piece} on to the {pos}, so the next turn doesn't trap it again.",
  "fb.free.move": "{move} moves the {piece} on to the {pos}, away from the left side.",
  "fb.free.open": "{move} moves {kept} aside for a moment to reach the stuck piece; this step puts {them} back.",
  "fb.free.restore": "{move} puts {kept} back in place.",
  "fb.free.restore-final": "{move} puts {kept} back. Both pieces of the {pair} are now free to be joined.",
  "fb.free.other": "{move} helps free the {pair} pieces from the left side.",

  "fb.join.final":
    "{move} joins the {corner} corner and the {edge} edge: they now sit side by side with matching colors, ready to go in as one piece.",
  "fb.join.corner": "{move} moves the {corner} corner to the {pos}{near}. {remaining} to join it with its edge.",
  "fb.join.edge": "{move} moves the {edge} edge to the {pos}{near}. {remaining} to join it with its corner.",
  "fb.join.both": "{move} moves the corner to the {cpos} and the edge to the {epos}{near}. {remaining} to join them.",
  "fb.join.other": "{move} sets up joining the {corner} corner and the {edge} edge.",

  "fb.insert.final": "{move} slots the joined pair into the {slot}{also}.{done}",
  "fb.insert.carry": "{move} moves the joined pair to the {pos} without splitting it. {remaining} to slot it into the {slot}.",
  "fb.insert.carry-lift":
    "{move} moves the joined pair to the {pos} without splitting it. It also lifts {kept}; this step puts {them} back.",
  "fb.insert.open":
    "{move} turns the {slot} slot to the {pos} to meet the pair, which doesn't move. {remaining} to bring the slot back with the pair in it.",
  "fb.insert.other": "{move} lines the pair up with the {slot} slot.",

  // --- Second block ----------------------------------------------------------
  "sb.dr-edge.place":
    "{move} drops the yellow-red edge into the bottom-right, red against the red center and yellow on the bottom like the left block.",
  "sb.dr-edge.move": "{move} moves the yellow-red edge to the {pos}. {remaining} to drop it into the bottom-right.",
  "sb.dr-edge.other": "{move} sets up the yellow-red edge for the bottom-right.",

  "sb.free.lift": "{move} lifts the {piece} out of the {from}, where it was stuck, so it can move freely.{also}",
  "sb.free.aside": "{move} moves the {piece} on to the {pos}, so the next turn doesn't trap it again.",
  "sb.free.move": "{move} moves the {piece} on to the {pos}, away from the right side.",
  "sb.free.open": "{move} moves {kept} aside for a moment to reach the stuck piece; this step puts {them} back.",
  "sb.free.restore": "{move} puts {kept} back in place.",
  "sb.free.restore-final": "{move} puts {kept} back. Both pieces of the {pair} are now free to be joined.",
  "sb.free.other": "{move} helps free the {pair} pieces from the right side.",

  "sb.join.final":
    "{move} joins the {corner} corner and the {edge} edge in the top layer: side by side with matching colors, ready to go in as one piece.",
  "sb.join.corner": "{move} moves the {corner} corner to the {pos}{near}. {remaining} to join it with its edge.{lift}",
  "sb.join.edge": "{move} moves the {edge} edge to the {pos}{near}. {remaining} to join it with its corner.{lift}",
  "sb.join.both": "{move} moves the corner to the {cpos} and the edge to the {epos}{near}. {remaining} to join them.{lift}",
  "sb.join.restore": "{move} puts {kept} back in place, leaving the pair pieces where they are.",
  "sb.join.lift-carry":
    "{move} turns the right side ahead of time, lifting {kept}. When {back} turns it back, it carries a pair piece along and puts {them} back.",
  "sb.join.lift": "{move} lifts {kept} out of the way for a moment; this step puts {them} back.",
  "sb.join.other": "{move} sets up joining the {corner} corner and the {edge} edge.",

  "sb.insert.final": "{move} slots the joined pair into the {slot}{also}.{done}",
  "sb.insert.carry": "{move} moves the joined pair to the {pos} without splitting it. {remaining} to slot it into the {slot}.",
  "sb.insert.carry-lift":
    "{move} moves the joined pair to the {pos} without splitting it. It also lifts {kept}; this step puts {them} back.",
  "sb.insert.open":
    "{move} turns the {slot} slot to the {pos} to meet the pair, which doesn't move. {remaining} to bring the slot back with the pair in it.",
  "sb.insert.slice":
    "{move} turns only the middle slice: the pair and its slot stay put. It readies the middle layer for the wide {wide} turn coming up, which turns that slice too.",
  "sb.insert.other": "{move} lines the pair up with the {slot} slot.",

  // --- CMLL ------------------------------------------------------------------
  "cmll.pre-auf":
    "{move} turns the top layer so the {set} case sits the way you recognize it and its algorithm starts. Only the top layer moves.",
  "cmll.alg.start":
    "{move} ({how}) starts the {case} algorithm, {alg}. Learn it as one sequence: it solves all four top corners at once.",
  "cmll.alg.middle": "{move} ({how}): move {k} of {n} of the {case} algorithm.",
  "cmll.alg.breaks":
    "{move} ({how}): move {k} of {n} of the {case} algorithm. It takes part of the {block} apart for now; the algorithm puts it back.",
  "cmll.alg.restores": "{move} ({how}): move {k} of {n} of the {case} algorithm. It puts the {block} back together.",
  "cmll.alg.end": "{move} finishes the {case} algorithm: both blocks are back and the four top corners are solved{auf}.",
  "cmll.post-auf": "{move} turns the top layer so each corner sits above its matching colors on the blocks. The corners are done.",
  "cmll.skip-auf": "{move} lines the top corners up with the blocks. They were already solved, just turned: a CMLL skip!",

  // --- Last six edges --------------------------------------------------------
  "lse.eo.final": "{move} makes the last bad edges good. All six edges are now oriented, so none will need flipping again.",
  "lse.eo.flip":
    "{move}: with the middle slice a quarter turn off, a quarter turn of the top flips all four top edges between good and bad ({before} before, {after} now).",
  "lse.eo.slice": "{move} turns the middle slice. Bad edges now: {where}.{next}",
  "lse.eo.top": "{move} turns the top layer. Bad edges now: {where}. {why}",
  "lse.eo.other": "{move} sets up the bad edges for flipping.",

  "lse.ulur.final": "{move} finishes this step: the white-orange and white-red edges each sit between their own corners{half}.",
  "lse.ulur.final-top":
    "{move} turns the top layer so the white-orange and white-red edges, already between their own corners, sit left and right{half}.",
  "lse.ulur.up-home": "{move} brings the {edge} edge up between the two {color} corners, where it belongs.{also}",
  "lse.ulur.across-home": "{move} moves the {edge} edge across the top to sit between the two {color} corners, where it belongs.{also}",
  "lse.ulur.up": "{move} brings the {edge} edge up to the {pos}.{also}",
  "lse.ulur.across": "{move} moves the {edge} edge across the top to the {pos}.{also}",
  "lse.ulur.down": "{move} sends the {edge} edge down to the {pos} for now; it comes back up between its own corners.{also}",
  "lse.ulur.along-bottom": "{move} moves the {edge} edge along the bottom to the {pos}, where it can come up later.{also}",
  "lse.ulur.straighten":
    "{move} turns the middle slice back straight (white and yellow centers up and down), so the top layer can turn a quarter without flipping edges.",
  "lse.ulur.spot":
    "{move} turns the top layer so the spot between the two {color} corners is at the {where}, over the middle slice, where the next M turn brings the {edge} edge in.",
  "lse.ulur.over-slice": "{move} moves the {edge} edge to the {pos}, over the middle slice, so the next M turn can take it down.",
  "lse.ulur.over-slice-across":
    "{move} moves the {edge} edge to the {pos}, over the middle slice, so the next M turn can carry it across the top.",
  "lse.ulur.other": "{move} sets up the white-orange and white-red edges.",

  "lse.ep.final-top": "{move} lines the top layer up with the blocks: the cube is solved!",
  "lse.ep.final-slice": "{move} turns the last middle-slice edges and the centers into place: the cube is solved!",
  "lse.ep.slice": "{move} turns the middle slice, carrying its four edges and the centers along (move {k} of {n} of this step).{centers}",
  "lse.ep.top":
    "{move} swaps the top front and top back edges, setting up the next middle-slice turn (move {k} of {n} of this step).",
  "lse.ep.other": "{move} sets up the last four edges (move {k} of {n} of this step).",
} as const;

export type ExplanationKey = keyof typeof EXPLANATIONS;

export interface MoveExplanation {
  /** The dictionary entry used. */
  key: ExplanationKey;
  /** The entry with its placeholders filled. */
  text: string;
}

/** Fill a dictionary entry. Throws when a placeholder has no value, so a broken template can't reach the screen. */
export function explain(key: ExplanationKey, vars: Record<string, string | number>): MoveExplanation {
  const text = EXPLANATIONS[key].replace(/\{(\w+)\}/g, (_, name: string) => {
    const value = vars[name];
    if (value === undefined) throw new Error(`Explanation ${key} needs {${name}}`);
    return String(value);
  });
  return { key, text };
}

export const isFallback = (key: ExplanationKey) => key.endsWith(".other");

// ---------------------------------------------------------------------------
// Names of pieces and places.

const CORNER_POS = [
  "top front-right",
  "top front-left",
  "top back-left",
  "top back-right",
  "bottom front-right",
  "bottom front-left",
  "bottom back-left",
  "bottom back-right",
] as const;
/** Corner position letters, cubejs order (to tell which edge spots touch a corner). */
const CORNER_LETTERS = ["URF", "UFL", "ULB", "UBR", "DFR", "DLF", "DBL", "DRB"] as const;
const EDGE_POS = [
  "top right",
  "top front",
  "top left",
  "top back",
  "bottom right",
  "bottom front",
  "bottom left",
  "bottom back",
  "middle front-right",
  "middle front-left",
  "middle back-left",
  "middle back-right",
] as const;
const EDGE_LETTERS = ["UR", "UF", "UL", "UB", "DR", "DF", "DL", "DB", "FR", "FL", "BL", "BR"] as const;

const CORNER_COLORS = [
  "white-green-red",
  "white-green-orange",
  "white-blue-orange",
  "white-blue-red",
  "yellow-green-red",
  "yellow-green-orange",
  "yellow-blue-orange",
  "yellow-blue-red",
] as const;
const EDGE_COLORS = [
  "white-red",
  "white-green",
  "white-orange",
  "white-blue",
  "yellow-red",
  "yellow-green",
  "yellow-orange",
  "yellow-blue",
  "green-red",
  "green-orange",
  "blue-orange",
  "blue-red",
] as const;

/** How each layer turns, as seen holding the cube with green in front. */
const LAYER_HOW: Record<string, [string, string]> = {
  R: ["right side up", "right side down"],
  r: ["right two layers up", "right two layers down"],
  L: ["left side down", "left side up"],
  M: ["middle slice down", "middle slice up"],
  U: ["top layer to the left", "top layer to the right"],
  D: ["bottom layer to the right", "bottom layer to the left"],
  F: ["front face clockwise", "front face counterclockwise"],
  B: ["back face counterclockwise as seen from the front", "back face clockwise as seen from the front"],
};

const HALF_TURN: Record<string, string> = {
  R: "right side",
  r: "right two layers",
  L: "left side",
  M: "middle slice",
  U: "top layer",
  D: "bottom layer",
  F: "front face",
  B: "back face",
};

/** Plain words for a move, e.g. "right side up", "top layer half turn". */
export function moveHow(move: Move): string {
  const how = LAYER_HOW[move[0]];
  if (!how) throw new Error(`No description for ${move}`);
  if (move.endsWith("2")) return `${HALF_TURN[move[0]]} half turn`;
  return move.endsWith("'") ? how[1] : how[0];
}

const remaining = (left: number) => (left === 1 ? "One more turn" : `${left} more turns`);
const list = (items: readonly string[]) =>
  items.length <= 1 ? items.join("") : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;

interface Piece extends TrackedPiece {
  /** e.g. "yellow-orange edge". */
  name: string;
}
const corner = (piece: number): Piece => ({ kind: "corner", piece, name: `${CORNER_COLORS[piece]} corner` });
const edge = (piece: number): Piece => ({ kind: "edge", piece, name: `${EDGE_COLORS[piece]} edge` });
/** Just the colors, e.g. "yellow-orange" (templates add "corner" or "edge"). */
const colors = (p: Piece) => (p.kind === "corner" ? CORNER_COLORS : EDGE_COLORS)[p.piece];

const posOf = (s: CubeState, p: TrackedPiece) => (p.kind === "corner" ? s.cp.indexOf(p.piece) : s.ep.indexOf(p.piece));
const posName = (s: CubeState, p: TrackedPiece) => (p.kind === "corner" ? CORNER_POS : EDGE_POS)[posOf(s, p)];
const isHome = (s: CubeState, p: TrackedPiece) => pieceCoord(s, p) === p.piece * (p.kind === "corner" ? 3 : 2);
const moved = (a: CubeState, b: CubeState, p: TrackedPiece) => pieceCoord(a, p) !== pieceCoord(b, p);

// ---------------------------------------------------------------------------
// Blocks (first and second): bottom edge, then free / join / insert per pair.

interface Block {
  stage: "fb" | "sb";
  bottom: Piece;
  pairs: Record<PairId, { corner: Piece; edge: Piece; slot: string; label: string }>;
  stuck: (s: CubeState, p: TrackedPiece) => boolean;
  solved: (s: CubeState) => boolean;
  doneText: string;
}

const FB_STUCK_CORNERS = new Set<number>([CORNERS.DLF, CORNERS.DBL]);
const FB_STUCK_EDGES = new Set<number>([EDGES.FL, EDGES.BL, EDGES.DL]);
const SB_STUCK_EDGES = new Set<number>([EDGES.DR, EDGES.FR, EDGES.BR]);

const BLOCKS: Record<"fb" | "sb", Block> = {
  fb: {
    stage: "fb",
    bottom: edge(EDGES.DL),
    pairs: {
      front: { corner: corner(CORNERS.DLF), edge: edge(EDGES.FL), slot: "front-left", label: "front pair" },
      back: { corner: corner(CORNERS.DBL), edge: edge(EDGES.BL), slot: "back-left", label: "back pair" },
    },
    stuck: (s, p) => (p.kind === "corner" ? FB_STUCK_CORNERS : FB_STUCK_EDGES).has(posOf(s, p)),
    solved: isFirstBlockSolved,
    doneText: " The first block is complete!",
  },
  sb: {
    stage: "sb",
    bottom: edge(EDGES.DR),
    pairs: {
      front: { corner: corner(CORNERS.DFR), edge: edge(EDGES.FR), slot: "front-right", label: "front-right pair" },
      back: { corner: corner(CORNERS.DRB), edge: edge(EDGES.BR), slot: "back-right", label: "back-right pair" },
    },
    // Corners outside the top layer can only be in the right side's slots.
    stuck: (s, p) => (p.kind === "corner" ? posOf(s, p) >= 4 : SB_STUCK_EDGES.has(posOf(s, p))),
    solved: (s) => isFirstBlockSolved(s) && isSecondBlockSolved(s),
    doneText: " The second block is complete: both blocks are built!",
  },
};

/** Pieces that must be home at the end of a step, grouped as a learner sees them. */
interface KeptGroup {
  name: string;
  pieces: Piece[];
}

const joinedCache = new Map<string, Set<number>>();
function isJoined(s: CubeState, c: Piece, e: Piece): boolean {
  const key = `${c.piece}-${e.piece}`;
  let set = joinedCache.get(key);
  if (!set) joinedCache.set(key, (set = joinedPlacements(c, e)));
  return set.has(pieceCoord(s, c) * 24 + pieceCoord(s, e));
}
const adjacent = (s: CubeState, c: Piece, e: Piece) =>
  [...EDGE_LETTERS[posOf(s, e)]].every((l) => CORNER_LETTERS[posOf(s, c)].includes(l));

interface MoveContext<S> {
  step: S;
  move: Move;
  /** 1-based position of the move in its step, and the step's length. */
  k: number;
  n: number;
  before: CubeState;
  after: CubeState;
  /** The step's moves after this one. */
  rest: readonly Move[];
}

function explainOrient({ move, after }: MoveContext<unknown>): MoveExplanation {
  const yellowDown = after.center[3] === 3;
  const orangeLeft = after.center[4] === 4;
  if (yellowDown && orangeLeft) return explain("fb.orient.final", { move });
  if (yellowDown) return explain("fb.orient.yellow-down", { move });
  if (orangeLeft) return explain("fb.orient.orange-left", { move });
  return explain("fb.orient.partway", { move });
}

function explainBottomEdge(block: Block, c: MoveContext<unknown>): MoveExplanation {
  const keys =
    block.stage === "fb"
      ? (["fb.dl-edge.place", "fb.dl-edge.move", "fb.dl-edge.other"] as const)
      : (["sb.dr-edge.place", "sb.dr-edge.move", "sb.dr-edge.other"] as const);
  const { move, before, after, k, n } = c;
  if (k === n && isHome(after, block.bottom)) return explain(keys[0], { move });
  if (moved(before, after, block.bottom)) {
    return explain(keys[1], { move, pos: posName(after, block.bottom), remaining: remaining(n - k) });
  }
  return explain(keys[2], { move });
}

function keptGroups(block: Block, pair: PairId, start: CubeState): KeptGroup[] {
  const groups: KeptGroup[] = [{ name: `the ${block.bottom.name}`, pieces: [block.bottom] }];
  const done = block.pairs[pair === "front" ? "back" : "front"];
  groups.push({ name: `the finished ${done.label}`, pieces: [done.corner, done.edge] });
  return groups.filter((g) => g.pieces.every((p) => isHome(start, p)));
}

/** Names of kept groups as one phrase, plus the pronoun that refers back to them. */
const keptVars = (names: readonly string[]) => ({ kept: list(names), them: names.length > 1 ? "them" : "it" });

function explainPairMove(
  block: Block,
  pair: PairId,
  phase: "free" | "join" | "insert",
  kept: readonly KeptGroup[],
  c: MoveContext<unknown>,
): MoveExplanation {
  const { move, before, after, k, n, rest } = c;
  const { corner: pc, edge: pe, slot, label } = block.pairs[pair];
  const st = block.stage;
  const home = (s: CubeState, g: KeptGroup) => g.pieces.every((p) => isHome(s, p));
  const displacedGroups = kept.filter((g) => home(before, g) && !home(after, g));
  const displaced = displacedGroups.map((g) => g.name);
  const restored = kept.filter((g) => !home(before, g) && home(after, g)).map((g) => g.name);
  const cornerMoved = moved(before, after, pc);
  const edgeMoved = moved(before, after, pe);

  if (phase === "free") {
    const freed = [pc, pe].filter((p) => block.stuck(before, p) && !block.stuck(after, p));
    if (freed.length > 0) {
      const p = freed[0];
      const also = restored.length > 0 ? ` It also puts ${list(restored)} back.` : "";
      return explain(`${st}.free.lift`, { move, piece: p.name, from: posName(before, p), also });
    }
    if (restored.length > 0) {
      return k === n
        ? explain(`${st}.free.restore-final`, { move, ...keptVars(restored), pair: label })
        : explain(`${st}.free.restore`, { move, ...keptVars(restored) });
    }
    if (cornerMoved || edgeMoved) {
      const p = cornerMoved ? pc : pe;
      // Would the next turn have trapped the piece again without this one?
      const trapped = rest.length > 0 && block.stuck(applyMoves(before, [rest[0]]), p);
      return explain(trapped ? `${st}.free.aside` : `${st}.free.move`, { move, piece: p.name, pos: posName(after, p) });
    }
    if (displaced.length > 0) return explain(`${st}.free.open`, { move, ...keptVars(displaced) });
    return explain(`${st}.free.other`, { move, pair: label });
  }

  if (phase === "join") {
    if (k === n && isJoined(after, pc, pe)) {
      return explain(`${st}.join.final`, { move, corner: colors(pc), edge: colors(pe) });
    }
    const near = adjacent(after, pc, pe) ? ", side by side but not matching yet" : "";
    const lift =
      displaced.length > 0
        ? ` It also lifts ${list(displaced)}; this step puts ${keptVars(displaced).them} back.`
        : restored.length > 0
          ? ` It also puts ${list(restored)} back.`
          : "";
    const vars = { move, remaining: remaining(n - k), lift };
    if (cornerMoved && edgeMoved) {
      return explain(`${st}.join.both`, { ...vars, cpos: posName(after, pc), epos: posName(after, pe), near });
    }
    if (cornerMoved) {
      return explain(`${st}.join.corner`, {
        ...vars,
        corner: colors(pc),
        pos: posName(after, pc),
        near: near && ", next to its edge but not matching yet",
      });
    }
    if (edgeMoved) {
      return explain(`${st}.join.edge`, {
        ...vars,
        edge: colors(pe),
        pos: posName(after, pe),
        near: near && ", next to its corner but not matching yet",
      });
    }
    if (st === "sb" && restored.length > 0) return explain("sb.join.restore", { move, ...keptVars(restored) });
    if (st === "sb" && displaced.length > 0) {
      // A right-side turn that moves no pair piece yet: find the turn that puts
      // the lifted pieces back, and whether it carries a pair piece along.
      let s = after;
      for (const m of rest) {
        const next = applyMoves(s, [m]);
        if (displacedGroups.every((g) => home(next, g))) {
          if (moved(s, next, pc) || moved(s, next, pe)) {
            return explain("sb.join.lift-carry", { move, ...keptVars(displaced), back: m });
          }
          break;
        }
        s = next;
      }
      return explain("sb.join.lift", { move, ...keptVars(displaced) });
    }
    return explain(`${st}.join.other`, { move, corner: colors(pc), edge: colors(pe) });
  }

  // Insert: the pair stays joined on every move.
  if (k === n && isHome(after, pc) && isHome(after, pe)) {
    const also = restored.length > 0 ? ` and brings ${list(restored)} back` : "";
    return explain(`${st}.insert.final`, { move, slot, also, done: block.solved(after) ? block.doneText : "" });
  }
  if (cornerMoved || edgeMoved) {
    const pos = posName(after, pc);
    return displaced.length > 0
      ? explain(`${st}.insert.carry-lift`, { move, pos, ...keptVars(displaced) })
      : explain(`${st}.insert.carry`, { move, pos, slot, remaining: remaining(n - k) });
  }
  // The pair stays put: did the move turn its (empty) slot?
  const slotPos = applyMoves(solvedCube(), [move]).cp.indexOf(pc.piece);
  if (slotPos !== pc.piece) {
    return explain(`${st}.insert.open`, { move, slot, pos: CORNER_POS[slotPos], remaining: remaining(n - k) });
  }
  // A middle-slice turn ahead of a wide turn (which also turns the middle slice).
  const wide = rest.find((m) => m[0] === "r");
  if (st === "sb" && move[0] === "M" && wide) return explain("sb.insert.slice", { move, wide });
  return explain(`${st}.insert.other`, { move, slot });
}

let solvedCache: CubeState | undefined;
/** A solved cube, to see where a move takes a slot. */
const solvedCube = (): CubeState => (solvedCache ??= solvedState());

// ---------------------------------------------------------------------------
// CMLL.

/** The name learners know a case by: Sune / Anti-Sune nicknames, else "T 1", "O Adjacent". */
export function cmllCaseLabel(c: CmllCase): string {
  if (c.set === "S" || c.set === "AS") return c.nickname ?? c.name.replace(/^S /, "Sune ").replace(/^AS /, "Anti-Sune ");
  return c.name;
}

const blocksIntact = (s: CubeState) => ({ left: isFirstBlockSolved(s), right: isSecondBlockSolved(s) });
function blockName(b: { left: boolean; right: boolean }): string {
  if (!b.left && !b.right) return "left and right blocks";
  return b.left ? "right block" : "left block";
}

function explainCmll(
  c: MoveContext<CmllStep>,
  cmllCase: CmllCase | undefined,
  nextStep: string | undefined,
): MoveExplanation {
  const { step, move, before, after, k, n } = c;
  if (step.id === "cmll-pre-auf" && cmllCase) return explain("cmll.pre-auf", { move, set: CMLL_SETS[cmllCase.set].label });
  if (step.id === "cmll-post-auf") return explain(cmllCase ? "cmll.post-auf" : "cmll.skip-auf", { move });
  const cc = step.case;
  if (!cc) throw new Error(`CMLL step ${step.id} has no case`);
  const vars = { move, how: moveHow(move), case: cmllCaseLabel(cc), k, n };
  if (k === 1) return explain("cmll.alg.start", { ...vars, alg: cc.alg });
  if (k === n) {
    const auf = isCornersSolved(after)
      ? ""
      : nextStep === "cmll-post-auf"
        ? ", just turned: the next move lines them up"
        : ", just turned: the top layer gets lined up while solving the edges";
    return explain("cmll.alg.end", { ...vars, auf });
  }
  const was = blocksIntact(before);
  const now = blocksIntact(after);
  if ((was.left && !now.left) || (was.right && !now.right)) {
    return explain("cmll.alg.breaks", { ...vars, block: blockName({ left: now.left || !was.left, right: now.right || !was.right }) });
  }
  if ((!was.left && now.left) || (!was.right && now.right)) {
    return explain("cmll.alg.restores", { ...vars, block: blockName({ left: !now.left || was.left, right: !now.right || was.right }) });
  }
  return explain("cmll.alg.middle", vars);
}

// ---------------------------------------------------------------------------
// LSE.

const SLOT_TEXT: Record<string, string> = {
  UR: "top right",
  UF: "top front",
  UL: "top left",
  UB: "top back",
  DF: "bottom front",
  DB: "bottom back",
};
/** The middle slice is a quarter turn off: white and yellow centers face front and back. */
const sliceQuarterOff = (s: CubeState) => s.center[0] === 2 || s.center[0] === 5;
/** Where the bad edges are, e.g. "all four top edges and bottom front". */
function badWhere(slots: readonly string[]): string {
  if (slots.length === 6) return "all six edges";
  const top = slots.filter((s) => s[0] === "U");
  const parts = top.length === 4 ? ["all four top edges", ...slots.filter((s) => s[0] === "D").map((s) => SLOT_TEXT[s])] : slots.map((s) => SLOT_TEXT[s]);
  return list(parts);
}
const badCount = (n: number) => (n === 1 ? "1 bad edge" : `${n} bad edges`);
const isQuarterU = (m: Move | undefined) => m === "U" || m === "U'";

function explainEo(c: MoveContext<LseStep>, nextMove: Move | undefined): MoveExplanation {
  const { move, before, after, k, n } = c;
  const badBefore = lseBadEdges(before);
  const badAfter = lseBadEdges(after);
  if (k === n && badAfter.length === 0) return explain("lse.eo.final", { move });
  const where = badWhere(badAfter);
  if (move[0] === "U") {
    if (isQuarterU(move) && sliceQuarterOff(before)) {
      return explain("lse.eo.flip", { move, before: badCount(badBefore.length), after: badAfter.length });
    }
    const why = sliceQuarterOff(before)
      ? "A half turn never changes which edges are bad."
      : "With the middle slice straight, turning the top never changes which edges are bad.";
    return explain("lse.eo.top", { move, where, why });
  }
  if (move[0] === "M") {
    const next =
      sliceQuarterOff(after) && isQuarterU(nextMove)
        ? " The slice is now a quarter turn off, so the next top turn flips the top edges."
        : "";
    return explain("lse.eo.slice", { move, where, next });
  }
  return explain("lse.eo.other", { move });
}

const UL_EDGE = edge(EDGES.UL);
const UR_EDGE = edge(EDGES.UR);
/** Where each of the two edges belongs right now: between its own top corners. */
function ulurTargets(s: CubeState) {
  const target = (c1: number, c2: number) => {
    const a = s.cp.indexOf(c1);
    const b = s.cp.indexOf(c2);
    const shared = [...CORNER_LETTERS[a]].filter((l) => CORNER_LETTERS[b].includes(l));
    return EDGE_LETTERS.findIndex((e) => e.length === 2 && [...e].every((l) => shared.includes(l)));
  };
  return [
    { piece: UL_EDGE, color: "orange", spot: target(CORNERS.UFL, CORNERS.ULB) },
    { piece: UR_EDGE, color: "red", spot: target(CORNERS.URF, CORNERS.UBR) },
  ];
}

function explainUlur(c: MoveContext<LseStep>): MoveExplanation {
  const { move, before, after, k, n, rest } = c;
  const targets = ulurTargets(after);
  if (k === n) {
    const half = after.cp[0] === CORNERS.URF ? "" : " (a half turn off for now, so they look swapped; the last step fixes that)";
    return explain(move[0] === "U" ? "lse.ulur.final-top" : "lse.ulur.final", { move, half });
  }
  if (move[0] === "M") {
    type Effect = "up-home" | "across-home" | "up" | "across" | "down" | "along-bottom";
    const effects = targets
      .filter((t) => moved(before, after, t.piece))
      .map((t) => {
        const pos = posOf(after, t.piece);
        const wasTop = posOf(before, t.piece) < 4;
        const kind: Effect =
          pos >= 4
            ? wasTop
              ? "down"
              : "along-bottom"
            : pos === t.spot
              ? wasTop
                ? "across-home"
                : "up-home"
              : wasTop
                ? "across"
                : "up";
        return { t, kind };
      })
      // An edge that only moves along the bottom isn't worth a mention next to another effect.
      .filter((e, _, all) => e.kind !== "along-bottom" || all.length === 1);
    const straightens = sliceQuarterOff(before) && !sliceQuarterOff(after);
    if (effects.length === 0 || (straightens && effects.every((e) => e.kind === "along-bottom"))) {
      if (straightens) return explain("lse.ulur.straighten", { move });
      return explain("lse.ulur.other", { move });
    }
    const order: Record<Effect, number> = { "up-home": 0, "across-home": 1, up: 2, across: 3, down: 4, "along-bottom": 5 };
    effects.sort((a, b) => order[a.kind] - order[b.kind]);
    const [first, second] = effects;
    const phrase = ({ t, kind }: (typeof effects)[number]) => {
      const name = `the ${colors(t.piece)} edge`;
      switch (kind) {
        case "up-home":
          return `brings ${name} up between its ${t.color} corners`;
        case "across-home":
          return `moves ${name} across the top to sit between its ${t.color} corners`;
        case "up":
          return `brings ${name} up`;
        case "across":
          return `moves ${name} across the top`;
        case "down":
          return `sends ${name} down for now`;
        case "along-bottom":
          return `moves ${name} along the bottom`;
      }
    };
    const straightened = straightens ? " The middle slice is straight again." : "";
    const also = (second ? ` It also ${phrase(second)}.` : "") + straightened;
    const vars = { move, edge: colors(first.t.piece), color: first.t.color, pos: posName(after, first.t.piece), also };
    return explain(`lse.ulur.${first.kind}`, vars);
  }
  // A top-layer turn changes what sits over the middle slice (front and
  // back), which decides what the next M turn moves. Say why from what that
  // next turn actually does.
  const next = rest[0];
  const afterNext = next ? applyMoves(after, [next]) : after;
  const nextTargets = ulurTargets(afterNext);
  const placedByNext = nextTargets.find(
    (t, i) => posOf(after, t.piece) !== targets[i].spot && posOf(afterNext, t.piece) === t.spot,
  );
  if (placedByNext && overSlice(placedByNext.spot)) {
    return explain("lse.ulur.spot", {
      move,
      color: placedByNext.color,
      where: placedByNext.spot === EDGES.UF ? "front" : "back",
      edge: colors(placedByNext.piece),
    });
  }
  const takenDown = targets.find((t) => overSlice(posOf(after, t.piece)) && posOf(afterNext, t.piece) >= 4);
  if (takenDown) {
    return explain("lse.ulur.over-slice", { move, edge: colors(takenDown.piece), pos: posName(after, takenDown.piece) });
  }
  const movedAcross = targets.find((t) => overSlice(posOf(after, t.piece)) && moved(after, afterNext, t.piece));
  if (movedAcross) {
    return explain("lse.ulur.over-slice-across", { move, edge: colors(movedAcross.piece), pos: posName(after, movedAcross.piece) });
  }
  return explain("lse.ulur.other", { move });
}

/** Edge spots over the middle slice: an M turn moves whatever sits there. */
const overSlice = (pos: number) => pos === EDGES.UF || pos === EDGES.UB;

function explainEp(c: MoveContext<LseStep>): MoveExplanation {
  const { move, after, k, n } = c;
  // The case itself (e.g. "3-cycle (yellow-blue in place)") is in the step's name.
  const vars = { move, k, n };
  if (k === n) return explain(move[0] === "U" ? "lse.ep.final-top" : "lse.ep.final-slice", { move });
  if (move[0] === "M") {
    const centers = after.center[0] === 0 ? " The white center is back on top." : "";
    return explain("lse.ep.slice", { ...vars, centers });
  }
  if (move === "U2") return explain("lse.ep.top", vars);
  return explain("lse.ep.other", vars);
}

// ---------------------------------------------------------------------------

/**
 * Explain every move of a Roux solve, in order (one entry per move of
 * solution.moves). `start` is the cube the solve starts from.
 */
export function explainRouxSolution(start: CubeState, solution: RouxSolution): MoveExplanation[] {
  const out: MoveExplanation[] = [];
  let state = start;
  /** Play each step's moves, explaining each with `fn` (si = step index). */
  function walk<S extends SolveStep>(steps: readonly S[], fn: (c: MoveContext<S>, si: number) => MoveExplanation) {
    steps.forEach((step, si) =>
      step.moves.forEach((move, i) => {
        const after = applyMoves(state, [move]);
        out.push(fn({ step, move, k: i + 1, n: step.moves.length, before: state, after, rest: step.moves.slice(i + 1) }, si));
        state = after;
      }),
    );
  }

  const [fb, sb, cmll, lse] = solution.stages;
  for (const stage of [fb, sb]) {
    const block = BLOCKS[stage.stage];
    let kept: KeptGroup[] = [];
    walk<SolveStep>(stage.steps, (c) => {
      if (c.step.id === "orient") return explainOrient(c);
      if (c.step.id === "dl-edge" || c.step.id === "dr-edge") return explainBottomEdge(block, c);
      const m = /^(front|back)(?:-right)?-pair-(free|join|insert)$/.exec(c.step.id);
      if (!m) throw new Error(`Unknown block step ${c.step.id}`);
      const pair = m[1] as PairId;
      // Pieces already home when the step starts must be home again when it ends.
      if (c.k === 1) kept = keptGroups(block, pair, c.before);
      return explainPairMove(block, pair, m[2] as "free" | "join" | "insert", kept, c);
    });
  }
  const cmllCase = cmll.steps.find((s) => s.id === "cmll")?.case;
  walk(cmll.steps, (c, si) => explainCmll(c, cmllCase, cmll.steps[si + 1]?.id));
  walk(lse.steps, (c) =>
    c.step.id === "lse-eo"
      ? explainEo(c, c.step.moves[c.k])
      : c.step.id === "lse-ulur"
        ? explainUlur(c)
        : explainEp(c),
  );
  return out;
}

/** Top corners solved relative to the blocks, top layer lined up. */
function isCornersSolved(s: CubeState): boolean {
  return [0, 1, 2, 3].every((i) => s.cp[i] === i && s.co[i] === 0);
}
