"use client";
// A date in the viewer's time zone. The server doesn't know it, so the server
// render (and hydration) shows the UTC date, then the browser swaps in the
// local one.
import { useSyncExternalStore } from "react";

const noSubscribe = () => () => {};

export function LocalDate({ iso }: { iso: string }) {
  const inBrowser = useSyncExternalStore(
    noSubscribe,
    () => true,
    () => false,
  );
  const text = new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: inBrowser ? undefined : "UTC",
  });
  return <time dateTime={iso}>{text}</time>;
}
