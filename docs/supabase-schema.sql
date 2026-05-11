/**
 * Supabase Schema Migration
 * =========================
 * Deploy this SQL to your Supabase project to create the required tables and functions.
 *
 * Steps to deploy:
 * 1. Go to Supabase Dashboard > SQL Editor
 * 2. Create a new query
 * 3. Paste this entire file
 * 4. Click "Run"
 *
 * Or use the Supabase CLI:
 *   supabase db push
 */

-- ============================================================================
-- EXTENSIONS
-- ============================================================================

create extension if not exists "pgcrypto";

-- ============================================================================
-- MAIN TABLE: media_items
-- ============================================================================

create table if not exists public.media_items (
  id                text primary key,
  user_id           uuid not null references auth.users(id) on delete cascade,
  media_type        text not null check (media_type in ('movie','tv','anime','manga')),
  status            text not null check (status in ('watchlist','watching','completed','dropped','on_hold')),
  title             text not null,
  year              integer,
  rating            numeric(3,1),
  poster_url        text,
  backdrop_url      text,
  genres            text[] default '{}',
  payload           jsonb not null default '{}'::jsonb,
  progress          jsonb default '{}'::jsonb,
  added_at          timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  version           integer not null default 1,
  deleted_at        timestamptz
);

-- Indexes for common queries
create index if not exists media_items_user_updated 
  on public.media_items (user_id, updated_at desc);

create index if not exists media_items_user_status 
  on public.media_items (user_id, status);

create index if not exists media_items_payload_gin 
  on public.media_items using gin (payload jsonb_path_ops);

-- ============================================================================
-- FUNCTION: Auto-bump version and updated_at on UPDATE
-- ============================================================================

create or replace function public.bump_version()
returns trigger as $$
begin
  new.updated_at := now();
  new.version := coalesce(old.version, 0) + 1;
  return new;
end
$$ language plpgsql;

-- Drop trigger if exists (idempotent)
drop trigger if exists trg_bump_version on public.media_items;

-- Create trigger
create trigger trg_bump_version
  before update on public.media_items
  for each row
  execute function public.bump_version();

-- ============================================================================
-- CONFLICT LOG TABLE: sync_conflicts
-- ============================================================================

create table if not exists public.sync_conflicts (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  item_id      text not null,
  local_payload jsonb not null,
  remote_payload jsonb not null,
  detected_at  timestamptz not null default now(),
  resolved_at  timestamptz,
  resolution   text check (resolution in ('local','remote','merge'))
);

create index if not exists sync_conflicts_user_item 
  on public.sync_conflicts (user_id, item_id);

create index if not exists sync_conflicts_unresolved 
  on public.sync_conflicts (user_id) where resolved_at is null;

-- ============================================================================
-- ROW-LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on media_items
alter table public.media_items enable row level security;

-- Policy: users can only read/write/update/delete their own rows
create policy "own rows select"
  on public.media_items for select
  using (auth.uid() = user_id);

create policy "own rows insert"
  on public.media_items for insert
  with check (auth.uid() = user_id);

create policy "own rows update"
  on public.media_items for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "own rows delete"
  on public.media_items for delete
  using (auth.uid() = user_id);

-- Enable RLS on sync_conflicts
alter table public.sync_conflicts enable row level security;

create policy "own conflicts select"
  on public.sync_conflicts for select
  using (auth.uid() = user_id);

create policy "own conflicts insert"
  on public.sync_conflicts for insert
  with check (auth.uid() = user_id);

create policy "own conflicts update"
  on public.sync_conflicts for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "own conflicts delete"
  on public.sync_conflicts for delete
  using (auth.uid() = user_id);

-- ============================================================================
-- GRANTS (optional but recommended)
-- ============================================================================

grant usage on schema public to anon, authenticated;
grant all privileges on public.media_items to anon, authenticated;
grant all privileges on public.sync_conflicts to anon, authenticated;
