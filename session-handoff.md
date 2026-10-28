# Session Handoff

## Current Objective

- Goal: Mobile Viewport Layout (feat-003)
- Current status: Done. Demo tutor at `/tutor`
- Branch / commit: see `git log --oneline -1`

## Completed This Session

- [x] SessionStart hook so cloud sessions use Node 24 without a manual PATH export
- [x] `/tutor`: 60% cube view (2D net placeholder) + 40% fixed sheet with stages, counter, notation, text, Back / Next
- [x] Demo Roux lesson with a test that each stage completes
- [x] Store can start with a move list loaded
- [x] Replaced unmaintained Vaul with Base UI; the tutor sheet is a non-modal Base UI drawer

## Verification Evidence

| Check | Command | Result | Notes |
|---|---|---|---|
| Full harness | `./init.sh` | Pass | 63/63 tests, `/tutor` static |
| Drawer a11y | Playwright | Pass | Cube view not hidden, no focus trap, Escape/tap/drag keep it open |
| Layout | Playwright + `next start` | Pass | 60/40 split at 390x844 and 375x667, light/dark, no horizontal scroll |
| Stepping | Playwright | Pass | All stages to "Solved", text fits at 375x667 |

## Files Changed

- See "Files Modified This Session" in `progress.md`

## Decisions Made

- See "Decisions Made" in `progress.md` (Base UI replaced Vaul; `/tutor` route; demo lesson)

## Blockers / Risks

- None new

## Next Session Startup

1. Read `AGENTS.md` (`CLAUDE.md` imports it).
2. Read `feature_list.json` and `progress.md`.
3. Review this handoff.
4. Run `./init.sh` before editing (the SessionStart hook puts Node 24 on PATH).
5. Run `git fetch origin` and check for unmerged feature branches before picking a feature.

## Recommended Next Step

- Save tutoring sessions from `/tutor` for signed-in users, or feat-004 3D Cube Renderer (replace `CubeNet` in `TutorScreen`)
