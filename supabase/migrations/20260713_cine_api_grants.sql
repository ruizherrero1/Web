grant select on public.cine_profiles to authenticated;
grant select, insert, update on public.cine_titles to authenticated;
grant select, insert, update, delete on public.cine_availability to authenticated;
grant select, insert, update on public.cine_user_title_states to authenticated;
grant select on public.cine_pending_categories to authenticated;
grant select, insert, delete on public.cine_pending_items to authenticated;
grant select, insert, update on public.cine_user_marks to authenticated;