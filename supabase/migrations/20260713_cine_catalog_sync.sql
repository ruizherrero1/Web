drop policy if exists "cine users upsert titles" on public.cine_titles;
create policy "cine users upsert titles"
  on public.cine_titles for insert
  to authenticated
  with check (exists (select 1 from public.cine_profiles p where p.id = (select auth.uid())));

drop policy if exists "cine users update titles" on public.cine_titles;
create policy "cine users update titles"
  on public.cine_titles for update
  to authenticated
  using (exists (select 1 from public.cine_profiles p where p.id = (select auth.uid())))
  with check (exists (select 1 from public.cine_profiles p where p.id = (select auth.uid())));

drop policy if exists "cine users upsert availability" on public.cine_availability;
create policy "cine users upsert availability"
  on public.cine_availability for insert
  to authenticated
  with check (exists (select 1 from public.cine_profiles p where p.id = (select auth.uid())));

drop policy if exists "cine users update availability" on public.cine_availability;
create policy "cine users update availability"
  on public.cine_availability for update
  to authenticated
  using (exists (select 1 from public.cine_profiles p where p.id = (select auth.uid())))
  with check (exists (select 1 from public.cine_profiles p where p.id = (select auth.uid())));

drop policy if exists "cine users delete availability" on public.cine_availability;
create policy "cine users delete availability"
  on public.cine_availability for delete
  to authenticated
  using (exists (select 1 from public.cine_profiles p where p.id = (select auth.uid())));

drop policy if exists "cine users insert shared states" on public.cine_user_title_states;
create policy "cine users insert shared states"
  on public.cine_user_title_states for insert
  to authenticated
  with check (exists (select 1 from public.cine_profiles p where p.id = (select auth.uid())));

drop policy if exists "cine users update shared states" on public.cine_user_title_states;
create policy "cine users update shared states"
  on public.cine_user_title_states for update
  to authenticated
  using (exists (select 1 from public.cine_profiles p where p.id = (select auth.uid())))
  with check (exists (select 1 from public.cine_profiles p where p.id = (select auth.uid())));