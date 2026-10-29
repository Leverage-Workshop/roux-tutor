# Session Progress Log

## Current State

**Last Updated:** 2026-10-29
**Active Feature:** feat-005 - Manual Facelet Entry (done)

## Status

### What's Done

- [x] Installed `harness-creator` skill (`.claude/skills/harness-creator`, pinned in `skills-lock.json`)
- [x] Created harness: `AGENTS.md` (imported by `CLAUDE.md`), `feature_list.json`, `progress.md`, `session-handoff.md`, `init.sh`
- [x] Saved PRD to `docs/PRODUCT.md`
- [x] Scaffolded Next.js 16 app (TypeScript, Tailwind 4, ESLint, App Router, `src/`)
- [x] Installed PRD stack: zustand, three, @react-three/fiber, @react-three/drei, vaul (replaced by @base-ui/react on 2026-10-28), @techstark/opencv-js, cubejs, @supabase/supabase-js, @supabase/ssr
- [x] Added Vitest + Testing Library and a stack smoke test
- [x] feat-014: placeholder landing page at `/` (`src/app/page.tsx`, test in `src/app/page.test.tsx`), site title/description set in `layout.tsx`, body uses Geist font
- [x] feat-013: Vercel project `roux-tutor` linked to GitHub; push to `main` deploys production, other branches get preview URLs. Live at https://rouxtutor.leverageworkshop.com (Cloudflare CNAME, DNS only)
- [x] feat-002: cube state model in `src/lib/cube/`
  - `notation.ts`: `parseAlgorithm` normalizes move strings (`Rw` -> `r`, `R2'` -> `R2`, curly apostrophes, parentheses, no-space input) into typed `Move`s; `invertMove`, `invertAlgorithm`, `formatAlgorithm`
  - `model.ts`: pure functions over a plain `CubeState` (`applyMoves`, `toFacelets`, `fromFacelets`, `isSolved`, `faceletColors`, `faceColors`, `faceletPosition`), Western color scheme `FACE_COLOR` and shared `STICKER_HEX` palette. Facelet layout documented at the top of the file
  - `store.ts`: `createCubeStore` (zustand vanilla) with `initial`, `moves`, `stepIndex`, `cube`, `facelets`, `lastTurn`; actions `setInitial`, `scramble`, `loadMoves`, `applyMoves`, `next`, `back` (undo), `goTo`
  - `CubeStoreProvider.tsx`: per-provider store + `useCubeStore(selector)` hook (zustand's Next.js pattern)
- [x] feat-012 Google sign-in + tutoring sessions (see `docs/AUTH.md`). Sign-in tested by the owner on the branch preview 2026-10-28
  - Supabase project `roux-tutor` (ref `uhswyjnzypxpdomhlxdy`, us-east-1, free) with `tutoring_sessions` table + owner-only RLS (`supabase/migrations/`)
  - Supabase clients in `src/lib/supabase/` (browser, server, proxy), all null-safe without env vars; `src/proxy.ts` refreshes sessions
  - `AuthButton` (top right of `/`): "Sign in with Google" / name + "Sign out"; `/auth/callback` route, `/auth/error` page
  - `tutoringSessions.ts` helpers for the tutor screen to save sessions; types in `src/types/database.ts`
  - Supabase URL + publishable key set in Vercel and in `.env.example`

- [x] SessionStart hook (`.claude/hooks/session-start.sh`, `.claude/settings.json`): cloud sessions get Node 24 on PATH and run `npm install`
- [x] feat-003 mobile viewport layout at `/tutor` (linked from `/`)
  - `src/app/tutor/page.tsx`: metadata, `viewportFit: "cover"` for the safe-area padding, renders `<TutorScreen lesson={DEMO_LESSON} />`
  - `src/components/tutor/TutorScreen.tsx`: `<CubeStoreProvider>` seeded with the lesson; top 60dvh = header (home link, `AuthButton`) + `CubeNet`; bottom = `TutorDrawer`
  - `CubeNet.tsx`: flat 2D net of the store's facelets; since feat-004 it is the fallback when WebGL is unavailable
  - `TutorDrawer.tsx`: Base UI drawer, always open and non-modal, 40dvh, with stage indicator, stage name, move counter, next move in large type, the stage's move list, tutorial text, Back / Next move buttons
  - `src/lib/tutor/lesson.ts`: `ROUX_STAGES`, `TutorStep { move, stage, explanation? }`, `Lesson`, `createLesson`. Tutorial text is `step.explanation`, falling back to the stage goal (feat-010 fills explanations)
  - `src/lib/tutor/demoLesson.ts`: demo Roux solve (32 moves); test proves each stage completes (replaced in feat-010 by the solver's solve)
  - `createCubeStore(initial, moves)` and `<CubeStoreProvider moves>` load a move list up front, so the first render already shows the lesson

- [x] feat-004 3D cube renderer on `/tutor`
  - `src/lib/cube/geometry.ts`: `STICKERS` (54, with cubelet position and outward normal, three.js axes: +x = R, +y = U, +z = F), `CUBELETS` (27), `turnSpec(move)` (axis, layers, signed quarter turns) for every move cubejs supports
  - `src/lib/cube/turnAnimator.ts`: `createTurnAnimator` shows the pre-move state while the turning layer rotates, then the new state; queues taps that arrive mid-turn and plays them faster; `snap` for jumps; duration 0 for reduced motion. `followCubeStore(store, animator)` feeds store changes in (single moves animate, everything else snaps)
  - `src/components/cube3d/Cube3D.tsx`: R3F canvas, shared geometry/materials, `OrbitControls` (no pan/zoom), `FitCamera` keeps the cube in view at any aspect, `frameloop="demand"`
  - `src/components/tutor/CubeView.tsx`: lazy-loads `Cube3D` (`next/dynamic`, `ssr: false`), falls back to `CubeNet` without WebGL or if the 3D view throws
  - `useCubeStoreApi()` added to `CubeStoreProvider.tsx` (the renderer subscribes with before/after state)

- [x] feat-006 First Block solver in `src/lib/solver/`
  - `pieces.ts`: follows single pieces as 0-23 numbers (position + orientation); move tables read from cubejs
  - `search.ts`: `buildMoveSet`, `distanceTable` (multi-goal BFS, up to 4 pieces, cached), `shortestSolutions` (IDA*; a step has a `goal` rule, an optional `keep` rule every move must satisfy, and lower `bounds`), `applyAlgorithm`
  - `firstBlock.ts`: `solveFirstBlock(state)` -> `{ moves, steps }`. Steps (only those with moves): `orient`, `dl-edge`, then per pair `front|back-pair-free`, `-join`, `-insert`, each with `name`, `goal`, `moves`. Also `isFirstBlockSolved`, `orientationMoves`, `moveEffort`
  - Not used by `/tutor` yet; the demo lesson stays hand-written until the other stages exist

- [x] feat-007 Second Block solver in `src/lib/solver/secondBlock.ts`
  - `solveSecondBlock(state)` -> `{ moves, steps }` for a cube whose first block is solved (throws otherwise). Only R, r, U, M. Steps (only those with moves): `dr-edge`, then per pair `front|back-right-pair-free`, `-join`, `-insert`, each with `name`, `goal`, `moves`
  - `isSecondBlockSolved(state)` (red center + DR, FR, BR edges + DFR, DRB corners home; M centers may be off), `solveBlocks(state)` -> `{ moves, firstBlock, secondBlock }`
  - Small shared changes: `firstBlock.ts` exports `best` and `joinedPlacements(corner, edge)`; `search.ts` exports `tableIndex` and takes a `firstMove` filter option

- [x] feat-008 CMLL solver in `src/lib/solver/cmllCases.ts` + `cmll.ts`
  - `cmllCases()`: the 42 cases as data `{ id, set, name, nickname?, alg, moves, recognition }`, sets O H Pi U T S AS L (`CMLL_SETS` has each set's label and shape text). Ids: `o-adjacent`, `o-diagonal`, `h-1`..`h-4`, `pi-1`..`pi-6`, `u-*`, `t-*`, `s-*`, `as-*`, `l-*` (numbers follow the table order)
  - `solveCmll(state)` -> `{ moves, steps, case }` for a cube with both blocks solved (throws otherwise). Steps (only those with moves): `cmll-pre-auf` (one U turn), `cmll` (the algorithm; `step.case` holds the case), `cmll-post-auf` (one U turn; alone it's a CMLL skip). Corners end solved relative to the blocks
  - `isCmllSolved(state)` (both blocks + top corners home and twisted right; M edges/centers ignored), `solveThroughCmll(state)` -> `{ moves, firstBlock, secondBlock, cmll }`

- [x] feat-009 LSE solver in `src/lib/solver/lse.ts` + full chain in `roux.ts`
  - `solveLse(state, { previousMove? })` -> `{ moves, steps }` for a cube whose blocks and top corners are solved (the top layer may be turned; throws otherwise). U and M only. Steps (only those with moves): `lse-eo`, `lse-ulur`, `lse-ep`; each has `name`, `goal`, `moves`, `case { id, name, recognition }` and `centersOff` (M turns the centers are off at the step's start). Ends with every piece and center solved, standard orientation
  - Case ids: EO `eo-1-1`, `eo-2-0-adjacent|opposite`, `eo-0-2`, `eo-3-1` (arrow), `eo-4-0`, `eo-2-2-adjacent|opposite`, `eo-6-flip`; UL/UR `ulur-top-auf`, `ulur-both-top`, `ulur-top-bottom`, `ulur-both-bottom`; EP `ep-centers`, `ep-3-cycle-uf|df|db|ub` (named by the edge already in place), `ep-swap-front-back|top-bottom|diagonal`
  - `isLseSolved(state)` (every piece and center home, cube held the standard way; stricter than the model's `isSolved`), `lseBadEdges(state)` (bad slots, e.g. `["UR", "UL", "UB", "DB"]`), `lseStateCounts()` (for tests)
  - `solveRoux(state)` -> `{ moves, stages: [{ stage: "fb" | "sb" | "cmll" | "lse", moves, steps }] }` (always four stages, in order). Maps onto `createLesson(scramble, stages.map(s => ({ stage: s.stage, alg: formatAlgorithm(s.moves) })))`

- [x] feat-010 move explanations, and `/tutor` now plays the Roux solver's solve
  - `src/lib/tutor/explanations.ts`: `EXPLANATIONS` dictionary (79 templates: 68 specific + 11 per-step `.other` fallbacks that random solves never use), keys `<stage>.<step>.<what the move does>`, e.g. `fb.join.final`, `sb.insert.open`, `cmll.alg.breaks`, `lse.eo.flip`, `lse.ulur.spot`. `explainRouxSolution(start, solution)` -> one `{ key, text }` per move; `explain(key, vars)` fills `{placeholders}` and throws on a missing one; `moveHow(move)` ("right side up"); `cmllCaseLabel`
  - How an entry is picked: the solve is played move by move; per stage the move is classified from the cube (pair pieces moved / joined / home, finished pieces lifted or put back, slot turned, stuck piece freed, block broken or rebuilt during an algorithm, bad edges before/after, UL/UR edges up/down/into their spot, centers). Claims about later moves are checked against the actual next moves
  - `src/lib/tutor/rouxLesson.ts`: `rouxLesson(scramble)` -> `Lesson` with `phases` (one per solver step: id, stage, name, goal) and per move `phase` + `explanation`
  - `src/lib/tutor/demoLesson.ts`: `DEMO_SCRAMBLE` (the feat-009 example scramble) and `demoLesson()` (memoized). The old hand-written `DEMO_LESSON` is gone
  - `lesson.ts`: `TutorStep.phase`, `LessonPhase`, `Lesson.phases?` (hand-made lessons from `createLesson` still work without them)
  - `/tutor` (`page.tsx`, Server Component) calls `demoLesson()` while prerendering; only the finished lesson reaches the browser
  - `TutorDrawer`: big move + (step name over the step's moves), the move's explanation as the drawer description, an inline "About this step" toggle that shows the step goal (closes when the next step starts, scrolls into view), `.scroll-shadows` (globals.css) on the scroll area

- [x] feat-005 Manual Facelet Entry at `/enter` (linked from `/` as "Enter your cube")
  - `src/lib/cube/validate.ts`: `checkFacelets(draft)` for a 54-letter draft ("." = blank, standard centers): blanks, per-color counts, problems with the stickers to mark (repeated or opposite colors on a piece and mirrored corners as soon as they show up, duplicate pieces, too many of a color; once complete: corner twist, edge flip, parity), and the `CubeState` when legal. `parseDraft` for URL input, `EMPTY_DRAFT`, `CORNER_FACELETS` / `EDGE_FACELETS`
  - `FaceletEditor.tsx`: face tabs (mini previews, red dot when a face has a marked sticker), hold hint per face ("green facing you, white on top"), big 3x3 face with the neighboring centers' colors as edge bars, fixed centers, 6-color palette with "n left" counts, status line (first problem + count of others / stickers left / ready), Clear face, Solve this cube (link to `/tutor?cube=`). The draft is mirrored into `/enter?cube=` with `history.replaceState` after each edit
  - `/tutor?cube=<54 letters>`: `lessonForCube` (`src/lib/tutor/cubeLesson.ts`) solves it on the server with `rouxLessonFromState`; bad or illegal cubes get a "This cube can't be solved" page with the reason and "Fix it in the editor". No `cube` = the demo as before. `Lesson.start` (facelets) for entered cubes; TutorScreen starts from it and shows an "Edit cube" link

### What's In Progress

- Nothing

### What's Next

1. feat-011 Camera Scanner (unblocked): open `/enter?cube=<draft>` with the scanned guesses ("." for stickers it couldn't read) for the user to correct
2. Optional: "New scramble" on `/tutor` (random cube to set up by hand): now cheap, since `/tutor?cube=` solves any cube on the server; needs a way to show the scramble moves
3. Save tutoring sessions from `/tutor`: if signed in, call `startTutoringSession` when a solve loads, `saveTutoringProgress` on Next/Back (debounced), `completeTutoringSession` at the end
4. Optional for the 3D view: a "reset view" button after orbiting, and swiping on the cube to turn layers (the PRD's "interactions on the cube trigger visual layer rotations"; not part of feat-004)

## Blockers / Risks

- [ ] OpenCV.js bundle is ~10MB: must be lazy-loaded only on the scanner route
- [ ] Supabase free plan pauses a project after a week without activity; the Leverage Workshop org now uses both free project slots (Gekko, roux-tutor)
- [x] Human-style Roux solver (FB/SB) is the hardest part; no off-the-shelf library does it. Both blocks done (feat-006, feat-007)
- [x] After FB+SB the M-slice centers are usually turned (~75% of random cubes); CMLL recognizes from corners only, LSE fixes the centers (feat-009)
- [ ] LSE phases are each optimal on their own, so a step can be long where a combined solve would be shorter (e.g. a 1-1 EO case takes 6 moves; UL/UR up to ~9). Accepted: the owner wants human-style phases. EOLR-style lookahead (choosing EO by UL/UR) is only used to break ties between equally short EO solutions
- [ ] Solver quirk seen while writing explanations: about 0.07% of SB inserts are `U M U' r' U' R` / `U M U' r U R'`, where `U M U'` leaves the pair where it was (not investigated; probably the search's rule that a step can't start on the layer the step before ended on). Explained as "turns only the middle slice ... readies the middle layer for the wide r turn", which is true but a human would just play `r' U' R`. Fix belongs in `secondBlock.ts` (e.g. allow the cancelling start or merge it with the join's last move)
- [ ] On 375x667 and smaller phones most explanations need a short scroll inside the sheet (scroll shadow shows it). If the owner wants no scrolling there, options: drop the title row (the stage indicator already names the stage), or shorten the texts further
- [ ] In `solveRoux` CMLL's `cmll-post-auf` turn is dropped when LSE does as well without it (see Decisions), so a `cmll-post-auf` step appears less often in full solves than in `solveCmll` alone
- [ ] CMLL often starts on the layer SB ended on (13% of 1000 random cubes, e.g. SB's insert `... R'` then Sune's `R U R' ...`); a human would cancel those moves. Left as is: each case has one algorithm. If it bothers the owner, add mirrored/alternative algorithms per case and pick by the previous move
- [x] Full facelet legality (each piece once, corner twist, edge flip, parity): `checkFacelets` in `validate.ts` (feat-005)
- [ ] `/tutor` is no longer fully static (feat-005): it reads `?cube=`, so the page is a static shell ("Working out the solve…") plus the lesson streamed per request. The demo is solved once per server instance (cached in `demoLesson`), any other cube in a few ms (~0.3s on a cold server). Could add `"use cache"` around `lessonForCube` if traffic grows
- [ ] Editor centers are fixed to the standard scheme (white top, green front). A cube with a different color scheme can't be entered; the scanner should normalize orientation before handing over
- [x] Fixed 2026-10-28: Claude's shell in the cloud container got Node 22 (`/opt/node22/bin` is on the default PATH and Claude's shell never reads `~/.bashrc`). `.claude/hooks/session-start.sh` (SessionStart hook, registered in `.claude/settings.json`) now writes `/opt/node24/bin` to the front of PATH via `$CLAUDE_ENV_FILE` and runs `npm install`. Takes effect for sessions that start from a branch containing the hook; no manual `export PATH` needed

## Decisions Made

- **Entered cubes are solved on the server** (owner's choice, 2026-10-29): `/tutor?cube=<54 letters>`, solved in the page's Server Component, so phones never download the solver (checked `.next/static`) and links survive refresh and sharing. Alternative was a lazy solver chunk in the browser, keeping `/tutor` static.
- **Facelet editor shows one face at a time, large**: a full 6-face net at 390px gives ~28px stickers, too small for thumbs; one face gives ~95px stickers, and face tabs with mini previews still show the whole cube. Faces go Front, Right, Back, Left, Top, Bottom (turn the cube around, then tilt).
- **Centers fixed, standard scheme**: the user holds the cube white top / green front; each face's hint says what faces you and what's on top, and edge bars show the neighboring centers. Keeps validation simple and matches the solver's expected orientation (no starting rotation).
- **Tap paints with the chosen color** (no tap-to-cycle, no eraser): fixing a mistake is just painting the right color; "Clear face" blanks a face (only that face, so a slip costs little).
- **Problems shown as early as possible**: per-piece problems as soon as the piece's filled stickers show them, marked with a dashed red outline and a red dot on the face tab; twist/flip/parity only once every sticker is in (they can't be pinned to stickers). Piece problems are listed before "too many of a color", which marks no stickers (it would light up most faces).
- **Draft kept in the URL** (`/enter?cube=`, updated with `history.replaceState` after each edit, never on mount so the blank loading fallback can't wipe a draft): refresh, browser back and the tutor's "Edit cube" all return to it. The scanner can hand over its guesses the same way.

- **Explanations are computed from the cube, not hand-written per move** (feat-010): an entry is chosen by stage + step + case + what the move does on the cube at that point, so every solve the solver can produce gets specific text. Fallback entries (`.other`) exist per step type but 20,000 random cubes never used one; a test runs 240 seeded solves. Purpose statements that depend on later moves ("so the next M turn can take it down", "so the next turn doesn't trap it again", "a later right-side turn carries a pair piece back") are only used after checking those moves; otherwise a plainer factual entry is used.
- **Per-move CMLL text is lighter**: "R' (right side down): move 3 of 7 of the Sune algorithm", plus whether this move takes a block apart or puts it back; the case's recognition stays in the step goal ("About this step"). S/AS cases use the Sune / Anti-Sune names learners know ("Anti-Sune 4").
- **The demo lesson is solved at build time in the Server Component**, not shipped as a JSON fixture and not solved in the browser: `/tutor` stays static, the browser gets no solver code (checked `.next/static`), and a fixture can't drift from `solveRoux`. Cost: ~0.3-0.5s once per build/server start.
- **Drawer layout for explanations**: the step name sits next to the big move above the step's moves (instead of the whole stage's moves), the explanation is the drawer's description, and the step goal is behind an inline "About this step" toggle so it doesn't take a row. At 390x844 the text fits on 44 of the demo's 47 moves; at 375x667 and smaller the area scrolls inside the sheet, with a CSS scroll shadow to show there's more. Buttons never move.
- **No "New scramble" button yet**: see What's Next.

- **LSE in three human phases, each as short as possible** (feat-009): EO (all six edges good), UL/UR (white-orange and white-red between their own corners), EP (last four edges, centers, final top-layer turn). Distance tables over the full LSE space (6 edges x flips x 4 center turns x 4 top-layer turns = 184,320 states) give every phase's shortest length; ties go to the plan with the shortest later phases, then to no step starting on the layer the step before ended on, then to easier moves (`moveEffort`). A full-LSE optimal solve was not used: it mixes the phases, which is not how Roux is taught.
- **Edge orientation is judged with the middle slice turned back**: an edge is bad when its white/yellow sticker doesn't face up/down; while the slice is a quarter turn off (white/yellow centers front/back), the four middle-slice edges count the other way round. With this rule M turns never change an edge's status and a quarter U turn only does while the slice is off. Checked: 5,760 of the 184,320 states have all edges good, and all of them connect to solved without ever making an edge bad.
- **After EO no move makes an edge bad again**: UL/UR and EP only turn the top layer a quarter while the white/yellow centers are up/down, like a human (M turns and U2 otherwise).
- **UL/UR may end with the top layer a half turn off** (both edges between their own corners, swapped in space): human 4b does this and 4c turns the layer back. Requiring the top layer lined up after UL/UR forced wasteful sequences like `U2 | U2 M U2 M'` (3,000 random LSE states: 11.6 -> 11.2 moves average, and same-layer starts between LSE steps went from 692 to 0).
- **EP cases are named relative to the centers** (as if the middle slice were turned back so white is on top), and with the top layer turned back if it is a half turn off. The goal text says so. Neutral descriptive names (`3-cycle (yellow-blue in place)`, `front and back swapped`) instead of community 4c nicknames, which couldn't be checked offline.
- **`solveRoux` leaves CMLL's final top-layer turn to LSE when that's not longer** (overrides "CMLL ends with the corners fully solved" for the full chain only; `solveCmll` / `solveThroughCmll` are unchanged). Humans don't turn the top layer after CMLL; LSE lines it up anyway. 1000 random cubes: 0.9 fewer moves on average, and LSE's first move hits the same layer as the move before it in ~1.4% of solves instead of ~25% (`U' | U2 M' U M'`). To restore the old behavior, drop the second candidate in `solveRoux`.

- **CMLL is a table lookup over all 647 unsolved top-corner states** (feat-008): for every pre-AUF x algorithm x post-AUF (and the 3 post-AUF-only skips), undo it on a solved cube and keep the shortest option per state (ties: easiest moves, then post-AUF before pre-AUF). Recognition uses only the corners relative to the blocks (cubejs corner positions/twists), so a turned middle slice changes nothing. No search at solve time.
- **CMLL ends with the corners fully solved relative to the blocks**: a final U turn is its own step (`cmll-post-auf`) instead of being left for LSE, so LSE starts from a fixed state and its U moves only align edges.
- **One algorithm per case, from common human CMLL sheets, verified by computer** (blocks and L/R centers kept, no rotations, solves its case, set matches its twists, 42 distinct cases). Two remembered algorithms failed and were replaced (H 3 was really a Pi case; S 4 broke the second block; its replacement `F R' U2 R F' R' F U2 F' R` came from a block-keeping search). Case names are neutral `set + number` (`T 1`); only names checked by computer are descriptive (`O Adjacent`/`O Diagonal`) plus nicknames Sune, Anti-Sune, Jb perm. Sheet names like "Pi Right Bar" were not used because they depend on the exact sheet orientation, which couldn't be checked offline.
- **Recognition notes are generated, not hand-written**: from each case's start position (where the top color faces, each side's two stickers: bar / opposite / neighboring colors, then cross-side sticker comparisons until no other case or turned view with the same top-color pattern matches). The table build throws if two cases ever look the same. The text says "top color" = white (opposite the yellow bottom) since the top center may be turned.
- **CMLL moves the M-slice centers**: algorithms with r/M (e.g. O Diagonal `r2 D r' ...`) turn them further; only the L/R centers are guaranteed. LSE must solve the centers from any state.

- **Second block is built Roux style** (feat-007), mirroring FB: the yellow-red bottom-right edge first, then each right pair in three phases: free (only if the corner sits in a bottom-right slot or the edge in FR/BR), join (corner and edge joined in the top layer, at a spot the pair can be inserted from), insert (the pair stays joined on every move). Every phase uses R, r, U and M only, so the first block can't break; the DR edge and a finished pair may move during a phase (as in R U R') but are home at the end of each phase. Costs ~1.7 moves over a plain per-piece shortest search (15.0 vs 13.3 average).
- **SB leaves the M-slice centers alone**: both blocks are judged against the L/R centers and the first block's yellow bottom, as in Roux. `isSecondBlockSolved` ignores the U/F/D/B centers. LSE fixes them. When they're off, the DR-edge step's goal text says so ("match the bottom to the left block's yellow, not to the centers").
- **No step starts on the layer the previous step ended on** (SB): stops "R2 | R' U R" (looks like undoing). Only the same layer letter is blocked; "M | r U R'" (join with M, insert with r) is allowed since blocking it forced 6-move detours. Joins chosen by shortest join, not join+insert: a join lookahead over insert lengths gave no gain (15.01 vs 15.00) at 4x the time.

- **First block is built Roux style** (feat-006, revised after owner review): the yellow-orange edge first, then each corner-edge pair in three phases: free (only if a piece is stuck on the left side), join (U, R, r, M only, so the left side is never touched), insert (face turns, the pair stays joined every move). The first version just searched the shortest way to get each pair home, which gave moves like `F U' R2 F` that never form a pair. Roux style costs ~0.7 moves (9.9 vs 9.2 average).
- **Slice and wide turns only while joining**: freeing, inserting and the DL edge use face turns. Joining with M and r can leave the U/F/D/B centers turned; that's normal in Roux and LSE fixes them.
- **Solves start from standard centers**: if orange isn't left or yellow isn't down, the first step is a whole-cube rotation. A cube with a turned middle slice also gets one, even if its block is already built; face-turn scrambles never do.
- **Ties between equally short solves** go to the easier moves: R, U cheapest, then r, M, L, F, D, B hardest; half turns slightly more (`moveEffort`).
- **No 5-piece lookup tables**: lower bounds use 2-3 piece tables only. The first solve takes ~250ms to build them; later solves ~0.6ms.

- **3D turn animation** (feat-004): the store changes state immediately; the renderer keeps drawing the old state and rotates the moving layer, then swaps to the new state. `geometry.test.ts` proves that for all 54 moves the turned layer lands exactly on cubejs's new state, so the swap can't flicker. Turning cubelets live in a fresh `<group key>` per turn; while React catches up after a turn ends, the group is held at its end angle.
- **Flat net kept as the fallback** when WebGL is missing or the 3D chunk fails to load (e.g. offline). jsdom has no WebGL, so `TutorScreen.test.tsx` runs against the net.
- **Known warning**: R3F 9.8 uses `THREE.Clock`, which three r186 marks deprecated (console warning, harmless). Goes away when R3F switches to `THREE.Timer`.

- **Base UI replaces Vaul** (user's choice, 2026-10-28): Vaul's README says "This repo is unmaintained" (last release 1.1.2, Dec 2024), and 1.1.2 does not pass `modal={false}` to its Radix dialog, so its "non-modal" drawer hid the cube view from screen readers (`aria-hidden`) and trapped focus. `@base-ui/react` (1.9.0, monthly releases; shadcn/ui moved its drawer to it) passed the same checks: cube view not hidden, no focus trap, Escape/outside taps/drags leave the sheet in place.
- **Tutor sheet setup**: `Drawer.Root open modal={false} disablePointerDismissal`, `Popup initialFocus={false} finalFocus={false}`, and no `Drawer.Viewport` (the part that adds swipe gestures), so the sheet can't be dragged away. Base UI portals mount only in the browser, so `TutorDrawer` also renders an `aria-hidden` empty sheet outline that the server includes in the HTML; the real sheet covers it once JavaScript runs (~0.25s locally). Known wart: Tab reaches an invisible Base UI focus guard after "Next move" before leaving the page.
- **Tutor lives at `/tutor`**; `/` stays the landing page with a "Try a demo solve" link. The scanner (feat-011) will hand its result to the tutor later.
- **Demo lesson until the solver exists** (superseded by feat-010: `/tutor` now plays `solveRoux` on `DEMO_SCRAMBLE`): scramble = inverse of a hand-written Roux solve. Its scramble contains M and r, which is fine because only the resulting state is used; net slice turns are zero, so centers start in the standard orientation.

- **Vaul over Ant Design Mobile** (2026-10-26, superseded by Base UI above): Vaul was smaller, built for touch drawers, and worked with Tailwind without a second design system. Base UI keeps those advantages.
- **cubejs kept as the cube model**: supports M, r, and rotations, which Roux needs. Its `package.json` wrongly lists the whole `npm@6` CLI as a dependency (source of 42 audit warnings); an `overrides` entry in `package.json` swaps it for an empty package. Audit is now clean.
- **Node 24** (`engines` in `package.json`, `.nvmrc`, `@types/node` ^24): Vercel's default and LTS until Apr 2028. Node 26 is not on Vercel yet. The cloud environment needs a setup script that installs Node 24 (its image ships Node 22).
- **npm 11 install scripts**: npm 11 blocks dependency install scripts by default. `unrs-resolver`'s postinstall is skipped; harmless, since its native binding installs as an optional dependency and lint passes.
- **ESLint 10 with peer overrides**: `eslint-config-next` 16.4+ supports ESLint 10 (see its docs), but `eslint-plugin-react`, `eslint-plugin-jsx-a11y` and `eslint-plugin-import` have not added 10 to their peer ranges yet. `overrides` in `package.json` point them at our ESLint. Verified every plugin still reports violations. Remove those three overrides once the plugins list ESLint 10.
- **Vercel Git integration for deploys**: no GitHub Actions or `vercel.json` needed; Vercel builds every push itself (Node 24 from `engines`, Next.js preset). Production branch is `main`.
- **Cloudflare record is DNS only**: chosen by the user over the proxy. Matches the other Vercel sites on `leverageworkshop.com` and lets Vercel issue and renew the TLS cert directly. No Cloudflare caching rules; Vercel's edge cache handles it.
- **Cube store keeps plain `CubeState` and a facelet string, not cubejs objects**: serializable, and selectors can compare the facelet string cheaply. `lastTurn` (move + increasing id) tells the renderer which single move to animate; Back sets it to the inverse move. Jumps (`goTo`, multi-move `applyMoves`) set it to null.
- **Store per provider, not a module global**: follows zustand's Next.js guidance so no state is shared across server requests.
- **`typecheck` runs `next typegen` first**: Next 16 generates global types like `LayoutProps` used by `layout.tsx`.
- **Own Supabase project, optional sign-in** (user's choice, 2026-10-27): new free project `roux-tutor` rather than sharing Gekko. Guests can use the tutor; signing in saves sessions.
- **feat-012 reshaped** (user's choice): now Google sign-in + tutoring sessions. Saved scrambles and stats moved to new feat-015.
- **Auth UI is a Client Component** (`onAuthStateChange`), so `/` stays statically prerendered. RLS, not the UI, protects data.
- **`tutoring_sessions.user_id` defaults to `auth.uid()`**: the client never sends a user id.
- **Supabase "Allow new users to sign up" must stay on**: with it off, Google sign-in fails at the Supabase callback with 422 and the user lands on `/auth/error`.

## Files Modified This Session

- feat-005: `src/lib/cube/validate.ts`, `validate.test.ts`, `src/components/facelets/FaceletEditor.tsx`, `FaceletEditor.test.tsx`, `src/app/enter/page.tsx`, `src/lib/tutor/cubeLesson.ts`, `cubeLesson.test.ts` (new); `src/app/tutor/page.tsx`, `src/components/tutor/TutorScreen.tsx`, `src/lib/tutor/lesson.ts` (`start`), `rouxLesson.ts` (`rouxLessonFromState`), `src/lib/cube/model.ts` (comment), `src/app/page.tsx` (link); `feature_list.json`, `progress.md`, `session-handoff.md`

- feat-010: `src/lib/tutor/explanations.ts`, `explanations.test.ts`, `rouxLesson.ts` (new); `demoLesson.ts`, `demoLesson.test.ts`, `lesson.ts`; `src/app/tutor/page.tsx`; `src/components/tutor/TutorDrawer.tsx`, `TutorScreen.test.tsx`; `src/app/globals.css` (`.scroll-shadows`); solver tests now use `DEMO_SCRAMBLE` (`firstBlock.test.ts`, `secondBlock.test.ts`, `roux.test.ts`); `feature_list.json`, `progress.md`, `session-handoff.md`
- feat-009: `src/lib/solver/lse.ts`, `lse.test.ts`, `roux.ts`, `roux.test.ts` (new); `feature_list.json`, `progress.md`, `session-handoff.md`
- feat-008: `src/lib/solver/cmllCases.ts`, `cmllCases.test.ts`, `cmll.ts`, `cmll.test.ts` (new); `feature_list.json`, `progress.md`, `session-handoff.md`
- feat-007: `src/lib/solver/secondBlock.ts`, `secondBlock.test.ts` (new); `firstBlock.ts` (export `best`, generic `joinedPlacements`), `search.ts` (export `tableIndex`, `firstMove` option); `feature_list.json`, `progress.md`, `session-handoff.md`
- feat-006 (earlier): `src/lib/solver/pieces.ts`, `search.ts`, `firstBlock.ts` and tests

## Evidence of Completion

- [x] feat-005: `./init.sh` passes on Node 24: npm ci, typecheck, lint, 247/247 tests (32 new), build (`/enter`, `/tutor` partial prerender)
- [x] feat-005: 550 random legal cubes (`Cube.random`) accepted, state equal to cubejs's; each problem kind produced and flagged by construction (twist, flip, parity, mirrored corner, repeated/opposite colors, duplicate piece, over-count, centers). Playwright on `next start` at 390x844, 375x667, 320x568, light and dark: no horizontal or page scroll; a scrambled cube tapped in sticker by sticker, status "Ready to solve", URL holds the draft and reload keeps it; one wrong sticker gives "There are 2 white-red edges ..." with the faces marked; Solve opens `/tutor?cube=...` with a 47-move lesson whose 3D cube matches the entry; "Edit cube" returns to the draft; illegal and nonsense `cube` values show the fix-it page; no console errors. Screenshots were kept outside the repo

- [x] feat-010: `./init.sh` passes on Node 24: npm ci, typecheck, lint, 215/215 tests (11 new), build (`/tutor` static)
- [x] feat-010: 240 seeded random solves (slice/wide turns, rotations; >10,000 moves) all get a specific entry; ad hoc 20,000 random-state cubes: no fallback used; explanation length median 108, p99 199, max 239 chars. Playwright on `next start` at 390x844, 375x667, 320x568, light and dark: sheet at 60%, no horizontal/page scroll, 47 distinct explanations stepping through, Back/Next in view on every move, goal toggle keeps the sheet in place, no console errors. Screenshots were kept outside the repo
- Example (demo, front pair): `U` "moves the corner to the top front-left and the edge to the top front, side by side but not matching yet. 3 more turns to join them." / `r'` "moves the green-orange edge to the bottom front." / `U'` / `R'` "joins the yellow-green-orange corner and the green-orange edge ..." / `F` "slots the joined pair into the front-left. The first block is complete!"
- [x] feat-009: `./init.sh` passes on Node 24: npm ci, typecheck, lint, 204/204 tests (22 new), build
- [x] feat-009: every LSE state can finish every phase (table counts); all 5,760 oriented states and all 32 flip patterns x 180 sampled states solved, every phase checked move by move on the real cube (only U/M, edges good after EO and never bad again, UL/UR placed, cube solved); 3,000 random LSE states (11.2 moves average, max <= 20); 120 seeded scrambles with slice/wide turns through `solveRoux` end solved. Ad hoc benchmark, 1000 random-state cubes (`Cube.random`): full solve 48.1 moves average (FB 9.9, SB 15.1, CMLL 10.8, LSE 12.4), max 61; LSE max 18; phases: EO 5.2 moves (needed on 96%), UL/UR 5.4 (94%), EP 3.0 (76%); middle slice turned at LSE start on 77%. LSE tables ~30-50ms on first call, then median 0.05ms, max 1.2ms; full solve median 3ms (first ~280ms, FB tables)
- Example (scramble `F U R' D R' L' D' R' U F D' U F D L' B D2 U D' F L U2 L' D R2`, 47 moves): ... CMLL `U'` / `R' U' R U' R' U2 R` (AS 1) / LSE `U M' U'` (EO, arrow) / `M U M2 U M' U2 M U` (UL/UR, both on top) / `M2` (EP, only the centers)
- [x] feat-008: `./init.sh` passes on Node 24: npm ci, typecheck, lint, 182/182 tests (20 new), build
- [x] feat-008: all 648 top-corner states solved with blocks intact (fewest moves the table allows, all 42 cases used); 120 seeded scrambles through FB + SB + CMLL. Ad hoc benchmark, 1000 random-state cubes (cubejs `Cube.random`) after FB + SB: CMLL 11.3 moves on average (algorithm 9.8, pre-AUF on 71%, post-AUF on 73%), max 17; 8 skips; first call ~40ms (builds the table), then median 0.02ms, max ~1ms
- Example: CMLL `U2` (pre-AUF) / `F R' U2 R F' R' F U2 F' R` (S 4) / `U'` (post-AUF)
- [x] feat-007: `./init.sh` passes on Node 24: npm ci, typecheck, lint, 162/162 tests (13 new), build
- [x] feat-007: 120 seeded scrambles check every SB move and phase; ad hoc benchmark, 400 random cubes after FB: SB 15.0 moves average, max 21; first SB solve ~60ms (tables), then median 1.6ms, max 12ms. 2000 random-state cubes (cubejs `Cube.random`): all solved, average 15.0, max 23. Phase averages: DR edge 2.9 (needed on 96% of cubes), free 3.0 (25% of pairs), join 2.5 (80%), insert 3.4. FB unchanged (~170ms first, 0.5ms median)
- Example (scramble `F U R' D R' L' D' R' U F D' U F D L' B D2 U D' F L U2 L' D R2`, FB `B L' F' U' R U' B2 U r' U' R' F`): SB `R2` (DR edge) / `M U' M2` (back pair join) / `R' U R` (insert) / `r U R'` (front pair free) / `U' M2` (join) / `r U R'` (insert)
- [x] `./init.sh` passes on Node 24: npm ci, typecheck, lint, 149/149 tests, build
- [x] 100 seeded random scrambles: every free/join/insert phase checked; 300 random cubes: ~9.9 moves average, max 15, median 0.6ms

## Notes for Next Session

Next.js 16 has changed APIs; read `node_modules/next/dist/docs/` before writing Next-specific code (see "Next.js Rules" in `AGENTS.md`). `next.config.ts` has `cacheComponents` enabled by default.
