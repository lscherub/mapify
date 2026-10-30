-- Migration: 004_speed_tests_and_verification.sql
-- Description: Phase 5 Wi-Fi speed testing, network verification, and submission review queue.

-- 1. Extend wifi_networks with verification status, notes, and latest speed test summary
alter table if exists public.wifi_networks
  add column if not exists verification_status text not null default 'unverified',
  add column if not exists verification_notes text,
  add column if not exists download_mbps numeric(6, 2),
  add column if not exists upload_mbps numeric(6, 2),
  add column if not exists latency_ms integer,
  add column if not exists jitter_ms integer,
  add column if not exists speed_tested_at timestamptz;

-- Verification status constraint
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'check_wifi_networks_verification_status'
  ) then
    alter table public.wifi_networks
      add constraint check_wifi_networks_verification_status
      check (verification_status in ('unverified', 'pending', 'verified', 'rejected', 'expired'));
  end if;
end $$;

-- 2. Create wifi_speed_tests table for historical speed test tracking
create table if not exists public.wifi_speed_tests (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references public.places(id) on delete cascade,
  wifi_network_id uuid not null references public.wifi_networks(id) on delete cascade,
  download_mbps numeric(6, 2) not null,
  upload_mbps numeric(6, 2) not null,
  latency_ms integer not null,
  jitter_ms integer,
  tested_at timestamptz not null default now(),
  tested_by text not null,
  notes text,
  is_approved_for_public boolean not null default true,
  created_at timestamptz not null default now()
);

-- Indexes for speed tests
create index if not exists idx_wifi_speed_tests_network on public.wifi_speed_tests(wifi_network_id, tested_at desc);
create index if not exists idx_wifi_speed_tests_place on public.wifi_speed_tests(place_id, tested_at desc);

-- 3. Extend wifi_submissions with admin notes
alter table if exists public.wifi_submissions
  add column if not exists admin_notes text;

-- 4. Update public_wifi_networks view (omits password, only active networks)
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
    verification_status,
    verification_notes,
    verified_at, 
    verified_by, 
    download_mbps,
    upload_mbps,
    latency_ms,
    jitter_ms,
    speed_tested_at,
    is_active, 
    created_at,
    updated_at
  from public.wifi_networks
  where is_active = true;

-- 5. Row Level Security for wifi_speed_tests
alter table public.wifi_speed_tests enable row level security;

-- Public can read approved speed tests
drop policy if exists "Public read approved speed tests" on public.wifi_speed_tests;
create policy "Public read approved speed tests"
on public.wifi_speed_tests
for select
using (is_approved_for_public = true or auth.role() = 'authenticated');

-- Admin write policies for speed tests
drop policy if exists "Admin insert speed tests" on public.wifi_speed_tests;
create policy "Admin insert speed tests"
on public.wifi_speed_tests
for insert
with check (auth.role() = 'authenticated');

drop policy if exists "Admin update speed tests" on public.wifi_speed_tests;
create policy "Admin update speed tests"
on public.wifi_speed_tests
for update
using (auth.role() = 'authenticated');

drop policy if exists "Admin delete speed tests" on public.wifi_speed_tests;
create policy "Admin delete speed tests"
on public.wifi_speed_tests
for delete
using (auth.role() = 'authenticated');

-- 6. RLS update policy for wifi_submissions (so admins can approve/reject)
drop policy if exists "Admin update submissions" on public.wifi_submissions;
create policy "Admin update submissions"
on public.wifi_submissions
for update
using (auth.role() = 'authenticated');

