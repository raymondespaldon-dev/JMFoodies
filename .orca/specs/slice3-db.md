You are the `slice3-db` worker on JMFoodies (Vite + vanilla JS + Supabase catering booking system).

## Authority

`SLICE_3_SPEC.md` is **frozen**. Implement it exactly. Do not redesign it, do not add features, do not relax a validation because a test is inconvenient. If the spec is genuinely ambiguous or wrong, stop and report the conflict instead of guessing.

Read first: `AGENTS.md`, `SLICE_3_SPEC.md`, `database/01_schema.sql`, `database/02_functions.sql`, `database/03_policies.sql`.

## You own exactly these files

- `database/05_booking_rpc.sql` (create it)
- `database/tests/*.sql` (create the files)

You do **not** touch: `src/**`, `vite.config.js`, `*.html`, `database/01-04_*.sql`, `package.json`. Another worker owns the frontend.

## What to build

1. `public.create_booking(payload jsonb)` per the spec:
   - `security definer`, `set search_path = public`
   - raise if `auth.uid()` is null
   - recompute base price from `packages`, extras from `food_items`; ignore any price in the payload
   - validate package active, guest count >= minimum, event date valid, menu counts within `package_categories.selection_limit`
   - insert `bookings` then `booking_food_items` in the same transaction — one `begin`/`commit`, rollback everything on any failure
   - generate `booking_reference` server-side, uniquely
   - return the shape defined in the spec
   - raise the spec's stable error codes (SQLSTATE + message) so the UI can map them

2. One SQL test file per behaviour in the spec's test list, under `database/tests/`. Each file must be self-contained: it sets up its own fixtures inside the transaction and asserts by raising an exception on failure. The runner wraps every file in a transaction it rolls back.

## Verification (do not skip, do not fake)

```powershell
npm run test:db
```

- If `SUPABASE_DB_URL` is not set, the runner will refuse to run. Do not invent results and do not claim tests pass. Report exactly: "tests written, not executed — no SUPABASE_DB_URL" and list the files.
- Every test must actually fail for the right reason before it passes. For the tampered-price test, prove that a payload claiming a lower total still yields the server-computed total.

## Commit protocol

Commit after each green step, small messages:

```
feat(db): add create_booking rpc per slice 3 spec
test(db): cover price tampering and menu count validation
```

Never commit a `.env`, a DB URL, or a service-role key. Never `git push`.

## Stop and report if

- the spec conflicts with `01_schema.sql` (e.g. a column or constraint the spec assumes does not exist)
- a test cannot be expressed under the rollback runner
- you have failed the same test twice for the same reason
