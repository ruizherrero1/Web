-- Original language of each title (ISO 639-1 from TMDB). Used by the importer's
-- western filter; existing rows stay null until the next sync refreshes them.

alter table public.cine_titles
  add column if not exists original_language text;
