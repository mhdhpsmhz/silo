# SILO

SILO is a static React app. Supabase is the shared database when configured. Dexie and IndexedDB keep a local snapshot as a read backup and provide local-only mode when Supabase settings are absent.

## Run locally

1. Copy `.env.example` to `.env`.
2. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.
3. Run `npm install`, then `npm run dev`.

The YouTube oEmbed request runs from the browser. The production build does not need the Express server or a server-side database.

## Deploy for free with Cloudflare Pages

- Framework preset: **Vite**
- Build command: `npm run build`
- Build output directory: `dist`
- Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` as build environment variables in the Pages project.

The `_redirects` file keeps client-side routes working after deployment. Supabase remains subject to its Free plan limits and inactivity pause policy.

## Supabase authentication and RLS

1. In Supabase Dashboard, create the first user under **Authentication → Users**. If the existing database already contains library data, create exactly one user before applying `supabase/schema.sql`; the migration assigns unowned legacy rows to that account. If multiple users already exist, the migration stops rather than guessing who owns the old rows.
2. Run `supabase/schema.sql` in the SQL Editor. It adds `owner_id`, replaces public policies with authenticated owner-only policies, and gives each account a separate library.
3. Turn off public sign-ups under **Authentication → Settings → General configuration**. Add any future accounts manually from **Authentication → Users**.
4. Set the Supabase project URL and publishable key as build environment variables, then rebuild and deploy the static site.

The app has a sign-in form only. It persists the Supabase session, protects all library routes, and clears cached query data when the signed-in account changes. IndexedDB snapshots are partitioned by Supabase user ID.

## Local data

With Supabase configured, each successful library load refreshes the local snapshot. If Supabase is temporarily unavailable, the app can still display the last cached snapshot; writes still require a Supabase connection. Without Supabase settings, reads and writes use only the current browser profile. Local data does not sync across devices and may be cleared with browser storage, so use the app's export feature for a portable backup.
