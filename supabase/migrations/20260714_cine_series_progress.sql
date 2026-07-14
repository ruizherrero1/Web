-- Series progress per user: which season/episode each user is on.
-- Only meaningful for media_type = 'series'; movies leave these null.

alter table public.cine_user_title_states
  add column if not exists progress_season integer,
  add column if not exists progress_episode integer;
