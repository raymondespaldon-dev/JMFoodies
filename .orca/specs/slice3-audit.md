You are the `slice3-audit` worker on JMFoodies (Vite + vanilla JS + Supabase catering booking system).

## Role
READ-ONLY security reviewer. You audit; you do not implement. Another worker owns the RPC and the frontend.

## Read first
`AGENTS.md`, `SLICE_3_SPEC.md`, `database/01_schema.sql`, `database/02_functions.sql`, `database/03_policies.sql`, `src/main.js`, `src/supabase.js`.

## You own exactly ONE file (create it)
- `docs/security-audit.md`

You may READ everything but must NOT edit any other file. Do not touch `src/**`, `database/**`, `*.html`, `vite.config.js`, `package.json`, `HANDOFF.md`, `SLICE_3_SPEC.md`, `AGENTS.md`, `docs/adr/**`.

## What to audit
1. RLS coverage: list every table the app queries (grep `supabase.from(` and `.rpc(` in `src/main.js`) and check each has RLS enabled + a policy in `03_policies.sql`. Flag any table used by the app but missing from the SQL scripts (e.g. `notifications`, `booking_cancellation_requests`).
2. Price authority: confirm whether booking totals are still computed client-side anywhere, and whether `create_booking` (once present) recomputes server-side.
3. Atomicity: confirm booking + booking_food_items land in one transaction.
4. Input handling: check `esc()` usage vs raw interpolation; check the admin `.or()` search filter for injection.
5. Secrets: confirm only `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` are referenced in frontend; no service_role anywhere.
6. AuthZ: admin checks vs RLS; predictable booking_reference.

## Deliverable / evidence
`docs/security-audit.md` with a findings table: id, severity (critical/high/medium/low), file:line, description, recommended fix. State clearly which findings are already fixed by the frozen Slice 3 spec vs still open. Do not claim a finding is fixed without citing the spec/code line.

## Stop and report if
- You cannot read a required file.
- A finding contradicts the frozen spec (report the conflict, do not redesign).

Never `git push`. Never commit secrets. Commit only `docs/security-audit.md`.
