-- Multi-source ratings for Cine titles.
-- IMDb rating/votes and rt_tomatometer already exist from 20260713_cine.sql.
-- This migration adds IMDb id (for stable OMDb lookups), real runtime in minutes,
-- Metacritic metascore and a freshness timestamp for external ratings.

alter table public.cine_titles
  add column if not exists imdb_id text,
  add column if not exists runtime_minutes integer,
  add column if not exists metascore integer,
  add column if not exists ratings_updated_at timestamptz;

-- Guard metascore range without failing if the constraint already exists.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'cine_titles_metascore_range'
  ) then
    alter table public.cine_titles
      add constraint cine_titles_metascore_range
      check (metascore is null or metascore between 0 and 100);
  end if;
end $$;

-- Enrichment picks the stalest titles first, so index on the freshness column.
create index if not exists cine_titles_ratings_updated_idx
  on public.cine_titles (ratings_updated_at nulls first);
