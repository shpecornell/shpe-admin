# SHPE Cornell Admin Dashboard — Maintainer Guide

This guide is for the incoming SHPE Cornell Webmaster to safely maintain and ship updates to the admin dashboard.

## Architecture Overview

### What is actually in this repo
This repository is a **single Next.js App Router project** (React + Tailwind) with:
- Frontend pages in `src/app/admin/*`
- Server-side API route handlers in `src/app/api/admin/*`
- Supabase access via `@supabase/supabase-js` and `SUPABASE_SERVICE_ROLE_KEY`

There is **no FastAPI service in this repository** right now.

### Intended stack note (FastAPI)
If SHPE runs a separate FastAPI backend in another repo, this Next app is currently not calling it. Calls are local to Next route handlers (for example `/api/admin/events`, `/api/admin/officers`, etc.).

### Supabase Auth + RLS behavior
- Current server client uses the **service role key** in `src/lib/supabase-server.ts`.
- Service role **bypasses RLS**. That means authorization is enforced by app logic, not by Supabase policies in this repo.
- Because of this, guard access to deployment environment variables and admin URLs very carefully.

---

## Environment Setup

Create `.env.local` (or deployment env vars) with:

```bash
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

Optional (only if/when you wire external backend):

```bash
BACKEND_URL=
```

Note: `BACKEND_URL` is **not used by current code**.

---

## Core Workflows

## 1) Update the Executive Board list (Officers)

Main files:
- UI: `src/app/admin/officers/page.tsx`
- API: `src/app/api/admin/officers/route.ts`
- UI mode toggle: `src/components/admin/officer-ui-mode.ts`

### Edit mode toggle (important)
In `src/components/admin/officer-ui-mode.ts`:
- `OFFICER_UI_MODE = "yes"` -> full officer management UI (add/remove)
- `OFFICER_UI_MODE = "no"` -> read-only grouped officer view

### How to add/remove officers
In edit mode (`"yes"`):
- Use **Add New Officer** form on `/admin/officers`
- Remove with **Remove** button in officers table

### Grouping logic (customized)
Officer display grouping is custom in `src/app/admin/officers/page.tsx`:
- `President + Treasurer` (and Secretary currently grouped here)
- `Internal VP Group` (including Chapter Development, Events, Academic Excellence)
- `External VP Group` (including Alumni Relations, Corporate, Publicity, Web)
- Remaining roles split into separate role-name groups

If roles change next year, update grouping predicates in that file.

---

## 2) Manage event registrations/check-ins via dashboard

Main files:
- UI: `src/app/admin/events/page.tsx`
- API: `src/app/api/admin/events/route.ts`

What the dashboard controls:
- Create events (name/date/type/points/school_year)
- Toggle event check-in status (`is_open`)
- Delete events
- Generate QR code pointing to: `https://shpe.cornell.edu/checkin/{eventId}`

Important: attendance/check-in ingestion itself is not implemented in this repo's admin UI route handlers; this dashboard manages event state and QR links for check-in flow.

---

## 3) Modify Supabase schema safely (without breaking types)

When changing schema:
1. Apply migration in Supabase SQL editor.
2. Update TypeScript types in `src/types/admin.ts`.
3. Update `select(...)` column lists in API routes:
   - `src/app/api/admin/members/route.ts`
   - `src/app/api/admin/officers/route.ts`
   - `src/app/api/admin/events/route.ts`
   - `src/app/api/admin/settings/route.ts`
4. Update validators in `src/lib/validation.ts` if request payloads changed.
5. Verify client pages that consume changed payloads.

Performance indexes live in `supabase-indexes.sql`; keep these aligned with query patterns.

---

## Local Development

## Run frontend + API (current repo)

```bash
npm install
npm run dev
```

- App runs at `http://localhost:3000`
- API route handlers are served by Next at `/api/admin/*`

## If you also maintain a separate FastAPI backend
Run it in its own repo (example):

```bash
uvicorn app.main:app --reload --port 8000
```

Then point frontend to that backend only after adding explicit integration code (not present today).

---

## Deployment Pipeline

### Current deployment model
This repo is deployable as a standard Next.js app platform deployment (for example Vercel).

### Recommended process
1. Create branch
2. Implement + test locally
3. Open PR
4. Merge to main
5. Verify production env vars:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`

### Common pitfalls
- **Env mismatch**: local `.env.local` differs from production values
- **CORS confusion**: if adding external FastAPI later, configure CORS in FastAPI and base URL usage in frontend
- **RLS assumptions**: service role bypasses RLS; do not assume Supabase policies are protecting admin operations
- **Schema drift**: Supabase table changes without corresponding TS/API updates

---

## API & Page Map (Quick Reference)

Admin pages:
- `/admin/events` -> `src/app/admin/events/page.tsx`
- `/admin/members` -> `src/app/admin/members/page.tsx`
- `/admin/officers` -> `src/app/admin/officers/page.tsx`
- `/admin/settings` -> `src/app/admin/settings/page.tsx`

Admin APIs:
- `GET/POST/PATCH /api/admin/events`
- `GET/POST/PATCH /api/admin/members`
- `GET/POST/DELETE /api/admin/officers`
- `GET/PATCH /api/admin/settings`

---

## Security Notes

- In-memory rate limiting exists (`src/lib/rate-limit.ts`): 20 requests/min/IP/route key.
- Admin API uses service-role Supabase client server-side.
- Treat deployment env vars as sensitive credentials.

---

## Handover Checklist (Human-Verified)

- Verify where Supabase credentials are stored for officer handoff:
  - Example: shared SHPE password manager / shared drive credential vault
- Confirm who has owner/admin access to deployment platform project
- Confirm domain/DNS ownership and where `shpe.cornell.edu` is managed
- Confirm current branch protection / PR rules on GitHub

---

## Advanced Features

Current advanced/custom logic to be aware of:
- Officer grouping and label normalization logic in `src/app/admin/officers/page.tsx`
- Officers edit/read-only mode toggle in `src/components/admin/officer-ui-mode.ts`
- Members CSV export and multi-field contact copy in `src/app/admin/members/page.tsx`
- Members API fallback handling for phone column (`phone_number` vs `phone`)

If you add AI/RAG or specialization workflows later, document them here as separate sub-sections.

---

## Questions

Outgoing Webmaster contact:
- Email: `TODO: add your Cornell email`
- LinkedIn: `TODO: add your LinkedIn`

Please fill this before handoff.
