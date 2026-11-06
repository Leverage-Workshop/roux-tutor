# Session Handoff

## Current Objective

- Goal: remove the database (owner request, 2026-11-06)
- Current status: done in code. Supabase sign-in, tutoring sessions, saved cubes and `/progress` are gone; the app needs no env vars
- Branch / commit: see `git log --oneline -1`

## Completed This Session

- [x] Deleted `src/lib/supabase/`, `src/types/database.ts`, `supabase/migrations/`, `src/proxy.ts`, `/auth/*`, `/progress`, `AuthButton`, `SaveCubeButton`, session recorder/resume code, `docs/AUTH.md`, `.env.example`
- [x] Uninstalled `@supabase/supabase-js` and `@supabase/ssr`
- [x] `/tutor` plays `?cube=` or the demo only; links drop `&from=scan`
- [x] Docs: `AGENTS.md`, `docs/PRODUCT.md`, `README.md`, `progress.md`, `feature_list.json` (feat-012, feat-015 -> `removed`)

## Verification Evidence

| Check | Command | Result | Notes |
|---|---|---|---|
| Full harness | `./init.sh` | Pass | 302/302 tests; routes `/`, `/enter`, `/scan`, `/tutor` |
| Browser | Playwright, `next start`, 390x844 | Pass | home and tutor headers |

## Blockers / Risks

- Owner to delete by hand (no delete tool in this session): Vercel env vars `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and the Supabase project `roux-tutor` (ref `uhswyjnzypxpdomhlxdy`). Delete Supabase after this change reaches production
- Earlier risks still open: see `progress.md`

## Next Session Startup

1. Read `AGENTS.md` (`CLAUDE.md` imports it).
2. Read `feature_list.json` and `progress.md`.
3. Review this handoff.
4. Run `./init.sh` before editing (the SessionStart hook puts Node 24 on PATH).
5. Run `git fetch origin` and check for unmerged feature branches before picking a feature.
6. If you run `next start` for browser checks, stop it before re-running `./init.sh` or rebuilding.

## Recommended Next Step

- Pick from "What's Next" in `progress.md` or add new features
