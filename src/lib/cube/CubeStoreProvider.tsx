"use client";
// One cube store per provider (zustand's recommended Next.js pattern), so the
// store is never shared between server requests.
import { createContext, useContext, useState, type ReactNode } from "react";
import { useStore } from "zustand";
import type { CubeState } from "./model";
import type { Move } from "./notation";
import { createCubeStore, type CubeStore, type CubeStoreApi } from "./store";

const CubeStoreContext = createContext<CubeStoreApi | null>(null);

/** `initial` and `moves` only seed the store on first render; later changes are ignored. */
export function CubeStoreProvider({
  initial,
  moves,
  children,
}: {
  initial?: CubeState;
  moves?: string | readonly Move[];
  children: ReactNode;
}) {
  const [store] = useState(() => createCubeStore(initial, moves));
  return <CubeStoreContext value={store}>{children}</CubeStoreContext>;
}

/**
 * Read from the cube store. Select the smallest value you need; a selector
 * that builds a new object or array on every call re-renders forever.
 */
export function useCubeStore<T>(selector: (state: CubeStore) => T): T {
  return useStore(useCubeStoreApi(), selector);
}

/**
 * The store itself, for code that subscribes outside React's render cycle
 * (the 3D renderer needs each change's before and after state).
 */
export function useCubeStoreApi(): CubeStoreApi {
  const store = useContext(CubeStoreContext);
  if (!store) throw new Error("useCubeStore must be used inside <CubeStoreProvider>");
  return store;
}
