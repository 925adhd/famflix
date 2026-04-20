-- Run this in Supabase SQL Editor to add insert/update/delete policies
-- for titles and episodes. Safe to run once.

create policy "titles writable by admin or uploader"
  on public.titles for insert
  to authenticated
  with check (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role in ('admin', 'uploader')
    )
  );

create policy "titles updatable by admin or owner"
  on public.titles for update
  to authenticated
  using (
    uploaded_by = auth.uid()
    or exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
    )
  );

create policy "titles deletable by admin or owner"
  on public.titles for delete
  to authenticated
  using (
    uploaded_by = auth.uid()
    or exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
    )
  );

create policy "episodes writable by admin or uploader"
  on public.episodes for all
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role in ('admin', 'uploader')
    )
  )
  with check (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role in ('admin', 'uploader')
    )
  );
