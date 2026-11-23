# JMFoodies — Slice 3 State (verified 2026-11-23)

**Branch:** `feat/booking-hardening`
**Tip:** `f44b59b`
**Review verdict:** SHIP (no P0/P1) — *code-reviewed, tests unverified (no staging DB)*
**SQL test execution:** pending `SUPABASE_DB_URL` in `.env`
**Open next-slice items:** missing tables/RLS + admin search injection (S3-04, S3-06)

## Merged artifacts

| Path | Description |
|---|---|
| `database/05_booking_rpc.sql` | `create_booking` RPC; server price recompute; atomic transaction; `security definer`; grants |
| `database/tests/*.sql` (18 files) | Price authority, atomicity, category limits, unavailable items, time-slot collisions, auth boundaries, duplicates, foreign categories |
| `src/main.js` | `checkValidity()`/`reportValidity()` guard; per-category pre-validation; single RPC call; error-code mapping |
| `docs/runbook.md` | Operator runbook: dev, build, DB setup, test gate, deployment, admin bootstrap |
| `docs/rls-access-matrix.md` | 27 table x role x operation matrix from `database/03_policies.sql`; open items |
| `docs/security-audit.md` | 8 findings: S3-01/S3-02/S3-05/S3-08 resolved; S3-03/S3-04/S3-06/S3-07 open |
| `HANDOFF.md` | Full merged state, all gates, pending items, environment facts |
| `SLICE_3_SPEC.md` | Frozen contract v1.1.0 (7 gate corrections, see §9) |
| `docs/adr/0001-atomic-booking-rpc.md` | ADR: context, decision, alternatives, consequences, revisit triggers |
| Build | `npm run build` 16/16 HTML, 63 modules, ~1s green |

## Pending (blocks production validation)
- Set `SUPABASE_DB_URL` (staging only) in `.env`
- Execute `npm run test:db` — 18 test files, all currently unverified
- Run C round 2 was code review only; no DB execution

## Open security findings (next slice)
- S3-04: admin `.or()` search-filter injection (`src/main.js` adminBookings)
- S3-06: server-side authorization verification (frontend `requireAdmin()` is UI-only)
- S3-07: PostgREST filter grammar escaping (overlaps S3-04)
- S3-03: missing `notifications` + `booking_cancellation_requests` tables + RLS

## Quick start
```powershell
git status                 # clean, on feat/booking-hardening
npm run build              # green, 16 html files in dist/
npm run test:db -- --check # exit 2 until staging SUPABASE_DB_URL is set
```
