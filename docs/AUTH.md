# Auth and Database

Sign-in is optional. Anyone can use the tutor; signing in with Google saves
the user's tutoring sessions.

## Supabase project

- Project: `roux-tutor` (ref `uhswyjnzypxpdomhlxdy`), org Leverage Workshop, region us-east-1, free plan
- API URL: `https://uhswyjnzypxpdomhlxdy.supabase.co`
- The URL and publishable key are set in Vercel (production, preview, development) and go in `.env.local` for local dev (see `.env.example`). Both are safe to ship to the browser: RLS protects the data.

## How sign-in works

1. `src/components/AuthButton.tsx` calls `signInWithOAuth({ provider: "google" })` with `redirectTo` = `<site>/auth/callback?next=<current path>`.
2. Google sends the user to Supabase, which redirects to `/auth/callback` with a one-time code.
3. `src/app/auth/callback/route.ts` swaps the code for a session cookie and redirects to `next` (same-site paths only, see `src/lib/supabase/redirect.ts`). Failures go to `/auth/error`.
4. `src/proxy.ts` refreshes the session cookie on every request.

Supabase clients: `src/lib/supabase/client.ts` (browser), `server.ts` (Server Components, Route Handlers), `proxy.ts` (session refresh). Each returns null when the env vars are missing, so the app still builds and runs with sign-in hidden.

## Tables

| Table | Purpose | RLS |
|---|---|---|
| `tutoring_sessions` | One row per guided solve: start facelets, source (`scan`/`manual`/`scramble`), move list, `steps_completed`, `started_at`, `updated_at`, `completed_at` | Signed-in users can select/insert/update/delete only rows where `user_id = auth.uid()`. `anon` has no access |

- Migrations live in `supabase/migrations/` and were applied with the Supabase MCP `apply_migration` tool.
- Regenerate `src/types/database.ts` after every migration.
- Read/write helpers: `src/lib/supabase/tutoringSessions.ts` (`startTutoringSession`, `saveTutoringProgress`, `completeTutoringSession`, `listTutoringSessions`).

## One-time Google setup (done 2026-10-28)

Already done for project roux-tutor. Repeat only for a new project or a new Google client.

1. **Google Cloud Console** (use "Desktop site" on a phone):
   1. Create a project "Roux Tutor" and select it.
   2. Google Auth Platform (`console.cloud.google.com/auth/overview`) > Get started: app name Roux Tutor, support email, Audience **External**, contact email, agree, Create. No authorized domains or extra scopes needed: Supabase only asks for `email` and `profile`.
   3. Clients (`/auth/clients`) > Create client > **Web application**:
      - Authorized JavaScript origins: `https://rouxtutor.leverageworkshop.com`
      - Authorized redirect URI: `https://uhswyjnzypxpdomhlxdy.supabase.co/auth/v1/callback`
      - Copy the Client ID and secret right away (the secret may not be shown again).
   4. Audience (`/auth/audience`) > **Publish app**. In "Testing" only listed test users can sign in.
2. **Supabase dashboard** (project roux-tutor):
   1. Authentication > Sign In / Providers: under User Signups, **Allow new users to sign up** must be on (otherwise the callback fails with "422: Signups not allowed for this instance").
   2. Same page > Google: enable, paste Client ID and secret, save.
   3. Authentication > URL Configuration:
      - Site URL: `https://rouxtutor.leverageworkshop.com`
      - Redirect URLs: `https://rouxtutor.leverageworkshop.com/auth/callback`, `http://localhost:3000/auth/callback`, `https://*-leverage-workshop-s-projects.vercel.app/**` (Vercel previews)

Checks:
- `curl -I "https://uhswyjnzypxpdomhlxdy.supabase.co/auth/v1/authorize?provider=google"` should return 302 to `accounts.google.com`.
- If sign-in lands on `/auth/error`, read the Supabase auth logs (Supabase MCP `query_logs`, `source = 'auth_logs'`) for the reason.
