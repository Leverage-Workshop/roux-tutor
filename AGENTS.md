# AGENTS.md

Roux Tutor: a mobile-first Next.js app that teaches the Roux method for solving a Rubik's Cube. The user scans a scrambled cube, sees it in 3D, and steps through a solve where each move is explained. Full requirements: `docs/PRODUCT.md`.

## Stack

| Area | Library | Notes |
|---|---|---|
| Runtime | Node 24 (`.nvmrc`, `engines`) | Matches Vercel; use `nvm use` locally |
| Framework | Next.js 16 (App Router, `src/`), React 19, TypeScript | Read `node_modules/next/dist/docs/` before using Next APIs (see Next.js Rules below) |
| State | `zustand` | Shared between 3D canvas and HTML UI |
| Styling / UI | Tailwind CSS 4, `@base-ui/react` | Base UI `Drawer` for bottom sheets (import from `@base-ui/react/drawer`). Vaul was dropped: unmaintained, and it ignored `modal={false}` |
| 3D | `three`, `@react-three/fiber`, `@react-three/drei` | Use drei `<OrbitControls>` for touch camera |
| Vision | Plain TypeScript (`src/lib/scan/`) | Live scan analyzes small canvas snapshots of the camera video (grid fit, Lab colors); no CV library. `@techstark/opencv-js` (~10MB WASM) is installed but unused: if ever needed, lazy-load it in the browser only, never import it at module top level of shared code |
| Cube model | `cubejs` | Supports U R F D L B, M E S, r u f d l b, x y z. Types in `src/types/cubejs.d.ts`. Do NOT use its Kociemba `solve()` for teaching output |
| Backend | `@supabase/supabase-js`, `@supabase/ssr` | Project `roux-tutor`; see `docs/AUTH.md`. Migrations in `supabase/migrations/`, generated types in `src/types/database.ts`; every table needs RLS |
| Tests | `vitest`, `@testing-library/react`, jsdom | Tests live next to code as `*.test.ts(x)` |

## Startup Workflow

Before writing code:

1. **Confirm working directory** with `pwd`
2. **Read this file** completely
3. **Read project docs** (`docs/PRODUCT.md`)
4. **Run `./init.sh`** to verify environment is healthy
5. **Read `feature_list.json`** to see current feature state
6. **Review recent commits** with `git log --oneline -5`

If baseline verification is failing, repair that first before adding new scope.

## Working Rules

- **One feature at a time**: Pick exactly one unfinished feature from `feature_list.json` whose dependencies are done
- **Verification required**: Don't claim done without running verification commands
- **Update artifacts**: Before ending session, update `progress.md` and `feature_list.json`
- **Stay in scope**: Don't modify files unrelated to the current feature
- **Leave clean state**: Next session must be able to run `./init.sh` immediately
- **Mobile first**: Check every UI change at phone width (~390px)

## Required Artifacts

- `feature_list.json` — Feature state tracker (source of truth)
- `progress.md` — Session continuity log
- `init.sh` — Standard startup and verification path
- `session-handoff.md` — For larger sessions

## Definition of Done

A feature is done only when ALL of the following are true:

- [ ] Target behavior is implemented
- [ ] Required verification actually ran (`./init.sh`: typecheck, lint, test, build)
- [ ] Evidence recorded in `feature_list.json` or `progress.md`
- [ ] Repository remains restartable from standard startup path

## End of Session

Before ending a session:

1. Update `progress.md` with current state
2. Update `feature_list.json` with new feature status
3. Record any unresolved risks or blockers
4. Commit with descriptive message once work is in safe state
5. Leave repo clean enough for next session to run `./init.sh` immediately

## Verification Commands

```bash
# Full verification (recommended)
./init.sh
```

Required checks:
- `npm ci`
- `npm run typecheck` (runs `next typegen` then `tsc --noEmit`)
- `npm run lint`
- `npm test`
- `npm run build`

## Escalation

If you encounter:
- **Architecture decisions**: Check `docs/PRODUCT.md`, otherwise ask user
- **Unclear requirements**: Check `docs/PRODUCT.md`, otherwise ask user
- **Repeated test failures**: Update progress, flag for human review
- **Scope ambiguity**: Re-read `feature_list.json` for definition of done

## Next.js Rules

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
