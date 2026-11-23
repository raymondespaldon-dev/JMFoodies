# JMFoodies — Operator Runbook (REFRESHED — Slice 3 merged)

**Branch:** `feat/booking-hardening` (tip: `a6be92b`)
**Status:** Merged and review **SHIP** (no P0/P1). SQL test execution pending `SUPABASE_DB_URL`.

## 1. Prerequisites
- Node.js 20+, npm
- `npm install`
- `.env` with only: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- **Staging `SUPABASE_DB_URL`** (added to `.env`) for SQL test execution — never production, gitignored

## 2. Local development
```powershell
# dev server — avoid port 5173 conflict with other Vite projects
npm run dev -- --port 5174 --strictPort
```
Open http://localhost:5174/ (or http://127.0.0.1:5174/)

If 5173 is occupied (your Laravel project), use `--port 5174`. The `--strictPort` flag errors immediately rather than falling back.

## 3. Production build
```powershell
npm run build
```
Verified: `vite 7.3.8`, **63 modules**, **16/16 HTML pages** in `dist/`, exit 0.

## 4. Database setup (fresh project)
In Supabase SQL Editor, run **in this order**:
1. `database/01_schema.sql`
2. `database/02_functions.sql`
3. `database/03_policies.sql`
4. `database/04_seed.sql`
5. `database/05_booking_rpc.sql` — **new in v1**; implements `public.create_booking(payload jsonb)` per the frozen spec

## 5. Running SQL tests
```powershell
npm run test:db
```
- Requires a **staging** `SUPABASE_DB_URL` in `.env` (direct PG connection, port 5432)
- The runner wraps each file in a transaction it rolls back
- **No `SUPABASE_DB_URL`**: `npm run test:db -- --check` exits 2 and reports "SUPABASE_DB_URL is not set"
- Tests verify: price authority, atomicity, category limits, unavailable items, time-slot collisions, and all spec error codes

## 6. Admin bootstrap (first admin)
1. Register a normal account at `/register.html`
2. Confirm the email
3. In Supabase SQL Editor, run:
   ```sql
   update public.profiles p
   set role = 'admin'
   from auth.users u
   where p.id = u.id and u.email = 'admin@example.com';
   ```
   Only a trusted project owner should execute this.

## 7. Deployment
Deploy the `dist/` folder to a static host (Netlify, Vercel, Cloudflare Pages).
- Set the same two Vite env vars in the host's build settings
- Add the deployed domain to Supabase Auth redirect URLs
- Staging `SUPABASE_DB_URL` must **not** be committed or deployed

## 8. Admin page checklist
All 7 admin pages must be present and functional:
- `/admin/dashboard.html`
- `/admin/bookings.html`
- `/admin/packages.html`
- `/admin/food-management.html`
- `/admin/reports.html`
- `/admin/settings.html`
- `/admin/cancellation-requests.html`

## 9. Known open items (next slice)
- Add `notifications` + `booking_cancellation_requests` tables + RLS policies to the repo SQL
- Fix admin `.or()` search-filter injection (`adminBookings` term interpolation)
- Then re-verify and update this runbook

## 10. What is NOT in scope for v1
- Online payments, webhooks, background jobs
- Complex scheduling, capacity-aware venue scheduling
- Full SEO / SSR (the app is client-side rendered)

## Honest implementation note
This is a functional foundation, not a fully production-certified catering platform. The `create_booking` RPC now recomputes all prices server-side and writes atomically, but the SQL tests have not been executed (no staging `SUPABASE_DB_URL` yet). Before taking live bookings, add a staging connection string, run `npm run test:db`, and resolve the open security findings in `docs/security-audit.md` (S3-04 admin search injection, S3-06 server-side authorization verification).

## Verify your setup
```powershell
git status                 # clean, on feat/booking-hardening
npm run build              # green, 16 html files in dist/
npm run test:db -- --check # exit 2 until staging SUPABASE_DB_URL is set
```