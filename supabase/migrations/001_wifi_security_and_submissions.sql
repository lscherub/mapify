-- Migration: 001_wifi_security_and_submissions.sql
-- Description: Add wifi_submissions table, extend wifi_networks, and secure credentials.

-- 1. Extend wifi_networks with access_type, instructions, and active flag
alter table if exists public.wifi_networks 
  add column if not exists access_type text not null default 'free',
  add column if not exists instructions text,
  add column if not exists is_active boolean not null default true;

-- 2. Create wifi_submissions table for public contributions
create table if not exists public.wifi_submissions (
  id uuid primary key default gen_random_uuid(),
  place_id uuid references public.places(id) on delete set null,
  place_name text not null,
  place_address text,
  latitude numeric(10, 7),
  longitude numeric(10, 7),
  ssid text not null,
  password text,
  access_type text not null default 'free', -- 'free', 'paid', 'purchase_required', 'customers_only', 'other'
  instructions text,
  notes text,
  status text not null default 'pending', -- 'pending', 'in_review', 'approved', 'rejected'
  submitted_from_ip text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by text
);

-- Index for querying submissions by status and date
create index if not exists idx_wifi_submissions_status on public.wifi_submissions(status);
create index if not exists idx_wifi_submissions_place_id on public.wifi_submissions(place_id);
create index if not exists idx_wifi_submissions_created_at on public.wifi_submissions(created_at desc);

-- 3. Row Level Security for wifi_submissions
alter table public.wifi_submissions enable row level security;

-- Allow anonymous and public users to submit pending contributions only
drop policy if exists "Public insert pending submissions" on public.wifi_submissions;
create policy "Public insert pending submissions"
on public.wifi_submissions
for insert
with check (status = 'pending');

-- Only authenticated administrators can read submissions
drop policy if exists "Admin read submissions" on public.wifi_submissions;
create policy "Admin read submissions"
on public.wifi_submissions
for select
using (auth.role() = 'authenticated');

-- 4. Create public_wifi_networks view (omits password)
create or replace view public.public_wifi_networks as
  select 
    id, 
    place_id, 
    ssid, 
    access_type, 
    instructions, 
    verified_at, 
    verified_by, 
    is_active, 
    created_at
  from public.wifi_networks
  where is_active = true;

