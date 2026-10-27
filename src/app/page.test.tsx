import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Home from "./page";

describe("landing page", () => {
  it("shows the app name and the four Roux stages", () => {
    render(<Home />);
    expect(
      screen.getByRole("heading", { level: 1, name: "Roux Tutor" }),
    ).toBeDefined();
    const stages = screen
      .getAllByRole("heading", { level: 2 })
      .map((h) => h.textContent);
    expect(stages).toEqual([
      "First Block",
      "Second Block",
      "CMLL",
      "Last Six Edges",
    ]);
  });
});
