import { describe, expect, it } from "vitest";
import { applyMoves, solvedState } from "@/lib/cube/model";
import { parseAlgorithm, type Move } from "@/lib/cube/notation";
import { lseBadEdges } from "@/lib/solver/lse";
import { solveRoux } from "@/lib/solver/roux";
import { DEMO_HELD_SCRAMBLE } from "./demoLesson";
import { EXPLANATIONS, explain, explainRouxSolution, isFallback, moveHow, type ExplanationKey } from "./explanations";

// Face turns plus slice and wide turns (so many solves start with turned centers),
// and a whole-cube rotation on most scrambles (so the solve starts with "orient").
const SCRAMBLE_MOVES = parseAlgorithm("U U' U2 D D' D2 F F' F2 B B' B2 L L' L2 R R' R2 M M' M2 E E' S S' r u' f2");
const ROTATIONS = ["", "x", "y'", "z2", "x y", "z' y2", "x2 y'", "z x'"];

/** Repeatable random-move scrambles (Park-Miller generator, fixed seed). */
function scrambles(count: number, length = 25): string[] {
  let seed = 10102026;
  const next = () => (seed = (seed * 48271) % 2147483647);
  return Array.from({ length: count }, (_, i) => {
    const moves: Move[] = [];
    while (moves.length < length) {
      const move = SCRAMBLE_MOVES[next() % SCRAMBLE_MOVES.length];
      if (moves.length > 0 && moves[moves.length - 1][0] === move[0]) continue;
      moves.push(move);
    }
    return `${moves.join(" ")} ${ROTATIONS[i % ROTATIONS.length]}`.trim();
  });
}

/** Every move of a scramble's solve with its step, stage and explanation. */
function explained(scramble: string) {
  const start = applyMoves(solvedState(), scramble);
  const solution = solveRoux(start);
  const explanations = explainRouxSolution(start, solution);
  let i = 0;
  let state = start;
  return solution.stages.flatMap((stage) =>
    stage.steps.flatMap((step) =>
      step.moves.map((move) => {
        const before = state;
        state = applyMoves(state, [move]);
        return { stage: stage.stage, step, move, before, after: state, ...explanations[i++] };
      }),
    ),
  );
}

const SLOT_TEXT: Record<string, string> = {
  UR: "top right",
  UF: "top front",
  UL: "top left",
  UB: "top back",
  DF: "bottom front",
  DB: "bottom back",
};

describe("explanation dictionary", () => {
  it("gives every move of 240 random solves its own entry (never a fallback), at most 240 characters for a phone screen", () => {
    const used = new Map<ExplanationKey, number>();
    let moves = 0;
    for (const scramble of scrambles(240)) {
      const start = applyMoves(solvedState(), scramble);
      const solution = solveRoux(start);
      const explanations = explainRouxSolution(start, solution);
      expect(explanations, scramble).toHaveLength(solution.moves.length);
      // Entries are keyed by stage first ("fb.join.final").
      const stageOf = solution.stages.flatMap((s) => s.moves.map(() => s.stage));
      explanations.forEach(({ key, text }, i) => {
        const label = `${scramble} / move ${i + 1} ${solution.moves[i]}: ${key}`;
        expect(EXPLANATIONS[key], label).toBeDefined();
        expect(isFallback(key), label).toBe(false);
        expect(key.split(".")[0], label).toBe(stageOf[i]);
        // Leads with the move ("R' joins ...", "U': with ...").
        expect(text.startsWith(solution.moves[i]) && [" ", ":"].includes(text[solution.moves[i].length]), label).toBe(true);
        expect(text, label).not.toMatch(/[{}]|undefined|NaN/);
        expect(text, label).toMatch(/[.!)]$/);
        expect(text.length, label).toBeLessThanOrEqual(240);
        used.set(key, (used.get(key) ?? 0) + 1);
      });
      moves += explanations.length;
    }
    expect(moves).toBeGreaterThan(10_000);
    // Each stage's main entries all come up.
    for (const key of [
      "fb.orient.final",
      "fb.dl-edge.place",
      "fb.free.lift",
      "fb.join.final",
      "fb.join.corner",
      "fb.join.edge",
      "fb.insert.carry",
      "fb.insert.final",
      "sb.dr-edge.move",
      "sb.free.lift",
      "sb.free.restore-final",
      "sb.join.final",
      "sb.insert.open",
      "sb.insert.carry-lift",
      "sb.insert.final",
      "cmll.pre-auf",
      "cmll.alg.start",
      "cmll.alg.middle",
      "cmll.alg.breaks",
      "cmll.alg.restores",
      "cmll.alg.end",
      "lse.eo.flip",
      "lse.eo.slice",
      "lse.eo.final",
      "lse.ulur.up-home",
      "lse.ulur.down",
      "lse.ulur.spot",
      "lse.ulur.final-top",
      "lse.ep.slice",
      "lse.ep.top",
      "lse.ep.final-slice",
    ] as const) {
      expect(used.get(key) ?? 0, key).toBeGreaterThan(0);
    }
  }, 60_000);

  it("only lists bad edges that really are bad, and counts them right when the top flips them", () => {
    for (const scramble of scrambles(60)) {
      for (const m of explained(scramble).filter((m) => m.step.id === "lse-eo")) {
        const bad = lseBadEdges(m.after);
        if (m.key === "lse.eo.slice" || m.key === "lse.eo.top") {
          const where = m.text
            .replace("all six edges", "top right, top front, top left, top back, bottom front, bottom back")
            .replace("all four top edges", "top right, top front, top left, top back");
          const listed = Object.entries(SLOT_TEXT).filter(([, text]) => where.includes(text)).map(([slot]) => slot);
          expect(listed.sort(), `${scramble}: ${m.text}`).toEqual([...bad].sort());
        }
        if (m.key === "lse.eo.flip") {
          expect(m.text).toContain(`${lseBadEdges(m.before).length} bad edge`);
          expect(m.text).toContain(`, ${bad.length} now)`);
        }
        if (m.key === "lse.eo.final") expect(bad).toEqual([]);
      }
    }
  }, 30_000);

  it("names the right pieces, case and progress in the demo solve", () => {
    const moves = explained(DEMO_HELD_SCRAMBLE);
    const inStep = (id: string) => moves.filter((m) => m.step.id === id);

    // First block: the back corner was stuck in the front slot; the front pair joins with R'.
    expect(inStep("back-pair-free").map((m) => m.text)).toEqual([
      "F' gets the yellow-blue-orange corner out of the bottom front-left, where it was stuck: U, R, r and M can't reach the left side.",
    ]);
    const frontJoin = inStep("front-pair-join");
    expect(frontJoin.at(-1)).toMatchObject({
      key: "fb.join.final",
      text: "R' joins the yellow-green-orange corner and the green-orange edge: they now sit side by side with matching colors, ready to go in as one piece.",
    });
    expect(frontJoin[0].text).toContain("3 more turns to join them");
    expect(inStep("front-pair-insert").at(-1)?.text).toBe("F slots the joined pair into the front-left. The first block is complete!");

    // Second block: the slot opens, the pair drops in, the bottom-right edge comes back.
    expect(inStep("back-right-pair-insert").map((m) => m.key)).toEqual(["sb.insert.open", "sb.insert.carry", "sb.insert.final"]);
    expect(inStep("back-right-pair-insert")[2].text).toBe(
      "R slots the joined pair into the back-right and brings the yellow-red edge back.",
    );

    // CMLL: Anti-Sune, recognized after a pre-turn.
    const pre = inStep("cmll-pre-auf");
    expect(pre.map((m) => m.text)).toEqual([
      "U' turns the top layer so the Anti-Sune case sits the way you recognize it and its algorithm starts. Only the top layer moves.",
    ]);
    const alg = inStep("cmll");
    expect(alg.map((m) => m.move).join(" ")).toBe("R' U' R U' R' U2 R");
    expect(alg[0].text).toBe(
      "R' (right side down) starts the Anti-Sune algorithm, R' U' R U' R' U2 R. Learn it as one sequence: it solves all four top corners at once.",
    );
    expect(alg[5].text).toBe("U2 (top layer half turn): move 6 of 7 of the Anti-Sune algorithm.");
    expect(alg[6].key).toBe("cmll.alg.end");
    expect(alg.every((m) => m.text.includes("Anti-Sune algorithm"))).toBe(true);

    // LSE: arrow edge orientation, then UL/UR, then only the centers.
    const eo = inStep("lse-eo");
    expect(eo[0].step.name).toContain("arrow");
    expect(eo.map((m) => m.key)).toEqual(["lse.eo.top", "lse.eo.slice", "lse.eo.final"]);
    expect(inStep("lse-ep").map((m) => m.text)).toEqual([
      "M2 turns the last middle-slice edges and the centers into place: the cube is solved!",
    ]);
  });

  it("explains small exact cases", () => {
    const texts = (scramble: string) => explained(scramble).map((m) => m.text);
    const keys = (scramble: string) => explained(scramble).map((m) => m.key);

    expect(keys("x y")).toEqual(["fb.orient.partway", "fb.orient.final"]);
    expect(keys("z2 y")).toEqual(["fb.orient.yellow-down", "fb.orient.final"]);

    // Second block pair: R U R' undone by opening the slot, moving the pair over it, closing it.
    expect(texts("R U R'")).toEqual([
      "R turns the front-right slot to the top front-right to meet the pair, which doesn't move. 2 more turns to bring the slot back with the pair in it.",
      "U' moves the joined pair to the top front-right without splitting it. One more turn to slot it into the front-right.",
      "R' slots the joined pair into the front-right and brings the yellow-red edge and the finished back-right pair back. The second block is complete: both blocks are built!",
    ]);
    expect(texts("R U' R'")[1]).toBe(
      "r moves the joined pair to the top back-right without splitting it. It also lifts the yellow-red edge and the finished back-right pair; this step puts them back.",
    );

    // CMLL: a Sune.
    const sune = explained("R U2 R' U' R U' R'");
    expect(sune.map((m) => m.step.id)).toEqual(Array(7).fill("cmll"));
    expect(sune[2].text).toBe("R' (right side down): move 3 of 7 of the Sune algorithm.");
    expect(sune[6].text).toBe("R' finishes the Sune algorithm: both blocks are back and the four top corners are solved.");

    // LSE.
    expect(texts("M' U M U2 M' U M")[1]).toBe(
      "U': with the middle slice a quarter turn off, a quarter turn of the top flips all four top edges between good and bad (2 bad edges before, 4 now).",
    );
    expect(keys("M2 U2 M2 U2")).toEqual(["lse.ep.top", "lse.ep.slice", "lse.ep.top", "lse.ep.final-slice"]);
    expect(keys("U")).toEqual(["lse.ulur.final-top"]);
  });
});

describe("explain", () => {
  it("fills placeholders and refuses to leave one empty", () => {
    expect(explain("fb.dl-edge.move", { move: "B", pos: "middle back-left", remaining: "One more turn" }).text).toBe(
      "B moves the yellow-orange edge to the middle back-left. One more turn to drop it into the bottom-left.",
    );
    expect(() => explain("fb.dl-edge.move", { move: "B" })).toThrow(/\{pos\}/);
  });

  it("starts every entry with the move, as the drawer shows it next to the big notation", () => {
    for (const [key, template] of Object.entries(EXPLANATIONS)) expect(template.startsWith("{move}"), key).toBe(true);
  });

  it("describes moves in plain words", () => {
    expect(moveHow("R")).toBe("right side up");
    expect(moveHow("R'")).toBe("right side down");
    expect(moveHow("U'")).toBe("top layer to the right");
    expect(moveHow("M2")).toBe("middle slice half turn");
    expect(moveHow("F")).toBe("front face clockwise");
    expect(moveHow("r'")).toBe("right two layers down");
  });
});
