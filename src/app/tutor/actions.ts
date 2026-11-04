"use server";
// Remembers how the tutor solves the top corners (see corners.ts). Called
// from the stage info bubble; the page re-renders with the new solve.
import { cookies } from "next/headers";
import { CORNERS_COOKIE, cornersFromCookie, type CmllMethod } from "@/lib/tutor/corners";

export async function setCornersMethod(method: CmllMethod): Promise<void> {
  // Server Functions take any input: keep only a known method.
  (await cookies()).set(CORNERS_COOKIE, cornersFromCookie(method), {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
}
