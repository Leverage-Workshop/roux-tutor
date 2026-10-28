# Session Handoff

## Current Objective

- Goal: Roux Solver: First Block (feat-006)
- Current status: Done. `solveFirstBlock(state)` in `src/lib/solver/firstBlock.ts`
- Branch / commit: see `git log --oneline -1`

## Completed This Session

- [x] Piece tracking with move tables taken from cubejs (`pieces.ts`)
- [x] Reusable shortest-path search over a few pieces (`search.ts`), ready for SB
- [x] First block solved Roux style: rotation if needed, DL edge, then each pair freed (if stuck), joined with U/R/r/M, and inserted as a unit
- [x] Revised after owner review: pairs are now actually formed before insertion, not just solved by shortest path

## Verification Evidence

| Check | Command | Result | Notes |
|---|---|---|---|
| Full harness | `./init.sh` | Pass | 149/149 tests (15 new) |
| Solver on random cubes | `firstBlock.test.ts` | Pass | 100 seeded scrambles; every free/join/insert phase checked |
| Speed | ad hoc benchmark, 300 random cubes | ~9.9 moves avg, max 15 | median 0.6ms, first solve ~250ms |

## Files Changed

- See "Files Modified This Session" in `progress.md`

## Decisions Made

- See "Decisions Made" in `progress.md` (Roux-style free/join/insert pairs, slice turns only while joining, standard centers, tie-breaks)

## Blockers / Risks

- The solver is not used by `/tutor` yet; the demo lesson stays hand-written until SB, CMLL and LSE exist
- FB can leave the M-slice centers turned (after joining with M or r); SB and LSE must handle that

## Next Session Startup

1. Read `AGENTS.md` (`CLAUDE.md` imports it).
2. Read `feature_list.json` and `progress.md`.
3. Review this handoff.
4. Run `./init.sh` before editing (the SessionStart hook puts Node 24 on PATH).
5. Run `git fetch origin` and check for unmerged feature branches before picking a feature.

## Recommended Next Step

- feat-007 Second Block: reuse `shortestSolutions` with layers R, r, U, M, keeping the five FB pieces home
