create schema if not exists private;

create or replace function private.is_cine_user()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.cine_profiles p
    where p.id = auth.uid()
  );
$$;

revoke all on function private.is_cine_user() from public;
grant usage on schema private to authenticated;
grant execute on function private.is_cine_user() to authenticated;

drop policy if exists "cine profiles visible to cine users" on public.cine_profiles;
create policy "cine profiles visible to cine users"
  on public.cine_profiles for select
  to authenticated
  using (private.is_cine_user());

drop policy if exists "cine titles visible to cine users" on public.cine_titles;
create policy "cine titles visible to cine users"
  on public.cine_titles for select
  to authenticated
  using (private.is_cine_user());

drop policy if exists "cine availability visible to cine users" on public.cine_availability;
create policy "cine availability visible to cine users"
  on public.cine_availability for select
  to authenticated
  using (private.is_cine_user());

drop policy if exists "cine states visible to cine users" on public.cine_user_title_states;
create policy "cine states visible to cine users"
  on public.cine_user_title_states for select
  to authenticated
  using (private.is_cine_user());

drop policy if exists "cine users insert own state" on public.cine_user_title_states;
drop policy if exists "cine users update own state" on public.cine_user_title_states;
drop policy if exists "cine users insert shared states" on public.cine_user_title_states;
create policy "cine users insert shared states"
  on public.cine_user_title_states for insert
  to authenticated
  with check (private.is_cine_user());

drop policy if exists "cine users update shared states" on public.cine_user_title_states;
create policy "cine users update shared states"
  on public.cine_user_title_states for update
  to authenticated
  using (private.is_cine_user())
  with check (private.is_cine_user());

drop policy if exists "cine pending categories visible to cine users" on public.cine_pending_categories;
create policy "cine pending categories visible to cine users"
  on public.cine_pending_categories for select
  to authenticated
  using (private.is_cine_user());

drop policy if exists "cine pending items visible to cine users" on public.cine_pending_items;
create policy "cine pending items visible to cine users"
  on public.cine_pending_items for select
  to authenticated
  using (private.is_cine_user());

drop policy if exists "cine users add pending items" on public.cine_pending_items;
create policy "cine users add pending items"
  on public.cine_pending_items for insert
  to authenticated
  with check (added_by = (select auth.uid()) and private.is_cine_user());

drop policy if exists "cine users remove pending items" on public.cine_pending_items;
create policy "cine users remove pending items"
  on public.cine_pending_items for delete
  to authenticated
  using (private.is_cine_user());

drop policy if exists "cine marks visible to cine users" on public.cine_user_marks;
create policy "cine marks visible to cine users"
  on public.cine_user_marks for select
  to authenticated
  using (private.is_cine_user());

drop policy if exists "cine users insert marks" on public.cine_user_marks;
create policy "cine users insert marks"
  on public.cine_user_marks for insert
  to authenticated
  with check (private.is_cine_user());

drop policy if exists "cine users update marks" on public.cine_user_marks;
create policy "cine users update marks"
  on public.cine_user_marks for update
  to authenticated
  using (private.is_cine_user())
  with check (private.is_cine_user());

drop policy if exists "cine users upsert titles" on public.cine_titles;
create policy "cine users upsert titles"
  on public.cine_titles for insert
  to authenticated
  with check (private.is_cine_user());

drop policy if exists "cine users update titles" on public.cine_titles;
create policy "cine users update titles"
  on public.cine_titles for update
  to authenticated
  using (private.is_cine_user())
  with check (private.is_cine_user());

drop policy if exists "cine users upsert availability" on public.cine_availability;
create policy "cine users upsert availability"
  on public.cine_availability for insert
  to authenticated
  with check (private.is_cine_user());

drop policy if exists "cine users update availability" on public.cine_availability;
create policy "cine users update availability"
  on public.cine_availability for update
  to authenticated
  using (private.is_cine_user())
  with check (private.is_cine_user());

drop policy if exists "cine users delete availability" on public.cine_availability;
create policy "cine users delete availability"
  on public.cine_availability for delete
  to authenticated
  using (private.is_cine_user());