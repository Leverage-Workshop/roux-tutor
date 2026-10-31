-- Supabase's default privileges give `authenticated` every privilege on new
-- tables and views. Saved scrambles are never edited (RLS has no update
-- policy, so updates already touched no rows) and the stats view is read only:
-- keep the grants to what the app uses.
revoke all on public.saved_scrambles from authenticated;
grant select, insert, delete on public.saved_scrambles to authenticated;

revoke all on public.tutoring_stats from authenticated;
grant select on public.tutoring_stats to authenticated;
