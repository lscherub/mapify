# Vercel Deployment Checklist

## Before you deploy

1. Create your Supabase project.
2. Run `supabase/schema.sql`.
3. Optionally run `supabase/seed.sql`.
4. Put the following values into `.env.local`:
   - `NEXT_PUBLIC_SITE_URL`
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `AUTOCOMPLETE_PROVIDER=opencage`
   - `OPENCAGE_API_KEY`
   - `ADMIN_ROUTE_SLUG`
   - `ADMIN_USERNAME`
   - `ADMIN_PASSWORD_HASH`
   - `ADMIN_SESSION_SECRET`
5. Confirm you do not need `GOOGLE_MAPS_API_KEY` or `MAPBOX_ACCESS_TOKEN` for this build. The app uses MapLibre with OpenStreetMap tiles and OpenCage/Nominatim for geocoding.

## Push to GitHub

1. Initialize the repo if you have not already.
2. Commit your changes.
3. Push to GitHub.

## Import into Vercel

1. Open Vercel.
2. Import the GitHub repo.
3. Set the project root to the repository root.
4. Add the same environment variables from `.env.local`.
5. Deploy.
6. After the first deploy, visit the hidden admin route from `ADMIN_ROUTE_SLUG` and sign in once with the generated credentials.

## After first deploy

1. Open the site on desktop and mobile.
2. Confirm map tiles load from OpenStreetMap.
3. Grant location permission and confirm the blue live location dot appears and tracks movement.
4. Use the `Locate Me` button to re-center the map.
5. Search for a nearby business name and confirm OpenStreetMap results appear even before it exists in Supabase.
6. Tap a non-database business on the map and confirm the bottom sheet shows business details and a friendly Wi-Fi fallback message when needed.
7. Confirm the offline page works by disabling network briefly.
8. Confirm service worker registration in the browser devtools.

## Optional follow-up

1. Add a custom domain.
2. Add more fields to the admin form if your dataset grows.
3. Replace demo places with real Metro Vancouver data.
4. Add photo uploads or moderation workflows later.
