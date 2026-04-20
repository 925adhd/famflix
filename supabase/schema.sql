-- Initial schema for the family streaming app.
-- Run this in the Supabase SQL Editor after creating your project.

-- Family member profile, 1:1 with auth.users
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  avatar_url text,
  role text not null default 'viewer' check (role in ('admin', 'uploader', 'viewer')),
  is_kid boolean not null default false,
  max_rating text,
  created_at timestamptz not null default now()
);

-- A piece of media in the library
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
  uploaded_by uuid references public.profiles(id),
  r2_object_key text,
  status text not null default 'pending' check (status in ('pending', 'ready', 'failed')),
  created_at timestamptz not null default now()
);

create index titles_kind_idx on public.titles(kind);
create index titles_status_idx on public.titles(status);

-- For TV shows: episodes belong to a title
create table public.episodes (
  id uuid primary key default gen_random_uuid(),
  title_id uuid not null references public.titles(id) on delete cascade,
  season int not null,
  episode int not null,
  name text,
  overview text,
  duration_seconds int,
  r2_object_key text,
  status text not null default 'pending' check (status in ('pending', 'ready', 'failed')),
  created_at timestamptz not null default now(),
  unique (title_id, season, episode)
);

-- Per-profile resume/watch history
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

-- One row per (profile, title) for movies (episode_id is null)
create unique index watch_history_profile_title_idx
  on public.watch_history(profile_id, title_id)
  where episode_id is null;

-- One row per (profile, episode) for TV episodes
create unique index watch_history_profile_episode_idx
  on public.watch_history(profile_id, episode_id)
  where episode_id is not null;

-- Row-level security: everyone signed in can read the library,
-- only admins/uploaders can write. Watch history is per-profile.
alter table public.profiles enable row level security;
alter table public.titles enable row level security;
alter table public.episodes enable row level security;
alter table public.watch_history enable row level security;

create policy "profiles readable by signed-in users"
  on public.profiles for select
  to authenticated using (true);

create policy "profile self-update"
  on public.profiles for update
  to authenticated using (auth.uid() = id);

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

create policy "watch history owner-only"
  on public.watch_history for all
  to authenticated
  using (auth.uid() = profile_id)
  with check (auth.uid() = profile_id);

-- Auto-create a profile row when a new auth user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
