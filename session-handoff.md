# Session Handoff

## Current Objective

- Goal: Cube State Model (feat-002)
- Current status: Done
- Branch / commit: see `git log --oneline -1`

## Completed This Session

- [x] `src/lib/cube/notation.ts`: `parseAlgorithm`, `toMoves`, `invertMove`, `invertAlgorithm`, `formatAlgorithm`
- [x] `src/lib/cube/model.ts`: pure functions over `CubeState` (`solvedState`, `applyMoves`, `toFacelets`, `fromFacelets`, `isSolved`, `faceletColors`, `faceColors`, `faceletPosition`), `FACE_COLOR`, `STICKER_HEX`
- [x] `src/lib/cube/store.ts`: `createCubeStore` with `setInitial`, `scramble`, `loadMoves`, `applyMoves`, `next`, `back`, `goTo`, `lastTurn`
- [x] `src/lib/cube/CubeStoreProvider.tsx`: `<CubeStoreProvider>` and `useCubeStore(selector)`

## Verification Evidence

| Check | Command | Result | Notes |
|---|---|---|---|
| Typecheck | `npm run typecheck` | Pass | |
| Lint | `npm run lint` | Pass | |
| Tests | `npm test` | 42/42 pass | 38 new in `src/lib/cube/` |
| Build | `npm run build` | Pass | |

## Files Changed

- `src/lib/cube/*` (new), `feature_list.json`, `progress.md`, `session-handoff.md`

## Decisions Made

- See "Decisions Made" in `progress.md`
- A parallel session also built feat-002 on branch `ccr-0aa33124-imsgx5` (never merged). The user chose this version; that branch was deleted. Its Node 22 finding is in `progress.md` Blockers.

## Blockers / Risks

- Claude's shell gets Node 22, not 24: see Blockers in `progress.md`
- `fromFacelets` does not yet check twist, flip or parity: feat-005

## Next Session Startup

1. Read `AGENTS.md` (`CLAUDE.md` imports it).
2. Read `feature_list.json` and `progress.md`.
3. Review this handoff.
4. Run `export PATH=/opt/node24/bin:$PATH` then `./init.sh` before editing.
5. Run `git fetch origin` and check for unmerged feature branches before picking a feature.

## Recommended Next Step

- Start feat-003 Mobile Viewport Layout
