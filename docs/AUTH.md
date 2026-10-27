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

## One-time Google setup (manual)

These steps need the project owner's Google Cloud and Supabase dashboard access.

1. **Google Cloud Console** (console.cloud.google.com), in a project for Roux Tutor:
   1. Google Auth Platform > Branding: app name "Roux Tutor", support email, home page `https://rouxtutor.leverageworkshop.com`, authorized domains `leverageworkshop.com` and `supabase.co`.
   2. Audience: External. Publish the app (in "Testing" only listed test users can sign in).
   3. Data Access: scopes `openid`, `.../auth/userinfo.email`, `.../auth/userinfo.profile`.
   4. Clients > Create client > Web application:
      - Authorized JavaScript origins: `https://rouxtutor.leverageworkshop.com`, `http://localhost:3000`
      - Authorized redirect URI: `https://uhswyjnzypxpdomhlxdy.supabase.co/auth/v1/callback`
   5. Copy the Client ID and Client secret.
2. **Supabase dashboard** (project roux-tutor):
   1. Authentication > Sign In / Providers > Google: enable, paste Client ID and secret, save.
   2. Authentication > URL Configuration:
      - Site URL: `https://rouxtutor.leverageworkshop.com`
      - Redirect URLs: `https://rouxtutor.leverageworkshop.com/auth/callback`, `http://localhost:3000/auth/callback`, `https://*-leverage-workshop-s-projects.vercel.app/**` (Vercel previews)

Check: `curl "https://uhswyjnzypxpdomhlxdy.supabase.co/auth/v1/authorize?provider=google"` should redirect (302) to Google instead of returning "provider is not enabled".
