-- Run in Supabase SQL Editor to lock signup to an admin-managed allowlist.

create table public.invited_emails (
  email text primary key,
  added_by uuid references public.profiles(id),
  added_at timestamptz not null default now(),
  used_at timestamptz
);

alter table public.invited_emails enable row level security;

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

-- SECURITY DEFINER function so the signup flow (running as anon)
-- can check membership without exposing the full allowlist.
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

-- Seed your admin email so you don't lock yourself out on first signup
-- retry. Replace below with your own email address if different.
-- insert into public.invited_emails (email) values ('kgibson.ky@gmail.com');
