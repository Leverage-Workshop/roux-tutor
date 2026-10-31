// Test helper: a fake Supabase client whose query builder records each chained
// call and resolves to `result`.
import { vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

const METHODS = ["insert", "upsert", "update", "delete", "select", "eq", "order", "limit", "single", "maybeSingle"];

export function fakeClient(result: { data: unknown; error: unknown }) {
  const calls: [string, unknown[]][] = [];
  const builder: Record<string, unknown> = {};
  for (const method of METHODS) {
    builder[method] = (...args: unknown[]) => {
      calls.push([method, args]);
      return builder;
    };
  }
  builder.then = (resolve: (r: unknown) => unknown) => Promise.resolve(result).then(resolve);
  const from = vi.fn((table: string) => {
    calls.push(["from", [table]]);
    return builder;
  });
  return { client: { from } as unknown as SupabaseClient<Database>, from, calls };
}
