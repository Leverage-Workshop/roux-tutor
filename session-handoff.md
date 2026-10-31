# Session Handoff

## Current Objective

- Goal: Saved Scrambles and Learning Stats (feat-015), the last open feature
- Current status: Done. Signed-in users' solves on `/tutor` are saved as tutoring sessions, the header bookmark saves the cube, and `/progress` shows totals, per-stage progress, saved cubes and recent solves
- Branch / commit: see `git log --oneline -1`

## Completed This Session

- [x] Database: `saved_scrambles` table, `tutoring_sessions.stage_ends`, `tutoring_stats` view (security invoker), owner-only RLS, grants trimmed; types regenerated
- [x] `/tutor`: session recording (`SessionRecorder` + `useTutoringRecorder`), bookmark (`SaveCubeButton`), compact account badge linking to `/progress`
- [x] `/progress` page with stats, stage bars, saved cubes (Solve / Remove), recent solves (Solve again)
- [x] Scan source carried in links (`&from=scan`) so sessions and saved cubes from a scan are marked `scan`
- [x] `docs/AUTH.md` updated

## Verification Evidence

| Check | Command | Result | Notes |
|---|---|---|---|
| Full harness | `./init.sh` | Pass | 308/308 tests (34 new) |
| RLS | Supabase `execute_sql`, rolled-back transactions | Pass | owner-only reads, cross-user insert 42501, anon 42501, bad `stage_ends` rejected |
| Advisors | Supabase `get_advisors` | Pass | no new findings |
| Browser | Playwright, `next start`, fake session + intercepted REST | Pass | right REST calls; 390/375/320 widths, no scroll, no console errors |

## Decisions Made

- See "Decisions Made" in `progress.md` (stats view, session starts on first Next, furthest move, saved cubes are starting positions)

## Blockers / Risks

- Not yet tried with a real Google sign-in; owner should check on the branch preview
- A refresh mid-solve starts a new session (no resume yet)
- Earlier risks still open: see `progress.md`

## Next Session Startup

1. Read `AGENTS.md` (`CLAUDE.md` imports it).
2. Read `feature_list.json` and `progress.md`.
3. Review this handoff.
4. Run `./init.sh` before editing (the SessionStart hook puts Node 24 on PATH).
5. Run `git fetch origin` and check for unmerged feature branches before picking a feature.
6. If you run `next start` for browser checks, stop it before re-running `./init.sh` or rebuilding. Stop it by PID: `pkill -f "next start"` also matches (and kills) the shell running it.
7. Signed-in browser checks without Google: set a `sb-uhswyjnzypxpdomhlxdy-auth-token` cookie (`base64-` + base64url of a session JSON with a future `expires_at`) and route `https://uhswyjnzypxpdomhlxdy.supabase.co/rest/v1/**`. The browser client then acts signed in; the server rejects the fake token, so server-rendered pages stay signed out.

## Recommended Next Step

- Owner: sign in on the preview, step through a solve, bookmark the cube, open `/progress`
- All features in `feature_list.json` are done; pick from "What's Next" in `progress.md` or add new features
