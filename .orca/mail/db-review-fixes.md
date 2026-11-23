Run C (read-only review) returned DO-NOT-SHIP with findings in your owned area. Address them:

1. P1 — missing regression tests: the suite has no test for `FOOD_ITEM_UNAVAILABLE` and none for `TIME_SLOT_COLLISION`, both required by the frozen spec. Add `database/tests/17_food_item_unavailable.sql` and `database/tests/18_time_slot_collision.sql`. Each must set up its own fixtures in-transaction and assert the RPC raises the exact spec error code; each must fail if the behaviour regresses. First confirm `database/05_booking_rpc.sql` actually raises both codes; if it does not, add the validation to the RPC (you own it) per spec, then test it.
2. P2 — `database/tests/13_atomicity_on_failure.sql:57` compares total booking counts, so unrelated rows/triggers could mask a partial write. Change it to assert the SPECIFIC attempted booking (by its reference/id) is absent after the injected failure, proving rollback of that booking and its food items.

Re-read the frozen SLICE_3_SPEC.md error-code list before writing. Run `npm run test:db`; if SUPABASE_DB_URL is unset it refuses — report exactly "tests written, not executed — no SUPABASE_DB_URL" and list files. Do not fake passes.

You own only `database/05_booking_rpc.sql` and `database/tests/*.sql`. Commit only those. Never push, never commit secrets.
