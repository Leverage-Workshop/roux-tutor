# Session Handoff

## Current Objective

- Goal: Move Explanations (feat-010)
- Current status: Done. Every move of a Roux solve gets a dictionary explanation (`src/lib/tutor/explanations.ts`); `/tutor` plays the solver's solve of `DEMO_SCRAMBLE` with the explanation, step name and step goal in the drawer
- Branch / commit: see `git log --oneline -1`

## Completed This Session

- [x] `EXPLANATIONS`: 79 templates keyed `<stage>.<step>.<what the move does>` (68 specific, 11 `.other` fallbacks never used by random solves); `explainRouxSolution(start, solution)` picks and fills one per move from what the move does on the cube
- [x] `rouxLesson(scramble)` builds a `Lesson` from `solveRoux` with `phases` (solver steps) and per-move `phase` + `explanation`; `demoLesson()` / `DEMO_SCRAMBLE` replace the hand-written `DEMO_LESSON`
- [x] `/tutor` solves the demo while prerendering (Server Component); the browser gets the lesson only, no solver code
- [x] Drawer: big move, step name over the step's moves, explanation (drawer description), inline "About this step" toggle for the goal, scroll shadow when the text doesn't fit

## Verification Evidence

| Check | Command | Result | Notes |
|---|---|---|---|
| Full harness | `./init.sh` | Pass | 215/215 tests (11 new), `/tutor` static |
| Dictionary coverage | `explanations.test.ts` | Pass | 240 seeded solves, >10,000 moves, no fallback, every text led by its move, <= 240 chars; exact demo/R U R'/Sune/EO/EP/rotation texts |
| Lesson | `demoLesson.test.ts`, `TutorScreen.test.tsx` | Pass | lesson = `solveRoux` output, stages complete their pieces; drawer updates explanation/step/goal on Next/Back; demo plays to solved |
| Fallback search | ad hoc, 20,000 `Cube.random()` cubes | 0 fallbacks | length median 108, p99 199 chars |
| Browser | Playwright on `next start`, 390x844 / 375x667 / 320x568, light + dark | Pass | sheet at 60%, no horizontal scroll, 47 distinct explanations, buttons always visible, no console errors; text fits on 44/47 moves at 390x844, scrolls inside the sheet on smaller phones |

## Files Changed

- See "Files Modified This Session" in `progress.md`

## Decisions Made

- See "Decisions Made" in `progress.md` (explanations computed from the cube with checked purpose claims, lighter per-move CMLL text, demo solved at build time, drawer layout, no New scramble yet)

## Blockers / Risks

- Small phones (375x667 and below) usually need a short scroll for the explanation; options in `progress.md`
- Rare SB insert quirk `U M U' r' U' R` (solver, ~0.07% of inserts) gets a truthful but odd explanation; fix belongs in `secondBlock.ts`
- No way yet to solve a different cube on `/tutor` (New scramble / facelet entry); the solver would need to run in the browser or on a server route

## Next Session Startup

1. Read `AGENTS.md` (`CLAUDE.md` imports it).
2. Read `feature_list.json` and `progress.md`.
3. Review this handoff.
4. Run `./init.sh` before editing (the SessionStart hook puts Node 24 on PATH).
5. Run `git fetch origin` and check for unmerged feature branches before picking a feature.

## Recommended Next Step

- feat-005 Manual Facelet Entry (unblocked), then hand its cube to `/tutor` via `rouxLesson` (solver in the browser as a lazy chunk, or a server route)
