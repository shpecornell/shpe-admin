# shpe-admin

Admin dashboard for SHPE Cornell built with Next.js App Router.

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — it redirects automatically to `/admin/events`.

Create a `.env` file in the project root with:

```bash
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

## Auth

Every route (pages and `/api/admin/*`) is gated by `src/middleware.ts`: signed-out visitors are redirected to `/login` to sign in with Google, and signed-in visitors whose email isn't in the `admin_allowlist` Supabase table are rejected. See `supabase-auth-setup.sql` for the table definition, and manage allowed emails from Supabase's Table Editor.

## File Structure

```
src/
  middleware.ts     # Gates every route: requires Google login + allowlist
  app/
    admin/          # The four dashboard pages: events, members, officers, settings
    api/admin/      # Server-side API routes for each section
    auth/callback/  # OAuth callback route (exchanges Google code for a session)
    login/          # Google sign-in page
    globals.css     # Shared CSS classes
    layout.tsx      # Root layout (font, HTML shell)
  components/
    admin/          # Sidebar nav (including sign-out) and officer edit UI for webmaster
  lib/              # Supabase clients (service-role, anon browser, anon server), allowlist check,
                     # rate limiter, data validation, fetch helpers
  types/
    admin.ts        # Shared TypeScript types
```

## Security Notes

- All database operations are server-side through API routes.
- Admin data operations use the service role key only (`SUPABASE_SERVICE_ROLE_KEY`); the anon key is used solely for auth (session cookies), and RLS keeps it locked out of the allowlist table.
- Includes in-memory rate limiting (20 requests per minute per IP) on all admin API routes.

## SQL

See `supabase-indexes.sql` and `supabase-auth-setup.sql` — run both in the Supabase SQL editor.
