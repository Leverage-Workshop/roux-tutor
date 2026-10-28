# Session Handoff

## Current Objective

- Goal: Roux Solver: Second Block (feat-007)
- Current status: Done. `solveSecondBlock(state)` and `solveBlocks(state)` in `src/lib/solver/secondBlock.ts`
- Branch / commit: see `git log --oneline -1`

## Completed This Session

- [x] Second block solved Roux style with only R, r, U, M: the yellow-red DR edge, then each right pair freed (if stuck in a right-side slot), joined in the top layer, and inserted as a unit
- [x] DR edge and finished pairs are home at the end of every phase; the first block is never touched
- [x] Step names/goals for the tutor drawer, including a note when the M-slice centers are turned
- [x] `isSecondBlockSolved`, `solveBlocks` (FB then SB)

## Verification Evidence

| Check | Command | Result | Notes |
|---|---|---|---|
| Full harness | `./init.sh` | Pass | 162/162 tests (13 new) |
| Solver on random cubes | `secondBlock.test.ts` | Pass | 120 seeded scrambles; every move, phase and the first block checked after each move |
| Speed / length | ad hoc benchmark, 400 random cubes | SB 15.0 moves avg, max 21 | first solve ~60ms (tables), median 1.6ms; plain per-piece shortest would be ~13.3 |

## Files Changed

- See "Files Modified This Session" in `progress.md`

## Decisions Made

- See "Decisions Made" in `progress.md` (Roux-style SB phases, M centers left for LSE, no step starts on the layer the previous step ended on)

## Blockers / Risks

- The solver is not used by `/tutor` yet; the demo lesson stays hand-written until CMLL and LSE exist
- After FB+SB the U/F/D/B centers are often turned by M moves. CMLL should recognize cases from the corners only (relative to the L/R blocks), and LSE must solve the centers along with the six edges
- Step ids: FB uses `front-pair-*`, SB uses `front-right-pair-*` and `dr-edge`, so a move-explanation dictionary (feat-010) can key on them without clashes
- Steps can still merge across a boundary on different layers (e.g. `M` then `r U R'`); allowed on purpose, it reads as join-then-insert

## Next Session Startup

1. Read `AGENTS.md` (`CLAUDE.md` imports it).
2. Read `feature_list.json` and `progress.md`.
3. Review this handoff.
4. Run `./init.sh` before editing (the SessionStart hook puts Node 24 on PATH).
5. Run `git fetch origin` and check for unmerged feature branches before picking a feature.

## Recommended Next Step

- feat-008 CMLL: start from `solveBlocks(state)`; recognize the top-corner case after a U adjustment and apply its algorithm, checking both blocks stay solved
