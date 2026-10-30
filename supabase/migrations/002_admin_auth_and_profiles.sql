-- Migration: 002_admin_auth_and_profiles.sql
-- Description: Link public.admins to auth.users, add is_active and role, and configure RLS.

-- 1. Extend public.admins table non-destructively
alter table if exists public.admins
  add column if not exists user_id uuid references auth.users(id) on delete set null,
  add column if not exists is_active boolean not null default true,
  add column if not exists role text not null default 'admin',
  add column if not exists updated_at timestamptz not null default now();

-- 2. Create indexes for quick lookups
create index if not exists idx_admins_user_id on public.admins(user_id);
create index if not exists idx_admins_email on public.admins(email);
create index if not exists idx_admins_is_active on public.admins(is_active);

-- 3. Row Level Security for public.admins
alter table public.admins enable row level security;

-- Drop previous policies to ensure clean state
drop policy if exists "Admin read admins" on public.admins;
drop policy if exists "Admins read own admin profile" on public.admins;
drop policy if exists "Active admins read all admins" on public.admins;

-- Policy: Authenticated users can read their own admin record if active
create policy "Admins read own admin profile"
on public.admins
for select
using (
  auth.uid() is not null and (
    user_id = auth.uid() or
    email = auth.jwt()->>'email'
  )
);

-- 4. Enable RLS on places, wifi_networks, photos for writes
-- Only active administrators can perform INSERT, UPDATE, DELETE on places
drop policy if exists "Admins modify places" on public.places;
create policy "Admins modify places"
on public.places
for all
using (
  exists (
    select 1 from public.admins
    where (admins.user_id = auth.uid() or admins.email = auth.jwt()->>'email')
      and admins.is_active = true
  )
);

-- Only active administrators can perform INSERT, UPDATE, DELETE on wifi_networks
drop policy if exists "Admins modify wifi" on public.wifi_networks;
create policy "Admins modify wifi"
on public.wifi_networks
for all
using (
  exists (
    select 1 from public.admins
    where (admins.user_id = auth.uid() or admins.email = auth.jwt()->>'email')
      and admins.is_active = true
  )
);

