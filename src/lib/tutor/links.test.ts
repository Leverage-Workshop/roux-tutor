import { describe, expect, it } from "vitest";
import { editorHref, tutorHref } from "./links";

describe("tutor links", () => {
  it("puts the cube in the link", () => {
    expect(tutorHref("X")).toBe("/tutor?cube=X");
    expect(editorHref("Y")).toBe("/enter?cube=Y");
  });
});
