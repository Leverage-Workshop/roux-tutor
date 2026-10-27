# Session Progress Log

## Current State

**Last Updated:** 2026-10-27
**Active Feature:** feat-014 - Placeholder Landing Page (done)

## Status

### What's Done

- [x] Installed `harness-creator` skill (`.claude/skills/harness-creator`, pinned in `skills-lock.json`)
- [x] Created harness: `AGENTS.md` (imported by `CLAUDE.md`), `feature_list.json`, `progress.md`, `session-handoff.md`, `init.sh`
- [x] Saved PRD to `docs/PRODUCT.md`
- [x] Scaffolded Next.js 16 app (TypeScript, Tailwind 4, ESLint, App Router, `src/`)
- [x] Installed PRD stack: zustand, three, @react-three/fiber, @react-three/drei, vaul, @techstark/opencv-js, cubejs, @supabase/supabase-js, @supabase/ssr
- [x] Added Vitest + Testing Library and a stack smoke test
- [x] feat-014: placeholder landing page at `/` (`src/app/page.tsx`, test in `src/app/page.test.tsx`), site title/description set in `layout.tsx`, body uses Geist font

### What's In Progress

- Nothing

### What's Next

1. feat-002 Cube State Model (wrapper over cubejs + zustand store)
2. feat-003 Mobile Viewport Layout (can run in parallel with feat-002)

## Blockers / Risks

- [ ] OpenCV.js bundle is ~10MB: must be lazy-loaded only on the scanner route
- [ ] Supabase project and Vercel project are not yet created/linked; `.env.local` does not exist yet
- [ ] Human-style Roux solver (FB/SB) is the hardest part; no off-the-shelf library does it

## Decisions Made

- **Vaul over Ant Design Mobile**: PRD allows either. Vaul is smaller, built for touch drawers, and works with Tailwind without a second design system.
- **cubejs kept as the cube model**: supports M, r, and rotations, which Roux needs. Its `package.json` wrongly lists the whole `npm@6` CLI as a dependency (source of 42 audit warnings); an `overrides` entry in `package.json` swaps it for an empty package. Audit is now clean.
- **Node 24** (`engines` in `package.json`, `.nvmrc`, `@types/node` ^24): Vercel's default and LTS until Apr 2028. Node 26 is not on Vercel yet. The cloud environment needs a setup script that installs Node 24 (its image ships Node 22).
- **npm 11 install scripts**: npm 11 blocks dependency install scripts by default. `unrs-resolver`'s postinstall is skipped; harmless, since its native binding installs as an optional dependency and lint passes.
- **ESLint 10 with peer overrides**: `eslint-config-next` 16.4+ supports ESLint 10 (see its docs), but `eslint-plugin-react`, `eslint-plugin-jsx-a11y` and `eslint-plugin-import` have not added 10 to their peer ranges yet. `overrides` in `package.json` point them at our ESLint. Verified every plugin still reports violations. Remove those three overrides once the plugins list ESLint 10.
- **`typecheck` runs `next typegen` first**: Next 16 generates global types like `LayoutProps` used by `layout.tsx`.

## Files Modified This Session

- Everything (initial commit)

## Evidence of Completion

- [x] `./init.sh` passes: npm ci, typecheck, lint, 3/3 tests, build
- [x] `npm audit`: 0 vulnerabilities

## Notes for Next Session

Next.js 16 has changed APIs; read `node_modules/next/dist/docs/` before writing Next-specific code (see "Next.js Rules" in `AGENTS.md`). `next.config.ts` has `cacheComponents` enabled by default.
