-- Migration: 003_location_management_and_networks.sql
-- Description: Phase 4 location management, multi-network Wi-Fi, archival, and extended amenities.

-- 1. Extend places table with archival status, seating, noise level, work notes, and new amenities
alter table if exists public.places
  add column if not exists is_archived boolean not null default false,
  add column if not exists seating_capacity integer,
  add column if not exists noise_level text check (noise_level is null or noise_level in ('quiet', 'moderate', 'lively')),
  add column if not exists work_notes text,
  add column if not exists comfortable_seating boolean not null default false,
  add column if not exists limited_seating boolean not null default false,
  add column if not exists large_tables boolean not null default false,
  add column if not exists small_tables boolean not null default false,
  add column if not exists drinks_available boolean not null default false,
  add column if not exists quiet_environment boolean not null default false,
  add column if not exists moderate_noise boolean not null default false,
  add column if not exists lively_environment boolean not null default false;

-- Indexes for performance
create index if not exists idx_places_is_archived on public.places(is_archived);
create index if not exists idx_places_category on public.places(category);

-- 2. Extend wifi_networks table for multi-network venue support
alter table if exists public.wifi_networks
  add column if not exists network_type text not null default 'primary',
  add column if not exists is_primary boolean not null default false,
  add column if not exists notes text,
  add column if not exists updated_at timestamptz not null default now();

-- Indexes for wifi networks
create index if not exists idx_wifi_networks_place_active on public.wifi_networks(place_id, is_active);
create index if not exists idx_wifi_networks_is_primary on public.wifi_networks(place_id, is_primary) where is_primary = true;

-- 3. Update public_wifi_networks view (omits password, only active networks)
drop view if exists public.public_wifi_networks;

create view public.public_wifi_networks as
  select 
    id, 
    place_id, 
    ssid, 
    network_type,
    is_primary,
    access_type, 
    instructions, 
    notes,
    verified_at, 
    verified_by, 
    is_active, 
    created_at,
    updated_at
  from public.wifi_networks
  where is_active = true;

-- 4. Update RLS policies for places
-- Public can only see active non-archived places (authenticated admins can see all)
drop policy if exists "Public read places" on public.places;
create policy "Public read places"
on public.places
for select
using (is_archived = false or auth.role() = 'authenticated');

-- Admin write policies for places
drop policy if exists "Admin insert places" on public.places;
create policy "Admin insert places"
on public.places
for insert
with check (auth.role() = 'authenticated');

drop policy if exists "Admin update places" on public.places;
create policy "Admin update places"
on public.places
for update
using (auth.role() = 'authenticated');

drop policy if exists "Admin delete places" on public.places;
create policy "Admin delete places"
on public.places
for delete
using (auth.role() = 'authenticated');

-- 5. Update RLS policies for wifi_networks
drop policy if exists "Public read wifi" on public.wifi_networks;
create policy "Public read wifi"
on public.wifi_networks
for select
using (is_active = true or auth.role() = 'authenticated');

drop policy if exists "Admin insert wifi" on public.wifi_networks;
create policy "Admin insert wifi"
on public.wifi_networks
for insert
with check (auth.role() = 'authenticated');

drop policy if exists "Admin update wifi" on public.wifi_networks;
create policy "Admin update wifi"
on public.wifi_networks
for update
using (auth.role() = 'authenticated');

drop policy if exists "Admin delete wifi" on public.wifi_networks;
create policy "Admin delete wifi"
on public.wifi_networks
for delete
using (auth.role() = 'authenticated');

