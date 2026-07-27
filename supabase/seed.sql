insert into public.places (
  slug,
  name,
  category,
  latitude,
  longitude,
  address,
  city,
  website,
  phone,
  has_wifi,
  wifi_free,
  notes,
  hours,
  verified_at,
  verified_by,
  power_outlets,
  laptop_friendly,
  quiet,
  restrooms,
  outdoor_seating,
  air_conditioning,
  wheelchair_accessible,
  food_available,
  coffee_available
)
values
  (
    'granville-roasters',
    'Granville Roasters',
    'Coffee Shop',
    49.2797000,
    -123.1162000,
    '1025 Granville St, Vancouver, BC',
    'Vancouver',
    'https://example.com/granville-roasters',
    '(604) 555-0124',
    true,
    true,
    'WiFi password is printed on the receipt. Ask at the counter after ordering.',
    '7:00 AM - 7:00 PM',
    '2026-07-18',
    'Admin verified',
    true,
    true,
    true,
    true,
    false,
    true,
    true,
    true,
    true
  ),
  (
    'kitsilano-study-house',
    'Kitsilano Study House',
    'Cafe',
    49.2686000,
    -123.1683000,
    '2455 West 4th Ave, Vancouver, BC',
    'Vancouver',
    'https://example.com/kitsilano-study-house',
    '(604) 555-0188',
    true,
    true,
    'Order anything and staff will share the password at the till.',
    '8:00 AM - 8:00 PM',
    '2026-07-20',
    'Admin verified',
    true,
    true,
    true,
    true,
    true,
    true,
    false,
    true,
    true
  );

insert into public.wifi_networks (place_id, ssid, password, verified_at, verified_by)
select id, 'GranvilleRoasters', 'brewandbrowse', '2026-07-18', 'Admin verified'
from public.places
where slug = 'granville-roasters';

insert into public.wifi_networks (place_id, ssid, password, verified_at, verified_by)
select id, 'KitsStudy', 'studybythesea', '2026-07-20', 'Admin verified'
from public.places
where slug = 'kitsilano-study-house';
