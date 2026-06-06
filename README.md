# shpe-admin

Admin dashboard for SHPE Cornell built with Next.js App Router.

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — it redirects automatically to `/admin/events`.

Create a `.env.local` file in the project root with:

```bash
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

## File Structure

```
src/
  app/
    admin/          # The four dashboard pages: events, members, officers, settings
    api/admin/      # Server-side API routes for each section
    globals.css     # Shared CSS classes
    layout.tsx      # Root layout (font, HTML shell)
  components/
    admin/          # Sidebar nav and officer edit UI for webmaster
  lib/              # Supabase client connection, rate limiter, data validation, fetch helpers
  types/
    admin.ts        # Shared TypeScript types
```

## Security Notes

- All database operations are server-side through API routes.
- Uses service role key only (`SUPABASE_SERVICE_ROLE_KEY`), never anon key.
- Includes in-memory rate limiting (20 requests per minute per IP) on all admin API routes.

## SQL Indexes

See `supabase-indexes.sql` and run those statements in Supabase SQL editor.
