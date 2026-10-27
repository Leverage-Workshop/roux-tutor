import { describe, expect, it } from "vitest";
import { safeNextPath } from "./redirect";

describe("safeNextPath", () => {
  it("keeps same-site paths", () => {
    expect(safeNextPath("/")).toBe("/");
    expect(safeNextPath("/tutor?step=3")).toBe("/tutor?step=3");
  });

  it("falls back to / for missing or off-site targets", () => {
    for (const next of [null, undefined, "", "tutor", "https://evil.com", "//evil.com", "/\\evil.com"]) {
      expect(safeNextPath(next)).toBe("/");
    }
  });
});
