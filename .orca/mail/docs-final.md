Slice 3 is now MERGED into feat/booking-hardening (tip a6be92b): create_booking RPC + 18 SQL tests (b89d077), frontend pre-validation fix (61b8b75), your runbook (792b9c9), and the security audit (d5c2976). Round-2 read-only review verdict: SHIP, no P0/P1. SQL tests are written but NOT executed (no SUPABASE_DB_URL) — that remains the pending verification gate.

Your worktree has been fast-forwarded to the merged tip so you can see database/05_booking_rpc.sql and database/tests/*.

Two deliverables, you own exactly these files:
1. docs/runbook.md — refresh the status snapshot: RPC + 18 tests now present and merged; review SHIP; test execution pending staging SUPABASE_DB_URL; list the test files; keep the staging-only and never-commit-secrets warnings.
2. docs/rls-access-matrix.md (create) — a table of every app table x role (anon / customer / admin) x operation (select/insert/update/delete), derived from database/03_policies.sql and the RPC's security-definer behavior. Explicitly flag tables the app queries but that are MISSING from the repo SQL/RLS (notifications, booking_cancellation_requests) as OPEN items for the next slice, and note the admin .or() search-filter injection as OPEN. Do not invent policies; document what exists.

Do NOT touch HANDOFF.md, SLICE_3_SPEC.md, AGENTS.md, src/**, database/**, README.md, docs/security-audit.md, .env. Keep npm run build green (paste output). Commit only your two files. Never push, never commit secrets.
