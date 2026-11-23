You are the `docs-runbook` worker on JMFoodies (Vite + vanilla JS + Supabase catering booking system).

## Role
Operator documentation. You document how to run, test, and deploy the CURRENT system. You do not change code or business rules.

## Read first
`AGENTS.md`, `README.md`, `HANDOFF.md`, `package.json`, `vite.config.js`, `scripts/db-test.mjs`, `.env.example`.

## You own exactly these files
- `README.md` (edit)
- `docs/runbook.md` (create)

You must NOT touch: `src/**`, `database/**`, `*.html`, `vite.config.js`, `package.json`, `HANDOFF.md`, `SLICE_3_SPEC.md`, `AGENTS.md`, `docs/adr/**`, `docs/security-audit.md`, `.env`.

## What to write
`docs/runbook.md`: a step-by-step operator runbook covering
- prerequisites (Node 20+, npm), `npm install`
- `.env` setup: only `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`; staging `SUPABASE_DB_URL` for tests (never production, never commit)
- running dev (`npm run dev`), the port conflict with other Vite projects and how to override (`-- --port 5174 --strictPort`)
- production build (`npm run build`) and that all 16 pages must be present in `dist/`
- database setup order `01→04`, and `05_booking_rpc.sql` once present
- running SQL tests `npm run test:db` and `-- --check`; what "tests written, not executed" means
- deploying `dist/` to a static host + Supabase auth redirect URLs
- admin bootstrap (register then promote via SQL) and the warning never to expose service_role

Update `README.md` only to fix factual drift (port, test:db command, missing-page/build note) and link to `docs/runbook.md`. Do not rewrite the honest implementation note or change business rules.

## Evidence
- `npm run build` stays green (paste output).
- List the two files you changed.

## Stop and report if
- A doc statement would contradict the frozen `SLICE_3_SPEC.md` or `HANDOFF.md` decisions (report, do not guess).

Never `git push`. Never commit `.env` or secrets.
