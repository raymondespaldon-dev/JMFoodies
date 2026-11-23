You are the `slice3-web-fix` worker on JMFoodies (Vite + vanilla JS + Supabase). Fix two P1 review findings in the booking frontend. Server-side RPC remains the price/validation authority; you only add client-side pre-validation so invalid input is stopped before the RPC.

## Read first
`AGENTS.md`, `SLICE_3_SPEC.md`, `src/main.js` (focus `submitBooking` ~line 307 and the menu selection handler ~line 249).

## You own exactly ONE file
- `src/main.js`

Do NOT touch `database/**`, `docs/**`, `*.html`, `vite.config.js`, `package.json`, `HANDOFF.md`, `SLICE_3_SPEC.md`, `AGENTS.md`.

## Fixes required
1. **P1 required-field bypass (src/main.js ~307):** `submitBooking` calls `preventDefault()` but never `checkValidity()`/`reportValidity()`, so empty/invalid `required` fields can reach the RPC. At the start of the handler, after `preventDefault()`, call `form.checkValidity()`; if false, `form.reportValidity()` and return without calling the RPC.
2. **P1 required-category pre-validation (src/main.js ~249 / submit path):** the UI blocks over-limit picks but lets a user uncheck a required category below its required count and submit, relying on the server to reject. Before calling the RPC, recompute per-category selected counts from `selections` and the loaded `package_categories` rules; for every `is_required` rule, if the count != `selection_limit`, `notify(...)` a clear message and return. Also enforce `selection_limit` maxima pre-submit. Mirror the server rules exactly; do not invent new rules.

Keep all existing behavior (price display, RPC call, error-code mapping) intact. Do not weaken or remove server validation.

## Evidence
- `npm run build` green (paste output).
- Show the two changed code regions.

## Stop and report if
- A fix would contradict the frozen `SLICE_3_SPEC.md` (report the conflict, do not guess).

Never `git push`. Never commit secrets. Commit only `src/main.js`.
