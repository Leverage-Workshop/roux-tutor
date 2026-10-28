import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import Home from "./page";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

describe("landing page", () => {
  afterEach(cleanup);

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

  it("links to the demo solve", () => {
    render(<Home />);
    const link = screen.getByRole("link", { name: "Try a demo solve" });
    expect(link.getAttribute("href")).toBe("/tutor");
  });
});
