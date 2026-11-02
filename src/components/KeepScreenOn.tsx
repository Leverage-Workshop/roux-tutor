"use client";
// Keeps the screen on while any page of the app is open (see wakeLock.ts).
// Rendered once, in the root layout.
import { useEffect } from "react";
import { keepScreenOn } from "@/lib/wakeLock";

export function KeepScreenOn() {
  useEffect(() => keepScreenOn(), []);
  return null;
}
