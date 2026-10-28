// Placeholder lesson for the tutor screen until the Roux solver (feat-006 to
// feat-009) generates real ones. The scramble is the inverse of a hand-written
// Roux solve, so the solve is exact; demoLesson.test.ts checks that each stage
// really completes its blocks, corners and edges.
import { formatAlgorithm, invertAlgorithm, toMoves } from "@/lib/cube/notation";
import { createLesson, type RouxStageId } from "./lesson";

const DEMO_SOLVE: readonly { stage: RouxStageId; alg: string }[] = [
  { stage: "fb", alg: "D' F' U L' U' L2" },
  { stage: "sb", alg: "R' U' r U R U' r' U R" },
  { stage: "cmll", alg: "R U R' U R U2 R'" },
  { stage: "lse", alg: "M' U M U2 M' U M' U2 M2 U2" },
];

const scramble = formatAlgorithm(invertAlgorithm(DEMO_SOLVE.flatMap(({ alg }) => toMoves(alg))));

export const DEMO_LESSON = createLesson(scramble, DEMO_SOLVE);
