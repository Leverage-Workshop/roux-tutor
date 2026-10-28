// The CMLL algorithm table: one human algorithm for each of the 42 top-corner
// cases, grouped in the usual 8 sets by how the top color is twisted:
//   O   all four corners show the top color on top (only a swap is left)
//   H   none on top, two pairs facing opposite sides
//   Pi  none on top, one side shows two of them
//   U   two neighboring corners on top, the other two face the same side
//   T   two neighboring corners on top, the other two face opposite sides
//   S   one corner on top, the Sune twist
//   AS  one corner on top, the Anti-Sune twist
//   L   two diagonal corners on top
// "Top color" is the color opposite the blocks' bottom (white when the
// bottom is yellow), whatever the top center shows: after the blocks the
// middle slice may still be turned.
//
// Every algorithm keeps both blocks solved and turns no whole cube (no x, y,
// z), so the left and right centers stay put; the middle-slice edges and
// centers may move (LSE solves them). cmllCases.test.ts checks this for each
// one, and that the 42 algorithms solve 42 different cases that together
// cover every top-corner state.
//
// Algorithms are the common ones from human CMLL sheets. Two were swapped
// after checking them by computer: the remembered H 3 solved a Pi case, and
// the remembered S 4 broke the second block; S 4 now uses a 10-move
// commutator-style algorithm found by a block-keeping search.
//
// Recognition notes are worked out from the case itself (see describeCase),
// so they always match the algorithm's starting position.
import { solvedState, applyMoves, toFacelets } from "@/lib/cube/model";
import { invertAlgorithm, parseAlgorithm, type Move } from "@/lib/cube/notation";

export type CmllSet = "O" | "H" | "Pi" | "U" | "T" | "S" | "AS" | "L";

export interface CmllCase {
  /** Stable id, e.g. "t-2"; explanations can key on it. */
  id: string;
  set: CmllSet;
  /** Short name, e.g. "T 2" or "O Adjacent". */
  name: string;
  /** Well-known name of the algorithm, when it has one. */
  nickname?: string;
  /** The algorithm as written on a CMLL sheet. */
  alg: string;
  moves: Move[];
  /**
   * How the case looks from the front, top layer turned so the algorithm
   * can start: where the top color faces, then side-sticker patterns.
   */
  recognition: string;
}

export const CMLL_SETS: Record<CmllSet, { label: string; shape: string }> = {
  O: { label: "O", shape: "all four corners show the top color on top; they only need swapping" },
  H: { label: "H", shape: "no corner shows the top color on top; it faces out in two pairs on opposite sides" },
  Pi: { label: "Pi", shape: "no corner shows the top color on top; one side shows two of them" },
  U: { label: "U", shape: "two neighboring corners show the top color on top; the other two face the same side" },
  T: { label: "T", shape: "two neighboring corners show the top color on top; the other two face opposite sides" },
  S: { label: "Sune", shape: "one corner shows the top color on top; the other three are twisted like a Sune" },
  AS: { label: "Anti-Sune", shape: "one corner shows the top color on top; the other three are twisted like an Anti-Sune" },
  L: { label: "L", shape: "two diagonal corners show the top color on top" },
};

/** [set, algorithm, name override, nickname]. Numbered names follow this order within a set. */
const TABLE: readonly (readonly [CmllSet, string, string?, string?])[] = [
  ["O", "R U R' F' R U R' U' R' F R2 U' R'", "O Adjacent", "Jb perm"],
  ["O", "r2 D r' U r D' R2 U' F' U' F", "O Diagonal"],

  ["H", "R U2 R' U' R U R' U' R U' R'"],
  ["H", "F R U R' U' R U R' U' R U R' U' F'"],
  ["H", "R U2 R2 F R F' U2 R' F R F'"],
  ["H", "r U' r2 D' r U' r' D r2 U r'"],

  ["Pi", "F R U R' U' R U R' U' F'"],
  ["Pi", "F R' F' R U2 R U' R' U R U2 R'"],
  ["Pi", "R' F R U F U' R U R' U' F'"],
  ["Pi", "R U2 R' U' R U R' U2 R' F R F'"],
  ["Pi", "r U' r2 D' r U r' D r2 U r'"],
  ["Pi", "R' U' R' F R F' R U' R' U2 R"],

  ["U", "R2 D R' U2 R D' R' U2 R'"],
  ["U", "R2 D' R U2 R' D R U2 R"],
  ["U", "R2 F U' F U F2 R2 U' R' F R"],
  ["U", "F R2 D R' U R D' R2 U' F'"],
  ["U", "r U' r' U r' D' r U' r' D r"],
  ["U", "F R U R' U' F'"],

  ["T", "R U R' U' R' F R F'"],
  ["T", "L' U' L U L F' L' F"],
  ["T", "F R' F R2 U' R' U' R U R' F2"],
  ["T", "r' U r U2 R2 F R F' R"],
  ["T", "r' D' r U r' D r U' r U r'"],
  ["T", "r2 D' r U r' D r2 U' r' U' r"],

  ["S", "R U R' U R U2 R'", undefined, "Sune"],
  ["S", "L' U2 L U2 L F' L' F"],
  ["S", "F R' F' R U2 R U2 R'"],
  ["S", "F R' U2 R F' R' F U2 F' R"],
  ["S", "R U R' U R' F R F' R U2 R'"],
  ["S", "R U' L' U R' U' L"],

  ["AS", "R' U' R U' R' U2 R", undefined, "Anti-Sune"],
  ["AS", "R2 D R' U R D' R' U R' U' R U' R'"],
  ["AS", "F' L F L' U2 L' U2 L"],
  ["AS", "R U2 R' U2 R' F R F'"],
  ["AS", "L' U R U' L U R'"],
  ["AS", "R' U' R U' R' U R' F R F' U R"],

  ["L", "F R U' R' U' R U R' F'"],
  ["L", "F R' F' R U R U' R'"],
  ["L", "R U2 R' U' R U R' U' R U R' U' R U' R'"],
  ["L", "R U2 R D R' U2 R D' R2"],
  ["L", "R' U' R U R' F' R U R' U' R' F R2"],
  ["L", "R' U2 R' D' R U2 R' D R2"],
];

// --- Recognition -----------------------------------------------------------
// Facelet indexes (Kociemba order, see model.ts) of the top-layer corners.
type CornerName = "front-left" | "front-right" | "back-right" | "back-left";
type FaceName = "left" | "front" | "right" | "back";
const TOP_STICKERS: readonly { corner: CornerName; index: number }[] = [
  { corner: "front-left", index: 6 },
  { corner: "front-right", index: 8 },
  { corner: "back-right", index: 2 },
  { corner: "back-left", index: 0 },
];
/** The two top-row corner stickers of each side face, in pairs. */
const SIDE_STICKERS: readonly { face: FaceName; corner: CornerName; index: number }[] = [
  { face: "left", corner: "back-left", index: 36 },
  { face: "left", corner: "front-left", index: 38 },
  { face: "front", corner: "front-left", index: 18 },
  { face: "front", corner: "front-right", index: 20 },
  { face: "right", corner: "front-right", index: 9 },
  { face: "right", corner: "back-right", index: 11 },
  { face: "back", corner: "back-right", index: 45 },
  { face: "back", corner: "back-left", index: 47 },
];
/** Side colors in order around the top layer, so differences mod 4 say same / neighbor / opposite. */
const SIDE_ORDER: Record<string, number> = { F: 0, R: 1, B: 2, L: 3 };
type Relation = "same" | "neighbor" | "opposite";

interface View {
  /** Index of the case in TABLE (-1 for solved corners). */
  owner: number;
  /** Where the top color faces on each corner (TOP_STICKERS order). */
  top: string;
  /** Relation of each pair of side stickers that both show a side color, keyed "i-j". */
  relations: Map<string, Relation>;
}

/** What is visible on the top layer, independent of which colors exactly (so of the final U turn). */
function view(facelets: string, owner: number): View {
  const top = TOP_STICKERS.map(({ corner, index }) =>
    facelets[index] === "U" ? "up" : SIDE_STICKERS.find((s) => s.corner === corner && facelets[s.index] === "U")!.face,
  ).join(",");
  const relations = new Map<string, Relation>();
  for (let i = 0; i < SIDE_STICKERS.length; i++) {
    for (let j = i + 1; j < SIDE_STICKERS.length; j++) {
      const a = facelets[SIDE_STICKERS[i].index];
      const b = facelets[SIDE_STICKERS[j].index];
      if (a === "U" || b === "U") continue;
      const diff = (SIDE_ORDER[b] - SIDE_ORDER[a] + 4) % 4;
      relations.set(`${i}-${j}`, diff === 0 ? "same" : diff === 2 ? "opposite" : "neighbor");
    }
  }
  return { owner, top, relations };
}

const relationsKey = (v: View) => [...v.relations].map(([k, r]) => `${k}${r}`).join(",");
const SAME_FACE = new Set(["0-1", "2-3", "4-5", "6-7"]);
const SAME_FACE_TEXT: Record<Relation, string> = {
  same: "matching colors (a bar)",
  neighbor: "neighboring colors",
  opposite: "opposite colors",
};
const PAIR_TEXT: Record<Relation, string> = { same: "match", neighbor: "are neighboring colors", opposite: "are opposite colors" };
const capitalize = (s: string) => s[0].toUpperCase() + s.slice(1);
const joinAnd = (items: readonly string[]) =>
  items.length <= 1 ? items.join("") : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;

function topText(top: string): string {
  const faces = top.split(",");
  if (faces.every((f) => f === "up")) return "Top color: on top at all four corners.";
  const groups = new Map<string, CornerName[]>();
  faces.forEach((face, i) => groups.set(face, [...(groups.get(face) ?? []), TOP_STICKERS[i].corner]));
  const parts = [...groups].map(([face, corners]) => `${face === "up" ? "on top" : `facing ${face}`} at ${joinAnd(corners)}`);
  // "On top" first, then the rest in corner order.
  parts.sort((a, b) => Number(b.startsWith("on top")) - Number(a.startsWith("on top")));
  return `Top color: ${parts.join("; ")}.`;
}

function factText(key: string, relation: Relation): string {
  const [i, j] = key.split("-").map(Number);
  if (SAME_FACE.has(key)) return `${capitalize(SIDE_STICKERS[i].face)} side: ${SAME_FACE_TEXT[relation]}.`;
  const sticker = (k: number) => `the ${SIDE_STICKERS[k].corner} corner's ${SIDE_STICKERS[k].face} sticker`;
  return `${capitalize(sticker(i))} and ${sticker(j)} ${PAIR_TEXT[relation]}.`;
}

/**
 * Describe a case as seen when its algorithm starts: where the top color
 * faces, every side with two side colors (bar, opposite or neighboring
 * colors), then just enough sticker comparisons across sides to tell it
 * apart from every other case (or this case turned) with the same top-color
 * pattern.
 */
function describeCase(start: View, others: readonly View[]): string {
  const looksSame = others.filter((o) => o.top === start.top && relationsKey(o) === relationsKey(start));
  if (looksSame.some((o) => o.owner !== start.owner)) throw new Error("Two CMLL cases look the same");
  const rivals = others.filter((o) => o.top === start.top && relationsKey(o) !== relationsKey(start));
  const differs = (o: View, chosen: readonly string[]) => chosen.some((k) => o.relations.get(k) !== start.relations.get(k));
  const chosen = [...start.relations.keys()].filter((k) => SAME_FACE.has(k));
  let rest = [...start.relations.keys()].filter((k) => !SAME_FACE.has(k));
  while (rivals.some((o) => !differs(o, chosen))) {
    const left = rivals.filter((o) => !differs(o, chosen));
    const pick = rest.reduce((a, b) => {
      const score = (k: string) => left.filter((o) => o.relations.get(k) !== start.relations.get(k)).length;
      return score(b) > score(a) ? b : a;
    });
    chosen.push(pick);
    rest = rest.filter((k) => k !== pick);
  }
  return [topText(start.top), ...chosen.map((k) => factText(k, start.relations.get(k)!))].join(" ");
}

const AUFS: readonly Move[][] = [[], ["U"], ["U'"], ["U2"]];

function buildCases(): CmllCase[] {
  const counts = new Map<CmllSet, number>();
  const raw = TABLE.map(([set, alg, name, nickname]) => {
    const n = (counts.get(set) ?? 0) + 1;
    counts.set(set, n);
    const moves = parseAlgorithm(alg);
    const id = name ? name.toLowerCase().replace(/\s+/g, "-") : `${set.toLowerCase()}-${n}`;
    const start = applyMoves(solvedState(), invertAlgorithm(moves));
    return { id, set, name: name ?? `${set} ${n}`, nickname, alg, moves, start };
  });
  // Every case (and the solved corners) seen from all four sides.
  const views = [solvedState(), ...raw.map((c) => c.start)].flatMap((state, i) =>
    AUFS.map((auf) => view(toFacelets(applyMoves(state, auf)), i - 1)),
  );
  return raw.map(({ start, nickname, ...c }, i) => ({
    ...c,
    ...(nickname ? { nickname } : {}),
    recognition: describeCase(view(toFacelets(start), i), views),
  }));
}

let cases: CmllCase[] | undefined;
/** All 42 CMLL cases with their algorithms, in sheet order (O, H, Pi, U, T, S, AS, L). */
export function cmllCases(): readonly CmllCase[] {
  return (cases ??= buildCases());
}
