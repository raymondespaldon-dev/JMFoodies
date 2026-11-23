# JMFoodies Operator Runbook

Step-by-step guide to set up, run, test, build and deploy the **current** JMFoodies catering booking system (Vite 7 + vanilla JavaScript + Supabase). This runbook documents operations only; it does not change code or business rules.

**Sources of truth, in precedence order:** `SLICE_3_SPEC.md` (frozen v1.1.0) → `HANDOFF.md` → `AGENTS.md` → `README.md`. If this runbook ever disagrees with them, they win — fix the runbook.

## Status snapshot (2026-11-23, branch `feat/booking-hardening`)

| Area | State |
|---|---|
| Production build | ✅ green — 63 modules, **16/16 HTML pages** in `dist/` |
| Booking write path (web) | ✅ integrated — the booking form calls `supabase.rpc('create_booking', {payload})` (`src/main.js:341`) |
| Booking write path (DB) | ⏳ pending — `database/05_booking_rpc.sql` is **not in the repo yet** (slice3-db). Until it is applied, booking submission fails. |
| SQL tests | ⏳ `database/tests/` does not exist yet; `SUPABASE_DB_URL` is not set, so nothing can execute |
| Slice 2 RLS | written, **untested** |
| First release target | **staging/demo only** (settled decision). Payments are out of scope for v1 — pay on arrival. |

**Known gaps (documented, not bugs to fix here):** the notifications and admin cancellation-request pages reference objects that no checked-in SQL script defines (`booking_cancellation_requests`, `review_booking_cancellation_request`). See `PROJECT_REVERSE_ENGINEERING.md`. Those flows are not installable from the SQL sequence below until the missing objects land; the cancellation workflow is explicitly a Slice 3 non-goal (`SLICE_3_SPEC.md` §7).

---

## 1. Prerequisites

- **Node.js 20+ and npm** (verified on this machine: Node v24.17.0, npm 11.13.0).
- A **Supabase project** (use a staging/demo project for the first release).
- No `supabase` CLI, `docker` or `psql` is required: schema scripts run in the Supabase **SQL Editor**, and SQL tests run through Node (`scripts/db-test.mjs` + the `pg` package).

Install dependencies:

```powershell
npm install
```

## 2. Environment setup (`.env`)

1. Copy `.env.example` to `.env`.
2. Set the **only two frontend variables**:

   ```dotenv
   VITE_SUPABASE_URL=https://<project-ref>.supabase.co
   VITE_SUPABASE_ANON_KEY=<publishable/anon key>
   ```

3. **For SQL tests only**, add a direct Postgres connection string for a **STAGING** database (it is commented out in `.env.example`):

   ```dotenv
   SUPABASE_DB_URL=postgresql://postgres.<ref>:<password>@<host>:5432/postgres
   ```

Rules (from `AGENTS.md`, non-negotiable):

- **Never** put a `service_role` key, DB password or any secret in a `VITE_*` variable — everything `VITE_*` is bundled into public browser JavaScript.
- `SUPABASE_DB_URL` has no `VITE_` prefix, so it is never exposed to the browser bundle; only `scripts/db-test.mjs` reads it.
- **Never point `SUPABASE_DB_URL` at production.** The runner rolls back, but a wrong URL is still a wrong URL.
- **Never commit `.env`** (it is gitignored) and never log its contents.

## 3. Database setup (order matters)

In the Supabase **SQL Editor** of the project your `.env` points at, run the scripts in this exact order:

1. `database/01_schema.sql` — tables, constraints, RLS enablement
2. `database/02_functions.sql` — helper functions and triggers (`is_admin`, `handle_new_user`, `protect_profile_role`, `set_updated_at`, `log_booking_status`, `check_booking_constraints`)
3. `database/03_policies.sql` — RLS policies
4. `database/04_seed.sql` — seed data
5. **`database/05_booking_rpc.sql` — once present** (slice3-db deliverable, not in the repo yet). This creates `public.create_booking(payload jsonb)`, the atomic, server-authoritative booking RPC defined in `SLICE_3_SPEC.md` §2 and ADR `docs/adr/0001-atomic-booking-rpc.md`.

> ⚠️ The web client **already calls `create_booking`**. Until step 5 is applied to the database, booking submission will fail. This is expected while slice3-db is in flight; the first release is staging/demo only.

After seeding:

- Configure **package/category rules** (`package_categories`: selection limits, required flags). A package is not selectable in the booking flow until its categories and limits are configured.
- `package_food_items` records curated defaults — it is **not an allowlist** (frozen spec §2.3 step 4a). Only `package_categories` gates selection.
- RLS is enabled on every app table. Availability blocks and exact-time collisions are checked by a trigger; booking status history is written automatically by a trigger (the RPC must not double-log).

## 4. Supabase Auth setup

1. In **Authentication → Providers**, enable **Email**.
2. Set the **Site URL** and add redirect URLs for local dev: `http://localhost:5173/**`.
   If you run dev on a different port (see §6), add that origin too — auth redirects must match the port actually in use.
3. If email confirmation is enabled, customers must confirm their email before signing in.

## 5. Admin bootstrap

There is intentionally **no public admin registration**.

1. Register a normal account at `/register.html` and confirm the email.
2. A **trusted project owner** runs this in the Supabase SQL Editor (replace the email):

   ```sql
   update public.profiles p
   set role = 'admin'
   from auth.users u
   where p.id = u.id and u.email = 'admin@example.com';
   ```

3. Sign in and verify access to the admin pages (§7 list).

**Never expose `service_role` credentials** to the browser, `.env`, logs or source control. Admin access is checked against `profiles.role='admin'` and reinforced by RLS — do not rely on the frontend check alone.

## 6. Run the dev server

```powershell
npm run dev
```

- Serves on **http://localhost:5173** (port pinned in `vite.config.js`; the script binds `--host 0.0.0.0`, so it is also reachable from your LAN).
- **Port conflict with other Vite projects:** Vite's default port is 5173. If another project already holds it, Vite silently picks the next free port (5174, …), which breaks Supabase auth redirects configured for 5173. To pin a different port explicitly and fail fast instead of drifting:

  ```powershell
  npm run dev -- --port 5174 --strictPort
  ```

  Then add `http://localhost:5174/**` to the Supabase Auth redirect URLs.

## 7. Production build

```powershell
npm run build
```

- Output goes to `dist/`. **All 16 HTML pages must be present** — 9 public + 7 admin:

  | Public (9) | Admin (7) |
  |---|---|
  | `index.html` | `admin/dashboard.html` |
  | `packages.html` | `admin/bookings.html` |
  | `booking.html` | `admin/packages.html` |
  | `track-booking.html` | `admin/food-management.html` |
  | `login.html` | `admin/reports.html` |
  | `register.html` | `admin/settings.html` |
  | `account.html` | `admin/cancellation-requests.html` |
  | `my-bookings.html` | |
  | `notifications.html` | |

- Verify the page count after every build (PowerShell):

  ```powershell
  (Get-ChildItem dist -Recurse -Filter *.html).Count   # must print 16
  ```

- Verified green on this machine (2026-11-23): `vite v7.3.8`, `✓ 63 modules transformed`, `✓ built in 921ms`, exit code 0, 16 HTML files emitted.
- Smoke-test the built output locally with `npm run preview`.

## 8. SQL tests (`npm run test:db`)

The runner is `scripts/db-test.mjs`. It executes every `*.sql` file in `database/tests/` against the database in `SUPABASE_DB_URL`, **each inside a transaction that is rolled back** — tests never persist data.

```powershell
npm run test:db                          # run every test in database/tests/
npm run test:db -- --check               # connectivity only (no tests run)
npm run test:db -- --file database/tests/01_happy_path_standard.sql   # one file
```

How it works:

- A test **passes** if its whole file executes without raising; it **fails** if the file raises an exception. Assertions are written as `raise exception` inside the SQL.
- Directives in the first 20 lines choose the session identity so RLS is actually exercised: `-- @role authenticated` and `-- @sub <uuid>`.
- Exit codes: `0` = all passed / connectivity OK; `1` = failing tests, or no tests directory/files found; `2` = `SUPABASE_DB_URL` missing, `pg` not installed, or connection failed.

**Current state:** `database/tests/` does not exist yet and `SUPABASE_DB_URL` is unset, so `npm run test:db -- --check` exits `2` with:

```text
[test:db] SUPABASE_DB_URL is not set.
  Add a direct Postgres connection string for a STAGING database to .env:
    SUPABASE_DB_URL=postgresql://postgres.<ref>:<password>@<host>:5432/postgres
  Never use the production database. ...
```

**What "tests written, not executed" means:** per `HANDOFF.md`, the slice3-db worker may deliver the 18 test files (inventory in `SLICE_3_SPEC.md` §5) without a staging `SUPABASE_DB_URL` to run them against. Written-but-unexecuted tests are **unverified, not green**. Never report them as passing. The first real proof is a full `npm run test:db` run against staging, with its output pasted as evidence.

## 9. Deploy (static host + Supabase)

The app is a static frontend talking directly to Supabase — there is no application server to deploy.

1. **Host:** Netlify, Vercel, Cloudflare Pages (or any static host).
   - Build command: `npm run build`
   - Publish/output directory: `dist/`
   - Set the same two environment variables in the host's build settings: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`. Never add `service_role` or `SUPABASE_DB_URL` to the frontend host.
2. **Database:** make sure the Supabase project the host points at has the SQL scripts applied in order (§3), including `05_booking_rpc.sql` once present.
3. **Supabase Auth:** set the **Site URL** to the deployed origin and add `https://<your-domain>/**` to the **redirect URLs**.
4. **Smoke checklist after deploy:** register → confirm email → sign in → browse packages → submit a booking (requires `create_booking` applied) → track by reference → sign in as a promoted admin and open the admin pages.

Remember: first release is **staging/demo only**; do not take live payments or rely on it for real bookings until the `README.md` "Before production" checklist is complete.

## 10. Safety rules (always in force)

From `AGENTS.md` — these are not suggestions:

1. **Never let the browser decide the price.** The client estimate is a display preview only; `create_booking` recomputes prices from `packages` + `food_items` and ignores client-supplied price fields.
2. **Never write a booking in two requests.** Booking + items land atomically in one server transaction.
3. **Never weaken RLS to make the UI work.** Fix policies deliberately and document why; no `using (true)` on `bookings`.
4. **Never touch secrets.** Only the two `VITE_*` values belong in `.env`; never commit or log `service_role`, DB passwords or `SUPABASE_DB_URL`.
5. **Never point tests at production.**
6. **Never invent business rules.** Unsettled rules go into `SLICE_3_SPEC.md` as open decisions.

Settled business rules (reference only — do not re-litigate or change): PHP (₱), displayed Asia/Manila, timestamps stored UTC; minimum 3 calendar days notice, enforced server-side; sign-in required to book; admin transitions `pending → confirmed → completed`, `pending|confirmed → cancelled` with reason and audit log (no un-cancel, no `completed → confirmed`); staging/demo first release; payments out of scope for v1, pay on arrival.

## 11. Quick orientation (verify you are set up)

```powershell
git status                   # clean, on the expected branch
npm run build                # green, 16 HTML files in dist/
npm run test:db -- --check   # tells you immediately whether a staging DB is reachable
```
