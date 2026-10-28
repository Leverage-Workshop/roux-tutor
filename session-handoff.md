# Session Handoff

## Current Objective

- Goal: Roux Solver: CMLL (feat-008)
- Current status: Done. `solveCmll(state)`, `isCmllSolved`, `solveThroughCmll` in `src/lib/solver/cmll.ts`; the 42-case table in `src/lib/solver/cmllCases.ts`
- Branch / commit: see `git log --oneline -1`

## Completed This Session

- [x] 42 CMLL algorithms (O, H, Pi, U, T, S, AS, L) stored as data with id, set, name, nickname, algorithm and a generated recognition note
- [x] Every algorithm checked by computer; two remembered ones replaced (H 3 solved a Pi case, S 4 broke the second block)
- [x] Recognition from the corners relative to the blocks only (works with the middle slice turned); lookup table over all 647 unsolved top-corner states picks the shortest pre-AUF + algorithm + post-AUF
- [x] Steps `cmll-pre-auf`, `cmll` (carries `case`), `cmll-post-auf`; corners end solved relative to the blocks
- [x] `solveThroughCmll` chains FB + SB + CMLL

## Verification Evidence

| Check | Command | Result | Notes |
|---|---|---|---|
| Full harness | `./init.sh` | Pass | 182/182 tests (20 new) |
| Table | `cmllCases.test.ts` | Pass | each algorithm keeps both blocks and L/R centers, no rotations, solves its case, right set; 42 distinct cases |
| Solver | `cmll.test.ts` | Pass | all 648 top-corner states, fewest moves from the table; 120 seeded scrambles through FB + SB + CMLL |
| Speed / length | ad hoc benchmark, 1000 random cubes | 11.3 moves avg, max 17 | first call ~40ms (table), then median 0.02ms |

## Files Changed

- See "Files Modified This Session" in `progress.md`

## Decisions Made

- See "Decisions Made" in `progress.md` (table lookup, corners end fully solved, neutral case names, generated recognition notes)

## Blockers / Risks

- The solver is not used by `/tutor` yet; the demo lesson stays hand-written until LSE exists
- CMLL may start on the layer SB ended on (~13% of cubes, e.g. `R'` then Sune's `R`); left as is, one algorithm per case
- For LSE (feat-009): after CMLL only UL, UR, UF, UB, DF, DB and the M-slice centers are unsolved. Centers can be in any of the 4 M positions (CMLL algorithms with r/M move them too). Step ids so far: FB `orient`, `dl-edge`, `front|back-pair-*`; SB `dr-edge`, `front|back-right-pair-*`; CMLL `cmll-pre-auf`, `cmll`, `cmll-post-auf`. Pick LSE ids that don't clash (e.g. `lse-eo`, `lse-ulur`, `lse-ep`)
- For explanations (feat-010): the `cmll` step has `case` (`id` like `t-1`, `set`, `name`, `recognition`); `CMLL_SETS` gives each set's label and shape text

## Next Session Startup

1. Read `AGENTS.md` (`CLAUDE.md` imports it).
2. Read `feature_list.json` and `progress.md`.
3. Review this handoff.
4. Run `./init.sh` before editing (the SessionStart hook puts Node 24 on PATH).
5. Run `git fetch origin` and check for unmerged feature branches before picking a feature.

## Recommended Next Step

- feat-009 LSE: start from `solveThroughCmll(state)`; solve the six edges and the M-slice centers with U and M only
