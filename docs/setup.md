# Setup Guide

## 1) Create Supabase

1. Create a new project in Supabase.
2. Open the SQL editor.
3. Run `supabase/schema.sql`.
4. Run `supabase/seed.sql` if you want starter demo data.
5. Copy the project URL and keys from the project settings.

## 2) Add environment variables

Create `.env.local` from `.env.example` and fill in:

- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `AUTOCOMPLETE_PROVIDER=opencage` for the free OpenStreetMap/OpenCage path
- `OPENCAGE_API_KEY` for free geocoding autocomplete
- `ADMIN_ROUTE_SLUG`
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD_HASH`
- `ADMIN_SESSION_SECRET`

You do not need a Google Maps key for this version. The map uses MapLibre with OpenStreetMap tiles, and autocomplete/search uses OpenCage plus OpenStreetMap/Nominatim. No paid Mapbox plan is required.

## 3) Where to plug in APIs

- `app/api/suggest/route.ts` is the public autocomplete endpoint.
- `lib/autocomplete.ts` merges database suggestions with OpenStreetMap/OpenCage matches.
- `lib/osm.ts` contains the OpenStreetMap/Nominatim/OpenCage search logic and nearby business fetches.
- `app/api/osm/nearby/route.ts` powers the map's on-screen nearby place loading.
- `lib/supabase/server.ts` and `lib/supabase/browser.ts` are the Supabase clients.
- `lib/data.ts` is the query layer that falls back to demo data if Supabase is not configured.
- `app/api/admin/places/route.ts` and `app/api/admin/places/[id]/route.ts` handle create, update, and delete.
- `app/api/admin/import/route.ts` and `app/api/admin/export/route.ts` handle CSV upload/download.
- `app/[adminSlug]/page.tsx` is the hidden admin entry point. The slug comes from `ADMIN_ROUTE_SLUG`.

## 4) Deployment on Vercel

1. Push the repo to GitHub.
2. Import the repository into Vercel.
3. Add the environment variables in the Vercel project settings.
4. Deploy.
5. If you later change Supabase schema or env vars, redeploy after saving the updates.

## 5) Hidden admin route

1. Visit the secret route shown in `ADMIN_ROUTE_SLUG`.
2. Sign in with `ADMIN_USERNAME` and your saved password.
3. Use the dashboard to add, edit, delete, import, and export locations.

## 6) PWA notes

- The app manifest is in `app/manifest.ts`.
- The app icons are generated in `app/icon.tsx` and `app/apple-icon.tsx`.
- The service worker is in `public/sw.js`.
- The offline fallback page is `app/offline/page.tsx`.

## 7) What I still need from you later

- Any real Supabase schema changes after the MVP.
- Real place data for Metro Vancouver.
- Any extra fields you want in the admin form.
