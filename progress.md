# Session Progress Log

## Current State

**Last Updated:** 2026-10-26
**Active Feature:** feat-001 - Project Setup (done)

## Status

### What's Done

- [x] Installed `harness-creator` skill (`.claude/skills/harness-creator`, pinned in `skills-lock.json`)
- [x] Created harness: `AGENTS.md` (imported by `CLAUDE.md`), `feature_list.json`, `progress.md`, `session-handoff.md`, `init.sh`
- [x] Saved PRD to `docs/PRODUCT.md`
- [x] Scaffolded Next.js 16 app (TypeScript, Tailwind 4, ESLint, App Router, `src/`)
- [x] Installed PRD stack: zustand, three, @react-three/fiber, @react-three/drei, vaul, @techstark/opencv-js, cubejs, @supabase/supabase-js, @supabase/ssr
- [x] Added Vitest + Testing Library and a stack smoke test

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
- **`@types/node` ^22**: Vitest 5 requires it; runtime is Node 22.
- **`typecheck` runs `next typegen` first**: Next 16 generates global types like `LayoutProps` used by `layout.tsx`.
- **Context7 MCP in `.mcp.json`**: project-scoped so every agent session gets current library docs. No API key (free tier rate limits); add a `CONTEXT7_API_KEY` header later if limits bite.

## Files Modified This Session

- Everything (initial commit)

## Evidence of Completion

- [x] `./init.sh` passes: npm ci, typecheck, lint, 3/3 tests, build
- [x] `npm audit`: 0 vulnerabilities

## Notes for Next Session

Next.js 16 has changed APIs; read `node_modules/next/dist/docs/` before writing Next-specific code (see "Next.js Rules" in `AGENTS.md`). `next.config.ts` has `cacheComponents` enabled by default.
