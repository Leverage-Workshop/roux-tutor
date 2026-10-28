# Session Handoff

## Current Objective

- Goal: Roux Solver: First Block (feat-006)
- Current status: Done. `solveFirstBlock(state)` in `src/lib/solver/firstBlock.ts`
- Branch / commit: see `git log --oneline -1`

## Completed This Session

- [x] Piece tracking with move tables taken from cubejs (`pieces.ts`)
- [x] Reusable shortest-path search over a few pieces (`search.ts`), ready for SB
- [x] First block solved as beginners learn it: rotation if needed, DL edge, front pair, back pair (shorter order first)

## Verification Evidence

| Check | Command | Result | Notes |
|---|---|---|---|
| Full harness | `./init.sh` | Pass | 148/148 tests (14 new) |
| Solver on random cubes | `firstBlock.test.ts` | Pass | 100 seeded scrambles; each step leaves its pieces home; at most 14 moves |
| Speed | ad hoc benchmark, 300 random cubes | ~9.2 moves avg | median 0.5ms, max ~65ms |

## Files Changed

- See "Files Modified This Session" in `progress.md`

## Decisions Made

- See "Decisions Made" in `progress.md` (line + pairs, face turns only, standard centers, tie-breaks)

## Blockers / Risks

- The solver is not used by `/tutor` yet; the demo lesson stays hand-written until SB, CMLL and LSE exist
- SB will need M-slice center offsets handled (SB uses r and M)

## Next Session Startup

1. Read `AGENTS.md` (`CLAUDE.md` imports it).
2. Read `feature_list.json` and `progress.md`.
3. Review this handoff.
4. Run `./init.sh` before editing (the SessionStart hook puts Node 24 on PATH).
5. Run `git fetch origin` and check for unmerged feature branches before picking a feature.

## Recommended Next Step

- feat-007 Second Block: reuse `shortestSolutions` with layers R, r, U, M, keeping the five FB pieces home
