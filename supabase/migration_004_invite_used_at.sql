-- Run in Supabase SQL Editor.
-- Fixes the invites page showing "Pending" forever: nothing was writing
-- invited_emails.used_at. Hooks the existing on-signup trigger to mark
-- invites as used, and backfills rows for already-signed-up users.

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

-- Backfill used_at for users who signed up before this trigger update.
update public.invited_emails ie
set used_at = u.created_at
from auth.users u
where lower(ie.email) = lower(u.email)
  and ie.used_at is null;
