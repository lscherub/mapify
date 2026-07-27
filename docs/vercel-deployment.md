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

## After first deploy

1. Open the site on desktop and mobile.
2. Confirm map tiles load.
3. Confirm search suggestions work.
4. Confirm place details open and scroll.
5. Confirm the offline page works by disabling network briefly.
6. Confirm service worker registration in the browser devtools.

## Optional follow-up

1. Add a custom domain.
2. Add auth protection for `/admin`.
3. Replace demo places with real Metro Vancouver data.
4. Add photo uploads and CSV import flows.
