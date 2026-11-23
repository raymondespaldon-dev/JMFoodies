# JMFoodies — Agent Rules

Read this before touching any file. These rules are not suggestions; they exist because the current code has a real data-integrity hole.

## What this project is

A catering booking system. Vite 7 + vanilla JS (no framework) + Supabase (Auth, Postgres, RLS).

**Do not change the stack.** No React, no Next.js, no TypeScript migration, no Tailwind rewrite. The deployment target requires Vite + vanilla + Supabase. Any proposal to migrate must be rejected.

## Non-negotiable rules

1. **Never let the browser decide the price.**
   `src/main.js` currently computes the booking total client-side (`:283`) and writes it. Any new code must have the server recompute the price from `packages` + `package_food_items` + `food_items`. A payload price field is a hint for display only, never authority.

2. **Never write a booking in two requests.**
   Booking + `booking_food_items` must land atomically in one server transaction. If the second write fails, the first must not persist.

3. **Never weaken RLS to make the UI work.**
   If a policy blocks a legitimate action, fix the policy deliberately and document why. Do not add `using (true)` to `bookings`.

4. **Never touch secrets.**
   `.env` is gitignored. Only `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` belong in it. Never commit or log a `service_role` key, a DB password, or a `SUPABASE_DB_URL`.

5. **Never point tests at production.**
   `SUPABASE_DB_URL` must be a staging/dev database. The test runner rolls back, but a typo is still a typo.

6. **Never invent business rules.**
   Currency, minimum notice, whether sign-in is required, deposit policy: if the source does not state it, write it as an **open decision** in `SLICE_3_SPEC.md`. Do not guess and do not silently implement.

## Where the project stands

- Slice 1 (foundation/build) — **done**. 16/16 pages build.
- Slice 2 (DB / RLS) — written, **untested**.
- Slice 3 (secure booking core) — **not started. This is the current slice.**
- No test suite exists yet.

`VIBE_CODING_OS.md` is the operating manual. `PROJECT_REVERSE_ENGINEERING.md` is the evidence-based spec of what exists. `SLICE_3_SPEC.md` (once frozen) outranks every other document including this one.

## Working rules

- One worker, one file-set. Never edit a file another worker owns.
- Commit every green step. A dead worker must lose nothing.
- Read `HANDOFF.md` before resuming interrupted work; continue from its step, do not re-plan.
- Before claiming something works, run the command and paste the output. No assertion without evidence.
- If you are blocked twice on the same error, stop and escalate with the error + diff. Do not thrash.

## Commands

```powershell
npm run dev        # local dev server on :5173
npm run build      # production build; must stay green
npm run test:db    # SQL tests against staging (needs SUPABASE_DB_URL)
```
