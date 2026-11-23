# HANDOFF — JMFoodies

> Read this first when resuming work. Continue from the step below. Do not re-plan.

**Updated:** 2026-11-23
**Branch:** `feat/booking-hardening`
**Current slice:** Slice 3 — secure booking core
**Status:** contract frozen (`a98cd25`); `slice3-web` running; `slice3-db` waiting on the Freebuff window

---

## What is done

| Step | State | Evidence |
|---|---|---|
| Step 1 — baseline commit + branch | ✅ done | `c35bd07` on top of `6b370df` |
| Step 3 — build route completeness | ✅ done | `59b201d`, 16/16 pages, 63 modules |
| Docs correction (Freebuff role, Orca agents) | ✅ done | `85b6e12` |
| Slice 3 contract | ✅ **frozen** | `SLICE_3_SPEC.md` v1.1.0 at `a98cd25` — 7 gate corrections, see spec §9 |
| ADR 0001 | ✅ accepted | `docs/adr/0001-atomic-booking-rpc.md` |
| `slice3-web` worker | ✅ **integrated** | cherry-picked as `0e63608`; verified build green (63 modules, 16 pages); worktree released and removed |
| `slice3-db` worker | ⏸ **not started** | needs the Freebuff high window confirmed first |
| Slice 2 RLS verification | ❌ not tested | no `database/tests/` yet |
| Slice 3 implementation | ⏳ in progress | `create_booking` RPC not written yet |

## What is next

1. ✅ **Run A done** — contract frozen at `a98cd25`.
2. ✅ **`slice3-web` done** — cherry-picked as `0e63608`, verified green.
3. ⏸ **Start `slice3-db`** once the Freebuff high window is confirmed:

   ```powershell
   orca orchestration worker-start --environment local --spec-file .orca/specs/slice3-db.md --worktree new-child --name slice3-db --agent freebuff
   ```
   Without `SUPABASE_DB_URL` it writes the 18 test files but cannot run them — treat that result as **unverified**, not green.
4. **Run C** — reviewer (`codex`), `.orca/specs/review.md`, read-only. The RPC is where Codex's scarce quota earns its cost.
5. Then merge the db branch, Step 6 (RLS access matrix), Step 8 (verify), Step 9 (docs).

## Gate findings from Run A (already fixed — do not reintroduce)

The Brain's v1.0.0 spec was good but had seven defects. All are corrected in v1.1.0; spec §9 lists them. The two that mattered most:

- **Test 03 was proving nothing.** It asserted SQLSTATE `42501` for "unauthenticated", but a role lacking `EXECUTE` gets the same `42501`, so the `auth.uid()` guard was never exercised. Now split into 03a (grant boundary), 03b (guard), 03c (identity binding).
- **Test 13 could not test atomicity.** It used an invalid food UUID as the failure, but UUID validation runs *before* any insert — the parent was never written, so nothing was proven. Now injects the failure *after* the parent insert with a temporary trigger.

Also: `booking_reference` uniqueness must be handled by catching `unique_violation` and retrying, **not** a pre-insert `select` (TOCTOU). And the existing `booking_status_log` trigger already writes `booking_status_history` on insert — the RPC must not double-log.

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
