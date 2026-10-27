import { describe, expect, it } from "vitest";
import { formatAlgorithm, invertAlgorithm, invertMove, InvalidMoveError, parseAlgorithm } from "./notation";

describe("parseAlgorithm", () => {
  it("parses face, slice, wide and rotation moves with suffixes", () => {
    expect(parseAlgorithm("R U' F2 M' E S2 r u' x y2 z'")).toEqual([
      "R", "U'", "F2", "M'", "E", "S2", "r", "u'", "x", "y2", "z'",
    ]);
  });

  it("accepts input without spaces and with parentheses", () => {
    expect(parseAlgorithm("(RUR'U')M2")).toEqual(["R", "U", "R'", "U'", "M2"]);
  });

  it("normalizes Rw to r and R2' / R'2 to R2", () => {
    expect(parseAlgorithm("Rw Lw' Uw2 R2' R'2")).toEqual(["r", "l'", "u2", "R2", "R2"]);
  });

  it("accepts curly apostrophes from phone keyboards", () => {
    expect(parseAlgorithm("R’ U′")).toEqual(["R'", "U'"]);
  });

  it("returns no moves for empty input", () => {
    expect(parseAlgorithm("  ")).toEqual([]);
  });

  it.each([["R3"], ["R''"], ["Q"], ["Mw"], ["R, U"]])("rejects %s", (input) => {
    expect(() => parseAlgorithm(input)).toThrow(InvalidMoveError);
  });

  it("reports where the bad move is", () => {
    try {
      parseAlgorithm("R U K");
      expect.unreachable();
    } catch (e) {
      expect((e as InvalidMoveError).position).toBe(4);
    }
  });
});

describe("inversion", () => {
  it("inverts single moves", () => {
    expect(invertMove("R")).toBe("R'");
    expect(invertMove("M'")).toBe("M");
    expect(invertMove("r2")).toBe("r2");
  });

  it("reverses and inverts an algorithm", () => {
    expect(formatAlgorithm(invertAlgorithm(parseAlgorithm("R U2 M' x")))).toBe("x' M U2 R'");
  });
});
