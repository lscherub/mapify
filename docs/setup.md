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
- `AUTOCOMPLETE_PROVIDER`
- `OPENCAGE_API_KEY` for free geocoding autocomplete

## 3) Where to plug in APIs

- `app/api/suggest/route.ts` is the place to connect a real autocomplete provider.
- `lib/autocomplete.ts` contains the provider switch and fallback logic.
- `lib/supabase/server.ts` and `lib/supabase/browser.ts` are the Supabase clients.
- `lib/data.ts` is the query layer that currently falls back to demo data if Supabase is not configured.
- `app/api/health/route.ts` is a simple route you can expand for monitoring.

## 4) Deployment on Vercel

1. Push the repo to GitHub.
2. Import the repository into Vercel.
3. Add the environment variables in the Vercel project settings.
4. Deploy.
5. If you later change Supabase schema or env vars, redeploy after saving the updates.

## 5) PWA notes

- The app manifest is in `app/manifest.ts`.
- The app icons are generated in `app/icon.tsx` and `app/apple-icon.tsx`.
- The service worker is in `public/sw.js`.
- The offline fallback page is `app/offline/page.tsx`.

## 6) What I still need from you later

- A real autocomplete provider choice if you want something other than OpenCage.
- Supabase project credentials.
- Real place data for Metro Vancouver.
- Any admin auth preference if you want the dashboard next.
