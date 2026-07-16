-- Match mode: each user swipes yes/no on titles; when both like the same one
-- it becomes a match. One row per user+title.
-- NOTE: includes the UPDATE grant/policy on purpose - the API upserts revotes,
-- and Postgres requires UPDATE privilege for INSERT..ON CONFLICT DO UPDATE
-- (the missing UPDATE on cine_pending_items is what broke pendings for days).

create table if not exists public.cine_match_votes (
  user_id uuid not null references public.cine_profiles(id) on delete cascade,
  title_id uuid not null references public.cine_titles(id) on delete cascade,
  liked boolean not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, title_id)
);

alter table public.cine_match_votes enable row level security;

grant select, insert, update, delete on public.cine_match_votes to authenticated;

drop policy if exists "cine match votes visible to cine users" on public.cine_match_votes;
create policy "cine match votes visible to cine users"
  on public.cine_match_votes for select
  to authenticated
  using (private.is_cine_user());

drop policy if exists "cine users insert own match votes" on public.cine_match_votes;
create policy "cine users insert own match votes"
  on public.cine_match_votes for insert
  to authenticated
  with check (user_id = (select auth.uid()) and private.is_cine_user());

drop policy if exists "cine users update own match votes" on public.cine_match_votes;
create policy "cine users update own match votes"
  on public.cine_match_votes for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "cine users delete own match votes" on public.cine_match_votes;
create policy "cine users delete own match votes"
  on public.cine_match_votes for delete
  to authenticated
  using (user_id = (select auth.uid()));
