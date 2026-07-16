-- Hidden titles: hiding a title removes it from the whole app for both users.
-- The flag lives on the title row, so re-syncs cannot resurrect it (the
-- importer's upsert never touches columns it does not send).

alter table public.cine_titles
  add column if not exists hidden boolean not null default false;
