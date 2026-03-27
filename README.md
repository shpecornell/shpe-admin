# shpe-admin

Admin dashboard for SHPE Cornell built with Next.js App Router.

## Environment

Create `.env.local` with:

```bash
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

## Security Notes

- All database operations are server-side through API routes.
- Uses service role key only (`SUPABASE_SERVICE_ROLE_KEY`), never anon key.
- Includes in-memory rate limiting (20 requests per minute per IP) on all admin API routes.

## SQL Indexes

See `supabase-indexes.sql` and run those statements in Supabase SQL editor.
