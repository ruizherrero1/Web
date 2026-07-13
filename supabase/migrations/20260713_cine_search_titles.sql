alter table public.cine_titles
  add column if not exists search_titles text[] not null default '{}';

create index if not exists cine_titles_search_titles_gin_idx
  on public.cine_titles using gin (search_titles);