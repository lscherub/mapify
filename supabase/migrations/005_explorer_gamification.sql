-- Migration: 005_explorer_gamification.sql
-- Description: Phase 6 Mapify Explorer (Gamification & Real-World Exploration Mode)
-- Introduces explorer profiles, venue collections, XP transaction ledger, and achievement unlocks.

-- 1. Create explorer_profiles table
create table if not exists public.explorer_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  display_name text not null default 'Explorer',
  level integer not null default 1,
  xp integer not null default 0,
  current_streak integer not null default 0,
  longest_streak integer not null default 0,
  last_active_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_explorer_profiles_user on public.explorer_profiles(user_id);
create index if not exists idx_explorer_profiles_xp on public.explorer_profiles(xp desc);

-- 2. Create explorer_collections table
create table if not exists public.explorer_collections (
  id uuid primary key default gen_random_uuid(),
  explorer_id uuid not null references public.explorer_profiles(id) on delete cascade,
  place_id uuid references public.places(id) on delete set null,
  place_name text not null,
  category text not null,
  address text,
  city text,
  latitude numeric(10, 7) not null,
  longitude numeric(10, 7) not null,
  notes text,
  discovered_at timestamptz not null default now(),
  constraint uq_explorer_collection_place unique (explorer_id, place_id)
);

create index if not exists idx_explorer_collections_explorer on public.explorer_collections(explorer_id);
create index if not exists idx_explorer_collections_place on public.explorer_collections(place_id);

-- 3. Create explorer_xp_transactions table (immutable audit ledger)
create table if not exists public.explorer_xp_transactions (
  id uuid primary key default gen_random_uuid(),
  explorer_id uuid not null references public.explorer_profiles(id) on delete cascade,
  amount integer not null,
  reason text not null,
  reference_id text,
  description text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_explorer_xp_explorer on public.explorer_xp_transactions(explorer_id);
create index if not exists idx_explorer_xp_reason_ref on public.explorer_xp_transactions(explorer_id, reason, reference_id);

-- 4. Create explorer_user_achievements table
create table if not exists public.explorer_user_achievements (
  id uuid primary key default gen_random_uuid(),
  explorer_id uuid not null references public.explorer_profiles(id) on delete cascade,
  achievement_id text not null,
  unlocked_at timestamptz not null default now(),
  constraint uq_explorer_achievement unique (explorer_id, achievement_id)
);

create index if not exists idx_explorer_achievements_explorer on public.explorer_user_achievements(explorer_id);

-- 5. Row Level Security
alter table public.explorer_profiles enable row level security;
alter table public.explorer_collections enable row level security;
alter table public.explorer_xp_transactions enable row level security;
alter table public.explorer_user_achievements enable row level security;

-- Profiles: Public can read, authenticated or matching owners can insert/update
drop policy if exists "Public read explorer profiles" on public.explorer_profiles;
create policy "Public read explorer profiles"
on public.explorer_profiles
for select
using (true);

drop policy if exists "Users insert own explorer profile" on public.explorer_profiles;
create policy "Users insert own explorer profile"
on public.explorer_profiles
for insert
with check (
  auth.uid() is null or user_id = auth.uid()
);

drop policy if exists "Users update own explorer profile" on public.explorer_profiles;
create policy "Users update own explorer profile"
on public.explorer_profiles
for update
using (
  auth.uid() is null or user_id = auth.uid() or auth.role() = 'authenticated'
);

-- Collections: Read own collections or public collections
drop policy if exists "Read explorer collections" on public.explorer_collections;
create policy "Read explorer collections"
on public.explorer_collections
for select
using (true);

drop policy if exists "Insert explorer collections" on public.explorer_collections;
create policy "Insert explorer collections"
on public.explorer_collections
for insert
with check (true);

-- XP transactions: Read own ledger
drop policy if exists "Read xp transactions" on public.explorer_xp_transactions;
create policy "Read xp transactions"
on public.explorer_xp_transactions
for select
using (true);

-- Achievements: Read own achievements
drop policy if exists "Read user achievements" on public.explorer_user_achievements;
create policy "Read user achievements"
on public.explorer_user_achievements
for select
using (true);

