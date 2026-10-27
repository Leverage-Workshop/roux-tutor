# Session Handoff

## Current Objective

- Goal: Google Sign-In and Tutoring Sessions (feat-012)
- Current status: Code, database and Vercel env vars done. Waiting on the owner's Google OAuth setup (`docs/AUTH.md`)
- Branch / commit: see `git log --oneline -1`

## Completed This Session

- [x] Supabase project `roux-tutor` created; `tutoring_sessions` table with owner-only RLS
- [x] Supabase clients (`src/lib/supabase/`), `src/proxy.ts`, `/auth/callback`, `/auth/error`
- [x] `AuthButton` on `/` (optional Google sign-in / sign-out)
- [x] `tutoringSessions.ts` read/write helpers for the future tutor screen
- [x] Vercel env vars `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- [x] feat-012 reshaped; saved scrambles and stats moved to feat-015

## Verification Evidence

| Check | Command | Result | Notes |
|---|---|---|---|
| Typecheck | `npm run typecheck` | Pass | |
| Lint | `npm run lint` | Pass | |
| Tests | `npm test` | 52/52 pass | 10 new (redirect, sessions, AuthButton) |
| Build | `npm run build` | Pass | With and without env vars; `/` static |
| RLS | SQL in rolled-back transaction | Pass | Other users' rows hidden, anon blocked |
| Routes | `next start` + curl | Pass | Bad/missing code -> `/auth/error`; `//evil.com` next ignored |

## Files Changed

- See "Files Modified This Session" in `progress.md`

## Decisions Made

- See "Decisions Made" in `progress.md`

## Blockers / Risks

- Google provider not enabled in Supabase yet (owner action, `docs/AUTH.md`)
- Claude's shell gets Node 22, not 24: see Blockers in `progress.md`

## Next Session Startup

1. Read `AGENTS.md` (`CLAUDE.md` imports it).
2. Read `feature_list.json` and `progress.md`.
3. Review this handoff.
4. Run `export PATH=/opt/node24/bin:$PATH` then `./init.sh` before editing.
5. Run `git fetch origin` and check for unmerged feature branches before picking a feature.

## Recommended Next Step

- Once Google is set up: test sign-in on production and mark feat-012 done
- Then start feat-003 Mobile Viewport Layout
