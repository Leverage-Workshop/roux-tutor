-- One row per guided solve. Owned by the signed-in user; RLS limits every
-- read and write to the owner.
create table public.tutoring_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- Cube at the start of the solve: 54 facelet letters in Kociemba order.
  start_facelets text not null check (start_facelets ~ '^[URFDLB]{54}$'),
  -- Where the start position came from.
  source text not null default 'manual' check (source in ('scan', 'manual', 'scramble')),
  -- Solve sequence being taught, one move per element (e.g. {"R","U'","M2"}).
  moves text[] not null default '{}',
  -- How many of `moves` the user has stepped through.
  steps_completed integer not null default 0
    check (steps_completed >= 0 and steps_completed <= cardinality(moves)),
  started_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create index tutoring_sessions_user_started_idx
  on public.tutoring_sessions (user_id, started_at desc);

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger tutoring_sessions_set_updated_at
  before update on public.tutoring_sessions
  for each row execute function public.set_updated_at();

alter table public.tutoring_sessions enable row level security;

create policy "Users read their own sessions"
  on public.tutoring_sessions for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users create their own sessions"
  on public.tutoring_sessions for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users update their own sessions"
  on public.tutoring_sessions for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users delete their own sessions"
  on public.tutoring_sessions for delete to authenticated
  using ((select auth.uid()) = user_id);

revoke all on public.tutoring_sessions from anon;
grant select, insert, update, delete on public.tutoring_sessions to authenticated;
