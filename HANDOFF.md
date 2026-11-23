# HANDOFF — JMFoodies

> Read this first when resuming work. Continue from the step below. Do not re-plan.

**Updated:** 2026-11-23
**Branch:** `feat/booking-hardening`
**Current slice:** Slice 3 — secure booking core → **MERGED, review SHIP**
**Status:** merged at `f44b59b`; round-2 review **SHIP** (no P0/P1); SQL tests **written, NOT executed** (no `SUPABASE_DB_URL`)

---

## What is done

| Step | State | Evidence |
|---|---|---|
| Step 1 — baseline commit + branch | ✅ done | `c35bd07` on top of `6b370df` |
| Step 3 — build route completeness | ✅ done | `59b201d`, 16/16 pages |
| Slice 3 contract | ✅ frozen | `SLICE_3_SPEC.md` v1.1.0 at `a98cd25` (7 gate corrections, §9) |
| ADR 0001 | ✅ accepted | `docs/adr/0001-atomic-booking-rpc.md` |
| `slice3-web` (frontend → RPC) | ✅ merged | `0e63608` |
| `slice3-db` (RPC + 18 tests) | ✅ merged | `aaa7907` + `b89d077` (tests 17/18, strengthened 13) |
| Run C round 1 | ✅ done | DO-NOT-SHIP: 3 P1 + 1 P2 (validation bypass, missing tests, atomicity assertion) |
| Run C fixes | ✅ merged | frontend `61b8b75`; db `b89d077` |
| Run C round 2 | ✅ **SHIP** | no P0/P1; price authority / atomicity / definer+caller binding / error codes / secret hygiene confirmed |
| Security audit | ✅ merged | `docs/security-audit.md` (`d5c2976`) |
| Operator runbook | ✅ merged | `docs/runbook.md` + README (`792b9c9`); refreshed with honest note + RLS matrix |
| Merge of all worker branches | ✅ done | `a6be92b` (db, web-fix, docs, audit — disjoint files, clean) |
| Build verification | ✅ green | `npm run build` 16/16 HTML, 63 modules, ~0.97s |
| SQL test execution | ⏸ **pending gate** | `npm run test:db -- --check` exit 2: `SUPABASE_DB_URL` not set |

## What is next

1. **Execute the SQL tests** once a **staging** `SUPABASE_DB_URL` is added to `.env`: `npm run test:db`. Until then treat Slice 3 as *reviewed + merged + build-green*, NOT *DB-validated*.
2. **Next slice (open security items from the audit):**
   - add `notifications` + `booking_cancellation_requests` tables + RLS to the repo SQL (they exist only in the live project);
   - fix the admin `.or()` search-filter injection (`src/main.js` adminBookings);
   - then re-verify and update the runbook / RLS matrix.
3. Production-readiness items remain out of scope for v1 (payments, scheduling, etc. — see README "Before production").

## Decisions already made (source of truth)

Settled in `VIBE_CODING_OS.md` §9 — **not open**, do not re-litigate mid-slice:

- **Currency/timezone** — PHP (₱), displayed Asia/Manila, timestamps stored UTC.
- **Minimum notice** — 3 calendar days, enforced server-side.
- **Sign-in** — required to book.
- **Admin transitions** — `pending → confirmed → completed`; `pending|confirmed → cancelled` with reason + audit log. No un-cancel, no `completed → confirmed`.
- **First release** — staging/demo only.
- **Payments** — out of scope for v1; pay on arrival.

Where spec, code and seed disagree, these win, and all three are updated in the same change.

## The one infra gap

`SUPABASE_DB_URL` is not set, so `npm run test:db` cannot execute. Tests are written (18 files) but unverified until a **staging** direct connection string is added to `.env`. Never point it at production.

## Environment facts (verified on this machine)

- `npm run build` — green, 16/16 HTML, 63 modules
- Node v24.17.0, npm 11.13.0
- **No** `supabase` CLI, **no** `docker`, **no** `psql`
- Freebuff CLI at `D:\Freebuff\npm-global\freebuff.ps1`
- Orca running; agents: `claude`, `codex`, `opencode`, `opencode2`, `antigravity`, `freebuff`
- `.env` holds Supabase URL + anon key only. **No `SUPABASE_DB_URL`.**
- Worker worktrees MUST be created with `--base-branch feat/booking-hardening` (default base is the Initial commit and lacks the spec/rules).

## How to verify you are oriented

```powershell
git status                 # clean, on feat/booking-hardening
npm run build              # green, 16 html files in dist/
npm run test:db -- --check # exit 2 until staging SUPABASE_DB_URL is set
```

## Do not

- Do not claim SQL tests pass without executing them against staging.
- Do not spend the Freebuff high window on planning.
- Do not let any worker edit files owned by another worker.
- Do not point `SUPABASE_DB_URL` at production.
- Do not create worker worktrees without `--base-branch feat/booking-hardening`.
