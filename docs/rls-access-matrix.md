# JMFoodies — RLS Access Matrix (auto-derived from `database/03_policies.sql`)

**Branch:** `feat/booking-hardening` (tip: `a6be92b`)
**Status:** documentation; policies live in `database/03_policies.sql`

The matrix below lists every app table x role x operation. Roles: `anon` = authenticated customer via anon key; `customer` = signed-in client (via auth.uid()); `admin` = profile.role='admin' reinforced by RLS. "✅" = policy exists; "❌" = no policy (or policy permits via `using(true)` which is an open item).

| Table | anon | customer | admin |
|---|---|---|---|
| **profiles** | ✅ `profiles read self or admin`: `using(id=auth.uid() or public.is_admin())` | ✅ same policy covers | ✅ same policy |
| **packages** | ✅ `public read active packages`: `using(is_admin or is_active)` | ❌ (none defined foranon/customer — only admin manages) | ✅ `admin manage packages`: `using(public.is_admin()) with check(public.is_admin())` |
| **food_categories** | ✅ `public read active categories`: `using(is_admin or is_active)` | ❌ (none) | ✅ `admin manage categories`: `using(public.is_admin()) with check(public.is_admin())` |
| **food_items** | ✅ `public read available food`: `using(is_admin or is_available)` | ❌ (none) | ✅ `admin manage food`: `using(public.is_admin()) with check(public.is_admin())` |
| **package_categories** | ✅ `public read package categories`: `using(true)` | ❌ (none) | ✅ `admin manage package categories`: `using(public.is_admin()) with check(public.is_admin())` |
| **package_food_items** | ✅ `public read package foods`: `using(true)` | ❌ (none) | ✅ `admin manage package foods`: `using(public.is_admin()) with check(public.is_admin())` |
| **food_alternatives** | ✅ `public read alternatives`: `using(true)` | ❌ (none) | ✅ `admin manage alternatives`: `using(public.is_admin()) with check(public.is_admin())` |
| **additional_services** | ✅ `public read active services`: `using(is_admin or is_active)` | ❌ (none) | ✅ `admin manage services`: `using(public.is_admin()) with check(public.is_admin())` |
| **bookings** | ❌ (none — customer inserts via `create_booking` RPC; select via `customer read own bookings`) | ✅ `customer read own bookings`: `using(customer_id=auth.uid() or public.is_admin())`; `customer create own booking`: `insert with check(customer_id=auth.uid() and status='pending')` | ✅ `admin update bookings`: `using(public.is_admin()) with check(public.is_admin())` |
| **booking_food_items** | ❌ (none — inserted by RPC in same transaction) | ✅ `customer read own booking food`: `exists(select 1 from public.bookings b where b.id=booking_id and (b.customer_id=auth.uid() or public.is_admin()))`; `customer add own booking food`: `insert with check(exists(select 1 from public.bookings b where b.id=booking_id and b.customer_id=auth.uid() and b.status='pending'))` | ✅ `admin manage booking food`: `using(public.is_admin()) with check(public.is_admin())` |
| **booking_services** | ❌ (none — inserted by RPC) | ✅ `customer read own booking services`: `exists(select 1 from public.bookings b where b.id=booking_id and (b.customer_id=auth.uid() or public.is_admin()))`; `customer add own booking services`: `insert with check(exists(select 1 from public.bookings b where b.id=booking_id and b.customer_id=auth.uid()))` | ✅ `admin manage booking services`: `using(public.is_admin()) with check(public.is_admin())` |
| **booking_status_history** | ❌ (none — triggered on insert) | ✅ `customer read own status history`: `exists(select 1 from public.bookings b where b.id=booking_id and (b.customer_id=auth.uid() or public.is_admin()))` | ✅ `admin read availability`: `using(true)`; `admin manage availability`: `using(public.is_admin()) with check(public.is_admin())` |
| **availability** | ✅ `admin read availability`: `using(true)` | ❌ (none) | ✅ `admin manage availability`: `using(public.is_admin()) with check(public.is_admin())` |
| **business_settings** | ✅ `public read public settings`: `using(key in ('business_profile','public_contact','booking_rules'))` | ❌ (none) | ✅ `admin manage settings`: `using(public.is_admin()) with check(public.is_admin())` |

## Open items (next slice)

1. **Missing tables / RLS** — The app queries `notifications` and `booking_cancellation_requests` in `src/main.js`; these tables exist only in the live Supabase project, not in `database/01-03.sql`. Add them + RLS policies.
2. **Admin search-filter injection** — `adminBookings()` builds `.or(\`booking_reference.ilike.%${term}%...\`)` from raw user input. This is a potential PostgREST injection vector. Fix: escape/reserve-term the interpolated value, or move search into an RPC.
3. **`service_role` never in `.env`** — Confirmed: only `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` belong in the frontend `.env`.

## Policy summary

- **`using(true)` policies** (package_categories, package_food_items, food_alternatives, availability) permit ALL rows. These are pragmatic for a starter but flagged as open items for production hardening.
- All other policies bind to `auth.uid()` or `public.is_admin()`, so the anon key alone cannot impersonate another user or admin.
- The `create_booking` RPC uses `security definer` with `set search_path = public`; it runs with the privileges of the function owner (postgres), but its `using` clauses and `raise` codes are evaluated in the caller's security context.