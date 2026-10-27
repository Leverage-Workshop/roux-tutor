import { describe, expect, it } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { CubeStoreProvider, useCubeStore } from "./CubeStoreProvider";

function Step() {
  const stepIndex = useCubeStore((s) => s.stepIndex);
  const next = useCubeStore((s) => s.applyMoves);
  return (
    <button type="button" onClick={() => next("R")}>
      step {stepIndex}
    </button>
  );
}

describe("CubeStoreProvider", () => {
  it("re-renders subscribers when the store changes", () => {
    render(
      <CubeStoreProvider>
        <Step />
      </CubeStoreProvider>,
    );
    expect(screen.getByRole("button").textContent).toBe("step 0");
    act(() => screen.getByRole("button").click());
    expect(screen.getByRole("button").textContent).toBe("step 1");
  });

  it("throws outside the provider", () => {
    expect(() => render(<Step />)).toThrow(/CubeStoreProvider/);
  });
});
