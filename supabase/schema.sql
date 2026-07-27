create extension if not exists "pgcrypto";

create table if not exists public.places (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  category text not null,
  latitude numeric(10, 7) not null,
  longitude numeric(10, 7) not null,
  address text not null,
  city text not null,
  website text,
  phone text,
  has_wifi boolean not null default false,
  wifi_free boolean not null default false,
  notes text,
  hours text,
  verified_at date,
  verified_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  power_outlets boolean not null default false,
  laptop_friendly boolean not null default false,
  quiet boolean not null default false,
  restrooms boolean not null default false,
  outdoor_seating boolean not null default false,
  air_conditioning boolean not null default false,
  wheelchair_accessible boolean not null default false,
  food_available boolean not null default false,
  coffee_available boolean not null default false
);

create table if not exists public.wifi_networks (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references public.places(id) on delete cascade,
  ssid text not null,
  password text,
  verified_at date not null default current_date,
  verified_by text not null default 'Admin verified',
  created_at timestamptz not null default now()
);

create table if not exists public.photos (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references public.places(id) on delete cascade,
  url text not null,
  alt text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.admins (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  created_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trigger_places_updated_at on public.places;
create trigger trigger_places_updated_at
before update on public.places
for each row execute function public.set_updated_at();

alter table public.places enable row level security;
alter table public.wifi_networks enable row level security;
alter table public.photos enable row level security;
alter table public.admins enable row level security;

drop policy if exists "Public read places" on public.places;
create policy "Public read places"
on public.places
for select
using (true);

drop policy if exists "Public read wifi" on public.wifi_networks;
create policy "Public read wifi"
on public.wifi_networks
for select
using (true);

drop policy if exists "Public read photos" on public.photos;
create policy "Public read photos"
on public.photos
for select
using (true);

drop policy if exists "Admin read admins" on public.admins;
create policy "Admin read admins"
on public.admins
for select
using (auth.role() = 'authenticated');

-- No public write policies. Admin writes should happen through a secured server route or dashboard.
