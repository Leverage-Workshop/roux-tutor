# Session Handoff

## Current Objective

- Goal: Camera Scanner (feat-011), reshaped by the owner into a live scan
- Current status: Done. `/scan` captures each side as the user turns the cube in front of the rear camera, then opens `/enter?cube=<draft>` for checking and solving
- Branch / commit: see `git log --oneline -1`

## Completed This Session

- [x] Docs: `docs/PRODUCT.md` section A rewritten (live, face-at-a-time scan; no OpenCV), `AGENTS.md` Vision row, feat-011 description
- [x] `src/lib/scan/`: grid fit and color reading (`grid.ts`), steady/duplicate tracking (`tracker.ts`), colors + rotations to an editor draft (`assemble.ts`, `assignment.ts`), camera frame to snapshot (`frame.ts`)
- [x] `CubeScanner` at `/scan`: camera view with guide and live grid, status, 6 side thumbnails (tap to redo), blocked/no-camera fallbacks to `/enter`
- [x] Landing page links to `/scan` ("Scan your cube")

## Verification Evidence

| Check | Command | Result | Notes |
|---|---|---|---|
| Full harness | `./init.sh` | Pass | 274/274 tests (27 new); `/scan` static |
| Grid finder | `grid.test.ts` | Pass | offsets, sizes, tilt, stickerless, white plastic, glare, thumb, dim; rejects plain/gradient/noise; < 60ms per frame (~28ms measured) |
| Assembly | `assemble.test.ts` | Pass | 60 random cubes exact under plain/dim/warm/cool light, mirror, solved; Hungarian vs brute force |
| Tracker | `tracker.test.ts` | Pass | steady capture, no capture while moving, repeats in any rotation, 6 max, redo, red vs orange solved sides |
| Screen | `CubeScanner.test.tsx` | Pass | rear camera asked, 6 sides -> `/enter?cube=<exact cube>`, camera stopped, redo, blocked + try again, no camera |
| Browser | Playwright, `next start`, Chromium fake camera with generated videos | Pass | exact cube + "Ready to solve" at 390x844, 375x667 dark, 320x568; stickerless/warm/small variant too; no page scroll, no console errors |

## Files Changed

- See "Files Modified This Session" in `progress.md`

## Decisions Made

- See "Decisions Made" in `progress.md` (live scan instead of corner photos, no OpenCV, colors learned from the scan, hand-off through the editor)

## Blockers / Risks

- Not yet tried on a real phone with a real cube (the sandbox has no camera); thresholds in `grid.ts` may need tuning
- Frame analysis on the main thread (~28ms here); move to a Web Worker if the view stutters on phones
- `@techstark/opencv-js` is unused; remove it if nothing needs it
- Earlier risks still open: see `progress.md`

## Next Session Startup

1. Read `AGENTS.md` (`CLAUDE.md` imports it).
2. Read `feature_list.json` and `progress.md`.
3. Review this handoff.
4. Run `./init.sh` before editing (the SessionStart hook puts Node 24 on PATH).
5. Run `git fetch origin` and check for unmerged feature branches before picking a feature.
6. If you run `next start` for browser checks, stop it before re-running `./init.sh` or rebuilding: a server left running from an older build serves 500s for the new chunks.
7. Scanner browser checks: launch Chromium with `--use-fake-ui-for-media-stream --use-fake-device-for-media-stream --use-file-for-fake-video-capture=<file>.y4m` and grant `camera`; headless Chromium without these has no camera ("No camera available").

## Recommended Next Step

- Owner: try `/scan` on a phone with a real cube and report misreads
- feat-015 Saved Scrambles and Learning Stats (unblocked; the last open feature); saving tutoring sessions from `/tutor` is still unwired
