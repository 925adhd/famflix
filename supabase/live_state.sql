-- ============================================================================
-- FAMFLIX — LIVE SUPABASE STATE SNAPSHOT
-- Last updated: 2026-04-20 (invite-only signup)
-- Project: ourfamflix.vercel.app
--
-- This file is a consolidated snapshot of every schema change applied to the
-- live Supabase database. It is NOT meant to be run as-is on an existing
-- database (use schema.sql + migration_*.sql for that). It exists so future
-- audits can diff reality against this file.
-- ============================================================================


-- ==========================================
-- EXTENSIONS
-- ==========================================
-- pgcrypto is auto-enabled by Supabase; used for gen_random_uuid().


-- ==========================================
-- TABLES
-- ==========================================

-- One profile per auth.users row; mirrors Supabase Auth users.
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  avatar_url text,
  role text not null default 'viewer' check (role in ('admin', 'uploader', 'viewer')),
  is_kid boolean not null default false,
  max_rating text,
  created_at timestamptz not null default now()
);

-- Any piece of media in the library. For shows, episodes live in public.episodes.
create table public.titles (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('movie', 'show')),
  name text not null,
  year int,
  overview text,
  poster_url text,
  backdrop_url text,
  tmdb_id int,
  rating text,
  duration_seconds int,
  file_size_bytes bigint,
  uploaded_by uuid references public.profiles(id),
  r2_object_key text,
  status text not null default 'pending' check (status in ('pending', 'ready', 'failed')),
  created_at timestamptz not null default now()
);

create index titles_kind_idx on public.titles(kind);
create index titles_status_idx on public.titles(status);

-- Individual episodes for TV shows.
create table public.episodes (
  id uuid primary key default gen_random_uuid(),
  title_id uuid not null references public.titles(id) on delete cascade,
  season int not null,
  episode int not null,
  name text,
  overview text,
  duration_seconds int,
  file_size_bytes bigint,
  r2_object_key text,
  status text not null default 'pending' check (status in ('pending', 'ready', 'failed')),
  created_at timestamptz not null default now(),
  unique (title_id, season, episode)
);

-- Per-profile resume/watch history. One row per (profile, movie) or (profile, episode).
create table public.watch_history (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  title_id uuid references public.titles(id) on delete cascade,
  episode_id uuid references public.episodes(id) on delete cascade,
  position_seconds int not null default 0,
  completed boolean not null default false,
  updated_at timestamptz not null default now(),
  check (title_id is not null or episode_id is not null)
);

create unique index watch_history_profile_title_idx
  on public.watch_history(profile_id, title_id)
  where episode_id is null;

create unique index watch_history_profile_episode_idx
  on public.watch_history(profile_id, episode_id)
  where episode_id is not null;

-- Email allowlist for invite-only signup.
create table public.invited_emails (
  email text primary key,
  added_by uuid references public.profiles(id),
  added_at timestamptz not null default now(),
  used_at timestamptz
);


-- ==========================================
-- ROW LEVEL SECURITY
-- ==========================================

alter table public.profiles       enable row level security;
alter table public.titles         enable row level security;
alter table public.episodes       enable row level security;
alter table public.watch_history  enable row level security;
alter table public.invited_emails enable row level security;


-- -- profiles --
create policy "profiles readable by signed-in users"
  on public.profiles for select
  to authenticated using (true);

create policy "profile self-update"
  on public.profiles for update
  to authenticated using (auth.uid() = id);


-- -- titles --
create policy "titles readable by signed-in users"
  on public.titles for select
  to authenticated using (true);

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


-- -- episodes --
create policy "episodes readable by signed-in users"
  on public.episodes for select
  to authenticated using (true);

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


-- -- watch_history --
create policy "watch history owner-only"
  on public.watch_history for all
  to authenticated
  using (auth.uid() = profile_id)
  with check (auth.uid() = profile_id);


-- -- invited_emails (admin-only writes; reads go through is_email_invited RPC) --
create policy "admins manage invites"
  on public.invited_emails for all
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
    )
  );


-- ==========================================
-- FUNCTIONS & TRIGGERS
-- ==========================================

-- Auto-create a public.profiles row every time auth.users gains a row,
-- and mark the matching invited_emails row as used so the admin invites
-- page can show "Signed up" vs "Pending".
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1))
  );

  update public.invited_emails
    set used_at = coalesce(used_at, now())
    where lower(email) = lower(new.email);

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- SECURITY DEFINER helper so the anon-run signup flow can check membership
-- in invited_emails without exposing the whole allowlist.
create or replace function public.is_email_invited(check_email text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.invited_emails
    where lower(email) = lower(check_email)
  );
$$;

revoke all on function public.is_email_invited(text) from public;
grant execute on function public.is_email_invited(text) to anon, authenticated;


-- ==========================================
-- ONE-OFF DATA TWEAKS (not schema)
-- ==========================================
-- The first user was promoted to admin via:
--
--   update public.profiles
--   set role = 'admin'
--   where id = (select id from auth.users order by created_at asc limit 1);
--
-- After enabling invite-only signup, existing users were back-seeded into the
-- allowlist so none of them get locked out if they ever need to re-register:
--
--   insert into public.invited_emails (email)
--   select email from auth.users
--   on conflict do nothing;
--
-- When handle_new_user was extended to write used_at, existing rows were
-- back-filled so they show "Signed up" instead of "Pending":
--
--   update public.invited_emails ie
--   set used_at = u.created_at
--   from auth.users u
--   where lower(ie.email) = lower(u.email)
--     and ie.used_at is null;
--
-- None of these are replayable; only included for audit context.


-- ==========================================
-- AUTH PROVIDER SETTINGS (not SQL, change in Dashboard)
-- ==========================================
-- Dashboard → Authentication → Providers → Email
--   - Email signup: enabled
--   - Confirm email: disabled (for easier family onboarding)
--
-- Dashboard → Authentication → URL Configuration
--   - Site URL:       https://ourfamflix.vercel.app
--   - Redirect URLs:  https://ourfamflix.vercel.app/**
--                     http://localhost:3000/**


-- ==========================================
-- END OF SNAPSHOT
-- ==========================================
