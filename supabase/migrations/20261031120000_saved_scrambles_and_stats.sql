-- feat-015: saved scrambles and learning stats.

-- Where each Roux stage ends in a session's move list, so stats can tell how
-- far into the solve the user got: {fb_end, sb_end, cmll_end, lse_end}, each a
-- count of moves from the start (lse_end = number of moves). Empty for rows
-- written before this column existed.
alter table public.tutoring_sessions
  add column stage_ends integer[] not null default '{}'
  constraint tutoring_sessions_stage_ends_check check (
    cardinality(stage_ends) = 0
    or (
      cardinality(stage_ends) = 4
      and array_lower(stage_ends, 1) = 1
      and array_position(stage_ends, null) is null
      and 0 <= stage_ends[1]
      and stage_ends[1] <= stage_ends[2]
      and stage_ends[2] <= stage_ends[3]
      and stage_ends[3] <= stage_ends[4]
      and stage_ends[4] = cardinality(moves)
    )
  );

-- Cubes a signed-in user saved to solve again later. One row per distinct
-- starting position per user.
create table public.saved_scrambles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- 54 facelet letters in Kociemba order, held white on top, green in front.
  facelets text not null check (facelets ~ '^[URFDLB]{54}$'),
  source text not null default 'manual' check (source in ('scan', 'manual', 'scramble')),
  created_at timestamptz not null default now(),
  unique (user_id, facelets)
);

create index saved_scrambles_user_created_idx
  on public.saved_scrambles (user_id, created_at desc);

alter table public.saved_scrambles enable row level security;

create policy "Users read their own saved scrambles"
  on public.saved_scrambles for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users save their own scrambles"
  on public.saved_scrambles for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users delete their own saved scrambles"
  on public.saved_scrambles for delete to authenticated
  using ((select auth.uid()) = user_id);

revoke all on public.saved_scrambles from anon;
grant select, insert, delete on public.saved_scrambles to authenticated;

-- One row of totals per user. security_invoker makes the view run with the
-- caller's rights, so the RLS on tutoring_sessions limits it to the caller's
-- own sessions.
create view public.tutoring_stats
with (security_invoker = true)
as
select
  user_id,
  count(*)::integer as solves_started,
  count(completed_at)::integer as solves_finished,
  -- Sessions that recorded stage boundaries; the denominator for the stage counts.
  count(*) filter (where cardinality(stage_ends) = 4)::integer as staged_solves,
  count(*) filter (where cardinality(stage_ends) = 4 and steps_completed >= stage_ends[1])::integer as fb_done,
  count(*) filter (where cardinality(stage_ends) = 4 and steps_completed >= stage_ends[2])::integer as sb_done,
  count(*) filter (where cardinality(stage_ends) = 4 and steps_completed >= stage_ends[3])::integer as cmll_done,
  count(*) filter (where cardinality(stage_ends) = 4 and steps_completed >= stage_ends[4])::integer as lse_done,
  coalesce(sum(steps_completed), 0)::integer as moves_stepped,
  max(updated_at) as last_active_at
from public.tutoring_sessions
group by user_id;

revoke all on public.tutoring_stats from anon;
grant select on public.tutoring_stats to authenticated;
