create table if not exists public.cine_user_marks (
  user_id uuid not null references public.cine_profiles(id) on delete cascade,
  tmdb_id integer not null,
  media_type text not null check (media_type in ('movie', 'series')),
  status text not null default 'none' check (status in ('none', 'watching', 'watched', 'abandoned')),
  rating integer check (rating between 1 and 10),
  watched_at date,
  updated_at timestamptz not null default now(),
  primary key (user_id, tmdb_id, media_type)
);

alter table public.cine_user_marks enable row level security;

drop policy if exists "cine marks visible to cine users" on public.cine_user_marks;
create policy "cine marks visible to cine users"
  on public.cine_user_marks for select
  to authenticated
  using (exists (select 1 from public.cine_profiles p where p.id = (select auth.uid())));

drop policy if exists "cine users insert marks" on public.cine_user_marks;
create policy "cine users insert marks"
  on public.cine_user_marks for insert
  to authenticated
  with check (exists (select 1 from public.cine_profiles p where p.id = (select auth.uid())));

drop policy if exists "cine users update marks" on public.cine_user_marks;
create policy "cine users update marks"
  on public.cine_user_marks for update
  to authenticated
  using (exists (select 1 from public.cine_profiles p where p.id = (select auth.uid())))
  with check (exists (select 1 from public.cine_profiles p where p.id = (select auth.uid())));

create index if not exists cine_user_marks_title_idx
  on public.cine_user_marks (tmdb_id, media_type);
