-- Run this in the Supabase SQL Editor.
-- Adds file_size_bytes column to titles and episodes so we can enforce a
-- hard storage cap before signing uploads.

alter table public.titles    add column if not exists file_size_bytes bigint;
alter table public.episodes  add column if not exists file_size_bytes bigint;
