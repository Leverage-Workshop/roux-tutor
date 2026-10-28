import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthButton } from "./AuthButton";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

type Listener = (event: string, session: unknown) => void;
let listener: Listener | undefined;
const auth = {
  onAuthStateChange: vi.fn((cb: Listener) => {
    listener = cb;
    return { data: { subscription: { unsubscribe: vi.fn() } } };
  }),
  signInWithOAuth: vi.fn(async () => ({ data: {}, error: null })),
  signOut: vi.fn(async () => ({ error: null })),
};
const createClient = vi.fn<() => { auth: typeof auth } | null>(() => ({ auth }));
vi.mock("@/lib/supabase/client", () => ({ createClient: () => createClient() }));

function emit(session: unknown) {
  act(() => listener?.("INITIAL_SESSION", session));
}

describe("AuthButton", () => {
  beforeEach(() => {
    listener = undefined;
    vi.clearAllMocks();
  });
  afterEach(cleanup);

  it("renders nothing when Supabase is not configured", () => {
    createClient.mockReturnValueOnce(null);
    const { container } = render(<AuthButton />);
    expect(container.innerHTML).toBe("");
  });

  it("offers Google sign-in when signed out and returns to the current page", () => {
    render(<AuthButton />);
    emit(null);
    fireEvent.click(screen.getByRole("button", { name: "Sign in with Google" }));
    expect(auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?next=%2F` },
    });
  });

  it("shows the user's name and signs out", async () => {
    render(<AuthButton />);
    emit({ user: { email: "a@example.com", user_metadata: { full_name: "Ada Lovelace" } } });
    expect(screen.getByText("Ada Lovelace")).toBeDefined();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
    });
    expect(auth.signOut).toHaveBeenCalled();
    expect(refresh).toHaveBeenCalled();
  });
});
