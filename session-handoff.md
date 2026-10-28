# Session Handoff

## Current Objective

- Goal: Roux Solver: LSE (feat-009)
- Current status: Done. `solveLse(state)`, `isLseSolved`, `lseBadEdges` in `src/lib/solver/lse.ts`; the full chain `solveRoux(state)` in `src/lib/solver/roux.ts`
- Branch / commit: see `git log --oneline -1`

## Completed This Session

- [x] LSE with U and M only, in three human phases: `lse-eo` (orient edges), `lse-ulur` (white-orange and white-red edges between their own corners), `lse-ep` (last four edges, centers, final top-layer turn)
- [x] Each step carries `case { id, name, recognition }` (e.g. `eo-3-1` "arrow (3 bad on top, 1 on the bottom)", `ulur-top-bottom`, `ep-3-cycle-db`) and `centersOff`
- [x] Distance tables over all 184,320 LSE states: every phase as short as possible; ties go to shorter later phases, then no same-layer step starts, then easier moves
- [x] After EO no move makes an edge bad again (quarter U turns only while the white/yellow centers are up/down)
- [x] `solveRoux` chains FB, SB, CMLL, LSE into `{ moves, stages: [{ stage, moves, steps }] }`; CMLL's last top-layer turn is left to LSE when that's not longer

## Verification Evidence

| Check | Command | Result | Notes |
|---|---|---|---|
| Full harness | `./init.sh` | Pass | 204/204 tests (22 new) |
| LSE | `lse.test.ts` | Pass | state-space counts; all 5,760 oriented states + 32 flip patterns x 180 sampled states + 3,000 random states, every phase checked move by move; exact arrow, 1-1, 4-0, 3-cycle, two-swap, centers-only, AUF, previous-move cases |
| Chain | `roux.test.ts` | Pass | 120 seeded scrambles with slice/wide turns end solved; maps onto `createLesson` |
| Speed / length | ad hoc benchmark, 1000 random cubes | full 48.1 moves avg (LSE 12.4), max 61 | LSE tables ~30-50ms first call, then median 0.05ms; full solve median 3ms |

## Files Changed

- See "Files Modified This Session" in `progress.md`

## Decisions Made

- See "Decisions Made" in `progress.md` (phase-optimal LSE, edge orientation rule, EO kept, UL/UR may leave the top layer a half turn off, EP cases relative to the centers, CMLL post-AUF left to LSE in `solveRoux`)

## Blockers / Risks

- The solver is not used by `/tutor` yet; the demo lesson is still hand-written (feat-010 or later)
- Phase-by-phase LSE is sometimes longer than a combined solve (1-1 EO is 6 moves); accepted for teaching
- `solveRoux` drops CMLL's `cmll-post-auf` when LSE does as well without it; revert by removing the second candidate in `solveRoux` if the owner wants CMLL to always end lined up
- For explanations (feat-010): step ids across all stages are FB `orient`, `dl-edge`, `front|back-pair-free|join|insert`; SB `dr-edge`, `front|back-right-pair-free|join|insert`; CMLL `cmll-pre-auf`, `cmll`, `cmll-post-auf`; LSE `lse-eo`, `lse-ulur`, `lse-ep`. CMLL and LSE steps also have `case` (stable `id`, `name`, `recognition`); LSE steps have `centersOff`

## Next Session Startup

1. Read `AGENTS.md` (`CLAUDE.md` imports it).
2. Read `feature_list.json` and `progress.md`.
3. Review this handoff.
4. Run `./init.sh` before editing (the SessionStart hook puts Node 24 on PATH).
5. Run `git fetch origin` and check for unmerged feature branches before picking a feature.

## Recommended Next Step

- feat-010 move explanations: build the dictionary on step ids and cases, then load `solveRoux` output into the tutor (one lesson stage per Roux stage)
