import { describe, expect, it } from "vitest";
import { editorHref, sourceFromParam, tutorHref } from "./links";

describe("tutor links", () => {
  it("marks scanned cubes only", () => {
    expect(tutorHref("X", "scan")).toBe("/tutor?cube=X&from=scan");
    expect(tutorHref("X", "manual")).toBe("/tutor?cube=X");
    expect(tutorHref("X")).toBe("/tutor?cube=X");
    expect(editorHref("Y", "scan")).toBe("/enter?cube=Y&from=scan");
    expect(editorHref("Y", "scramble")).toBe("/enter?cube=Y");
  });

  it("reads the from parameter", () => {
    expect(sourceFromParam("scan")).toBe("scan");
    expect(sourceFromParam("manual")).toBeUndefined();
    expect(sourceFromParam(["scan"])).toBeUndefined();
    expect(sourceFromParam(undefined)).toBeUndefined();
  });
});
