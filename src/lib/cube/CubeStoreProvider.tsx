"use client";
// One cube store per provider (zustand's recommended Next.js pattern), so the
// store is never shared between server requests.
import { createContext, useContext, useState, type ReactNode } from "react";
import { useStore } from "zustand";
import type { CubeState } from "./model";
import { createCubeStore, type CubeStore, type CubeStoreApi } from "./store";

const CubeStoreContext = createContext<CubeStoreApi | null>(null);

export function CubeStoreProvider({ initial, children }: { initial?: CubeState; children: ReactNode }) {
  const [store] = useState(() => createCubeStore(initial));
  return <CubeStoreContext value={store}>{children}</CubeStoreContext>;
}

/**
 * Read from the cube store. Select the smallest value you need; a selector
 * that builds a new object or array on every call re-renders forever.
 */
export function useCubeStore<T>(selector: (state: CubeStore) => T): T {
  const store = useContext(CubeStoreContext);
  if (!store) throw new Error("useCubeStore must be used inside <CubeStoreProvider>");
  return useStore(store, selector);
}
