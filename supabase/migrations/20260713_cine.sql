create extension if not exists pgcrypto;

create table if not exists public.cine_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  initials text not null unique check (initials in ('RR', 'LB')),
  display_name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.cine_titles (
  id uuid primary key default gen_random_uuid(),
  tmdb_id integer not null,
  media_type text not null check (media_type in ('movie', 'series')),
  title text not null,
  original_title text,
  overview text,
  poster_path text not null,
  backdrop_path text,
  release_year integer,
  runtime_label text,
  genres text[] not null default '{}',
  tmdb_vote numeric(3, 1),
  tmdb_popularity numeric(10, 3),
  imdb_rating numeric(3, 1),
  imdb_votes integer,
  rt_tomatometer integer check (rt_tomatometer between 0 and 100),
  rt_popcornmeter integer check (rt_popcornmeter between 0 and 100),
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tmdb_id, media_type)
);

create table if not exists public.cine_availability (
  title_id uuid not null references public.cine_titles(id) on delete cascade,
  provider_key text not null check (provider_key in ('netflix', 'prime', 'movistar', 'max', 'disney')),
  monetization text not null default 'included' check (monetization in ('included', 'rent', 'buy')),
  region text not null default 'ES',
  source text not null default 'tmdb_justwatch',
  updated_at timestamptz not null default now(),
  primary key (title_id, provider_key, monetization, region)
);

create table if not exists public.cine_user_title_states (
  user_id uuid not null references public.cine_profiles(id) on delete cascade,
  title_id uuid not null references public.cine_titles(id) on delete cascade,
  status text not null default 'none' check (status in ('none', 'watching', 'watched', 'abandoned')),
  rating integer check (rating between 1 and 10),
  watched_at date,
  updated_at timestamptz not null default now(),
  primary key (user_id, title_id)
);

create table if not exists public.cine_pending_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  sort_order integer not null default 0
);

create table if not exists public.cine_pending_items (
  id uuid primary key default gen_random_uuid(),
  title_id uuid not null references public.cine_titles(id) on delete cascade,
  category_id uuid not null references public.cine_pending_categories(id) on delete cascade,
  added_by uuid not null references public.cine_profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (title_id, category_id)
);

alter table public.cine_profiles enable row level security;
alter table public.cine_titles enable row level security;
alter table public.cine_availability enable row level security;
alter table public.cine_user_title_states enable row level security;
alter table public.cine_pending_categories enable row level security;
alter table public.cine_pending_items enable row level security;

drop policy if exists "cine profiles visible to cine users" on public.cine_profiles;
create policy "cine profiles visible to cine users"
  on public.cine_profiles for select
  to authenticated
  using (exists (select 1 from public.cine_profiles p where p.id = (select auth.uid())));

drop policy if exists "cine titles visible to cine users" on public.cine_titles;
create policy "cine titles visible to cine users"
  on public.cine_titles for select
  to authenticated
  using (exists (select 1 from public.cine_profiles p where p.id = (select auth.uid())));

drop policy if exists "cine availability visible to cine users" on public.cine_availability;
create policy "cine availability visible to cine users"
  on public.cine_availability for select
  to authenticated
  using (exists (select 1 from public.cine_profiles p where p.id = (select auth.uid())));

drop policy if exists "cine states visible to cine users" on public.cine_user_title_states;
create policy "cine states visible to cine users"
  on public.cine_user_title_states for select
  to authenticated
  using (exists (select 1 from public.cine_profiles p where p.id = (select auth.uid())));

drop policy if exists "cine users insert own state" on public.cine_user_title_states;
create policy "cine users insert own state"
  on public.cine_user_title_states for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "cine users update own state" on public.cine_user_title_states;
create policy "cine users update own state"
  on public.cine_user_title_states for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "cine pending categories visible to cine users" on public.cine_pending_categories;
create policy "cine pending categories visible to cine users"
  on public.cine_pending_categories for select
  to authenticated
  using (exists (select 1 from public.cine_profiles p where p.id = (select auth.uid())));

drop policy if exists "cine pending items visible to cine users" on public.cine_pending_items;
create policy "cine pending items visible to cine users"
  on public.cine_pending_items for select
  to authenticated
  using (exists (select 1 from public.cine_profiles p where p.id = (select auth.uid())));

drop policy if exists "cine users add pending items" on public.cine_pending_items;
create policy "cine users add pending items"
  on public.cine_pending_items for insert
  to authenticated
  with check (
    added_by = (select auth.uid())
    and exists (select 1 from public.cine_profiles p where p.id = (select auth.uid()))
  );

drop policy if exists "cine users remove pending items" on public.cine_pending_items;
create policy "cine users remove pending items"
  on public.cine_pending_items for delete
  to authenticated
  using (exists (select 1 from public.cine_profiles p where p.id = (select auth.uid())));

insert into public.cine_pending_categories (name, sort_order)
values
  ('Para ver juntos', 10),
  ('Pelis de RR', 20),
  ('Pelis de LB', 30),
  ('Series pendientes', 40),
  ('Fin de semana', 50),
  ('Alta prioridad', 60)
on conflict (name) do update set sort_order = excluded.sort_order;

create index if not exists cine_titles_media_popularity_idx
  on public.cine_titles (media_type, tmdb_popularity desc nulls last);

create index if not exists cine_titles_vote_idx
  on public.cine_titles (tmdb_vote desc nulls last);

create index if not exists cine_availability_provider_idx
  on public.cine_availability (provider_key, monetization, region);
