# HANDOFF — JMFoodies

> Read this first when resuming work. Continue from the step below. Do not re-plan.

**Updated:** 2026-11-23
**Branch:** `feat/booking-hardening`
**Current slice:** Slice 3 — secure booking core
**Status:** blocked on the frozen contract (`SLICE_3_SPEC.md` does not exist yet)

---

## What is done

| Step | State | Evidence |
|---|---|---|
| Step 1 — baseline commit + branch | ✅ done | `c35bd07` on top of `6b370df` |
| Step 3 — build route completeness | ✅ done | `59b201d`, 16/16 pages, 63 modules |
| Docs correction (Freebuff role, Orca agents) | ✅ done | `85b6e12` |
| Slice 3 contract | ❌ **not written** | `SLICE_3_SPEC.md` missing |
| Slice 2 RLS verification | ❌ not tested | no `database/tests/` yet |
| Slice 3 implementation | ❌ not started | no `create_booking` RPC |

## What is next

1. **Run Orca Run A** — one worker, agent `antigravity`, spec `.orca/specs/slice3-contract.md`.
   Produces `SLICE_3_SPEC.md` + `docs/adr/0001-atomic-booking-rpc.md`.
2. **Check the gate**, then freeze it. Workers may not change a frozen spec.
3. **Run Orca Run B** — `.\scripts\run-run-b.ps1`.
   - `slice3-db` → `freebuff` (DeepSeek V4.1 Flash high, 2h window) — RPC + SQL tests
   - `slice3-web` → `opencode` — rewire `submitBooking` to one RPC call
4. **Run Orca Run C** — reviewer (`codex`), spec `.orca/specs/review.md`, read-only.
5. Then Step 6 (RLS access matrix), Step 7 (review), Step 8 (verify), Step 9 (docs).

## Decisions already made (source of truth)

These were settled and recorded in `VIBE_CODING_OS.md` §9. They are **not** open — do not re-litigate them mid-slice:

- **Currency/timezone** — PHP (₱), displayed Asia/Manila, timestamps stored UTC.
- **Minimum notice** — 3 calendar days, enforced server-side.
- **Sign-in** — required to book.
- **Admin transitions** — `pending → confirmed → completed`; `pending|confirmed → cancelled` with a reason and an audit log. No un-cancel, no `completed → confirmed`.
- **First release** — staging/demo only.
- **Payments** — out of scope for v1; pay on arrival.

Where spec, code and seed disagree, these win, and all three are updated in the same change.

## The one infra gap

`SUPABASE_DB_URL` is not set, so `npm run test:db` cannot execute. Tests can be written but not verified until a **staging** direct connection string is added to `.env`.

## Environment facts (verified on this machine)

- `npm run build` — green, 63 modules, ~0.9s
- Node v24.17.0, npm 11.13.0
- **No** `supabase` CLI, **no** `docker`, **no** `psql`
- Freebuff CLI present at `D:\Freebuff\npm-global\freebuff.ps1`
- Orca 1.4.271 running; agents: `claude`, `codex`, `opencode`, `opencode2`, `antigravity`, `freebuff`
- `.env` holds a Supabase URL + anon key. **No `SUPABASE_DB_URL`**, so `npm run test:db` cannot execute anything yet.

## How to verify you are oriented

```powershell
git status                 # clean, on feat/booking-hardening
npm run build              # green, 16 html files in dist/
npm run test:db -- --check # tells you immediately whether a DB is reachable
```

## Do not

- Do not start Run B before `SLICE_3_SPEC.md` exists and passes the gate.
- Do not spend the Freebuff high window on planning.
- Do not let any worker edit files owned by another worker.
- Do not point `SUPABASE_DB_URL` at production.
