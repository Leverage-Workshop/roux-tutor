# Session Progress Log

## Current State

**Last Updated:** 2026-10-27
**Active Feature:** feat-012 - Google Sign-In and Tutoring Sessions (done)

## Status

### What's Done

- [x] Installed `harness-creator` skill (`.claude/skills/harness-creator`, pinned in `skills-lock.json`)
- [x] Created harness: `AGENTS.md` (imported by `CLAUDE.md`), `feature_list.json`, `progress.md`, `session-handoff.md`, `init.sh`
- [x] Saved PRD to `docs/PRODUCT.md`
- [x] Scaffolded Next.js 16 app (TypeScript, Tailwind 4, ESLint, App Router, `src/`)
- [x] Installed PRD stack: zustand, three, @react-three/fiber, @react-three/drei, vaul, @techstark/opencv-js, cubejs, @supabase/supabase-js, @supabase/ssr
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

### What's In Progress

- Nothing. feat-012 reaches production when its branch merges to `main`

### What's Next

1. feat-003 Mobile Viewport Layout (wrap the page in `<CubeStoreProvider>`; Next/Back call the store's `next`/`back`). Keep `<AuthButton />` in the layout
2. When the tutor screen exists: if signed in, call `startTutoringSession` when a solve loads, `saveTutoringProgress` on Next/Back (debounced), `completeTutoringSession` at the end
3. Then feat-004 3D Cube Renderer, feat-005 Manual Facelet Entry, or feat-006 First Block solver (all unblocked by feat-002)

## Blockers / Risks

- [ ] OpenCV.js bundle is ~10MB: must be lazy-loaded only on the scanner route
- [ ] Supabase free plan pauses a project after a week without activity; the Leverage Workshop org now uses both free project slots (Gekko, roux-tutor)
- [ ] Human-style Roux solver (FB/SB) is the hardest part; no off-the-shelf library does it
- [ ] `fromFacelets` only checks format and that each corner/edge is a real piece. Full legality (each piece once, corner twist, edge flip, parity) is still to do in feat-005
- [ ] Claude's shell in the cloud container gets Node 22, not 24. The setup script installs `/opt/node24` and puts it on PATH in line 1 of `~/.bashrc`, but Claude's non-interactive shell never reads `~/.bashrc`, and `/opt/node22/bin` is on the default PATH. Workaround: `export PATH=/opt/node24/bin:$PATH` before `./init.sh`. Likely fix: a SessionStart hook that writes that export to `$CLAUDE_ENV_FILE`. (A parallel session on 2026-10-27 thought moving the line to the top of `~/.bashrc` would fix it; the line is already there and the shell still gets Node 22.)

## Decisions Made

- **Vaul over Ant Design Mobile**: PRD allows either. Vaul is smaller, built for touch drawers, and works with Tailwind without a second design system.
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

- `supabase/migrations/*`, `src/lib/supabase/*`, `src/proxy.ts`, `src/app/auth/*`, `src/components/AuthButton*`, `src/types/database.ts` (new); `src/app/page.tsx`, `src/app/page.test.tsx`, `.env.example`, `AGENTS.md`, `docs/AUTH.md`, `feature_list.json`, `progress.md`, `session-handoff.md`

## Evidence of Completion

- [x] `./init.sh` passes on Node 24: npm ci, typecheck, lint, 52/52 tests, build (also builds with no env vars)
- [x] RLS checked live; Vercel env vars set; callback/error routes checked with `next start`; 390px screenshots light/dark
- [x] `npm audit`: 0 vulnerabilities

## Notes for Next Session

Next.js 16 has changed APIs; read `node_modules/next/dist/docs/` before writing Next-specific code (see "Next.js Rules" in `AGENTS.md`). `next.config.ts` has `cacheComponents` enabled by default.
