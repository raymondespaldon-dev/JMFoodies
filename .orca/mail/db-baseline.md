Baseline corrected. Your worktree was accidentally based on the Initial commit; it is now fast-forwarded to feat/booking-hardening (da7606c). AGENTS.md, SLICE_3_SPEC.md and HANDOFF.md are now present.

Your stray untracked copies of AGENTS.md, SLICE_3_SPEC.md and scripts/ were moved to a backup (they blocked the merge); the tracked versions are now in place. Your owned files are preserved: database/05_booking_rpc.sql and database/tests/* (15 files).

Action: re-read AGENTS.md and the FROZEN SLICE_3_SPEC.md now that they exist. Re-validate the RPC and EVERY test against the spec; discard any guesswork you made while the spec was absent. Do not relax a validation because a test is inconvenient. Then run `npm run test:db`. If SUPABASE_DB_URL is unset it will refuse: report exactly "tests written, not executed — no SUPABASE_DB_URL" and list the files. Commit only your owned files (database/05_booking_rpc.sql, database/tests/*). Never push, never commit secrets.
