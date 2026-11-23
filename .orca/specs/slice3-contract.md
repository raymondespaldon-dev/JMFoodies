You are the architect for JMFoodies, a Vite 7 + vanilla JS + Supabase catering booking system.

## Task

Produce **exactly two files**, and nothing else:

1. `SLICE_3_SPEC.md`
2. `docs/adr/0001-atomic-booking-rpc.md`

Do not edit application code, SQL, config, HTML, or tests. This is a design task only.

## Read first

- `AGENTS.md` — project rules
- `PROJECT_REVERSE_ENGINEERING.md` — what actually exists
- `APPDEPLOY_START_TO_FINISH_PLAYBOOK.md` — Slice 3 section
- `database/01_schema.sql`, `database/02_functions.sql`, `database/03_policies.sql`
- `src/main.js` lines 240-300 (the booking submit path)

## The problem being solved

`src/main.js:283` computes `estimated_total` in the browser. `:286` inserts the booking, then `:287-288` insert `booking_food_items` in a **second request**. Consequences: a user can tamper with the price, and a partial failure leaves a booking with no menu items.

## SLICE_3_SPEC.md must define

1. **`public.create_booking(payload jsonb)`** — exact contract:
   - exact input JSON shape, field by field, with types
   - server-side price recomputation from `packages.base_price` plus `food_items` extras; ignore any client price field
   - guest minimum validation against the package
   - event date/time validation (not in the past; respect minimum notice — see open decisions)
   - required menu-count validation against `package_categories.selection_limit`
   - `booking_reference` generated server-side
   - one transaction inserting `bookings` + `booking_food_items`; full rollback on any failure
   - exact return shape, e.g. `{ booking_id, booking_reference, estimated_total }`
   - `security definer`, `set search_path = public`, requires `auth.uid()`

2. **Error codes** — stable codes for: invalid package, package inactive, menu count mismatch, price tampering attempt, unauthenticated, date in past, guest below minimum, missing required fields. Each with the user-facing message the UI should show.

3. **RLS assumptions** — which role may call the function, and why `security definer` does not open a hole.

4. **Test list** — one test per happy path and per error, written to be executable as SQL files under `database/tests/`. Note the runner contract: each file runs inside a transaction that is rolled back; a test fails by raising an exception.

5. **Non-goals for this slice** — payments, deposits, SMS, cancellation flow, admin overrides.

6. **Open decisions** — anything the source code does not answer. Do not guess.

## ADR

`docs/adr/0001-atomic-booking-rpc.md`: context, the decision, at least two alternatives considered (client-side transaction, edge function, direct multi-table insert with RLS), consequences, and what would make you revisit it. Add a row to the existing `docs/adr/README.md` index.

## Constraints you must respect

- There is **no local Postgres, no Docker, and no Supabase CLI** on this machine. Tests run against a staging database through `npm run test:db` using a `SUPABASE_DB_URL` direct connection. Design the test list to fit that runner, not a `supabase test db` workflow.
- The frontend must not need a new framework. The RPC is called with `supabase.rpc('create_booking', { payload })`.
- Placement: this machine, local worktree.

## Gate (self-check before you finish)

- Input and output shapes are unambiguous enough that two independent developers would write the same RPC.
- Exactly one document is the price authority: the SQL function.
- Every error code maps to a user-facing message.
- Every acceptance criterion is executable as a test.
- No business rule is invented; unknowns are listed under Open decisions.
