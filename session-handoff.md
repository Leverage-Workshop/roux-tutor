# Session Handoff

## Current Objective

- Goal: Manual Facelet Entry (feat-005)
- Current status: Done. `/enter` lets the user tap in their cube face by face with live legality checks; "Solve this cube" opens `/tutor?cube=<facelets>`, solved on the server
- Branch / commit: see `git log --oneline -1`

## Completed This Session

- [x] `checkFacelets` (`src/lib/cube/validate.ts`): full legality (real pieces, each once, color counts, corner twist, edge flip, parity) with the stickers to mark and plain-language messages; works on part-filled drafts ("." = blank)
- [x] `FaceletEditor` at `/enter`: face tabs, hold hint, big 3x3 face with neighbor color bars, palette with counts, status line, Clear face, Solve; draft mirrored into the URL
- [x] `/tutor?cube=`: `lessonForCube` -> `rouxLessonFromState`; fix-it page for bad cubes; "Edit cube" link back to the editor; demo unchanged without `cube`
- [x] Landing page links to `/enter`

## Verification Evidence

| Check | Command | Result | Notes |
|---|---|---|---|
| Full harness | `./init.sh` | Pass | 247/247 tests (32 new); `/enter`, `/tutor` partial prerender |
| Legality | `validate.test.ts` | Pass | 550 random legal cubes match cubejs; every problem kind flagged |
| Editor | `FaceletEditor.test.tsx` | Pass | paint, tabs/hints, early piece problems, ready -> Solve link, flip message, clear face, URL sync only after edits |
| Handoff | `cubeLesson.test.ts` | Pass | demo without cube; entered demo cube = demo solve; errors link back to editor |
| Browser | Playwright on `next start`, 390x844 / 375x667 / 320x568, light + dark | Pass | full cube tapped in, reload keeps draft, wrong sticker flagged, Solve -> 47-move lesson matching the entry, Edit cube returns, no console errors, no page scroll |

## Files Changed

- See "Files Modified This Session" in `progress.md`

## Decisions Made

- See "Decisions Made" in `progress.md` (server solve chosen by the owner, one face at a time, fixed standard centers, paint-only taps, early problem marking, draft in the URL)

## Blockers / Risks

- `/tutor` is now a static shell plus per-request lesson (it reads `?cube=`); cheap, but no longer fully static
- Fixed standard color scheme in the editor; the scanner must normalize orientation
- Earlier risks still open (small-phone drawer scrolling, rare SB insert quirk): see `progress.md`

## Next Session Startup

1. Read `AGENTS.md` (`CLAUDE.md` imports it).
2. Read `feature_list.json` and `progress.md`.
3. Review this handoff.
4. Run `./init.sh` before editing (the SessionStart hook puts Node 24 on PATH).
5. Run `git fetch origin` and check for unmerged feature branches before picking a feature.
6. If you run `next start` for browser checks, stop it before re-running `./init.sh`: a server left running from an older build serves 500s for the new chunks.

## Recommended Next Step

- feat-011 Camera Scanner (unblocked): hand its guesses to `/enter?cube=<draft>` for correction
- Or feat-015 Saved Scrambles and Learning Stats (unblocked); saving tutoring sessions from `/tutor` is still unwired
