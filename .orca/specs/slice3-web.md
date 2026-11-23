You are the `slice3-web` worker on JMFoodies (Vite + vanilla JS + Supabase catering booking system).

## Authority

`SLICE_3_SPEC.md` is **frozen**. Implement the client side of it exactly.

Read first: `AGENTS.md`, `SLICE_3_SPEC.md`, `src/main.js` (`submitBooking`, around lines 240-300), `src/supabase.js`.

## You own exactly these files

- `src/main.js` — **only** the `submitBooking` function and the small helpers it directly needs
- `src/supabase.js` — only if an RPC helper is genuinely required

You do **not** touch: `database/**`, `vite.config.js`, `package.json`, any HTML. Another worker owns the SQL.

## What to build

Replace the current two-request write with a single RPC call.

Current code does roughly:

```js
const estimated_total = /* computed in the browser */;
await supabase.from('bookings').insert({ ...fields, estimated_total });
await supabase.from('booking_food_items').insert(rows);
```

Change it to:

```js
const { data, error } = await supabase.rpc('create_booking', { payload });
```

Requirements:

1. Remove client-side price authority from the payload. The browser may still compute an **estimate for display**, but it must be labelled as an estimate and must not be sent as the billable total (send only the inputs the spec says to send).
2. Keep the existing form fields, ids, and UI behaviour. The happy path must look identical to the user.
3. Map every spec error code to a clear human message. No raw SQLSTATE or Postgres text in front of a customer.
4. Handle the failure path: show the message, keep the form filled, do not navigate away as if it succeeded.
5. Do not add a framework, bundler change, or dependency.

## Verification (do not skip, do not fake)

```powershell
npm run build
```

Must stay green. If you can run the dev server, walk the booking happy path once. Report what you actually ran and what you saw. Do not claim a browser test you did not perform.

## Commit protocol

```
feat(web): call create_booking rpc instead of two-request insert
fix(web): map booking rpc errors to user-facing messages
```

Never commit `.env` or any key. Never `git push`.

## Stop and report if

- the payload shape in `SLICE_3_SPEC.md` cannot be built from the existing form fields without a design change
- an error code in the spec has no sensible customer-facing wording
- you need to edit a database file (you do not own it)
