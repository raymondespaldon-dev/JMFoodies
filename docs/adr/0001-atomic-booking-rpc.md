# 0001 — Atomic booking RPC

Status: accepted
Date: 2026-11-23

## Context: what forced a choice

In the baseline implementation (`src/main.js:283-288`), the booking creation process was split across two consecutive client-side HTTP requests to Supabase PostgREST:
1. `const { data: booking } = await supabase.from('bookings').insert(payload)...`
2. `await supabase.from('booking_food_items').insert(details)...`

Furthermore, the pricing math (`estimated_total`, `final_price_per_person`, `extra_price_per_person`) was computed directly inside the browser (`src/main.js:283`) and accepted by the database without server verification.

This architecture caused two unacceptable integrity and business vulnerabilities:
- **Price Authority Hole:** A malicious user or tampered client payload could submit an arbitrary `estimated_total` (e.g., ₱1.00 for a ₱35,000 package), and the database would store it as the authoritative quote.
- **Partial Write / Orphan Bookings:** If network connectivity dropped after the first insert, or if inserting into `booking_food_items` failed due to validation or server failure, the parent booking persisted without any selected food items, leaving a corrupted booking record.
- **Client-Side Validation Bypass:** Category selection limits and minimum guest counts were checked only in client JavaScript, allowing API-level bypasses.

Because JMFoodies is deployed as a static frontend on Vite communicating directly with Supabase via PostgREST, there is no custom middle-tier application server (Node/Express/Go) to arbitrate transactions. PostgREST does not support multi-table atomic transactions across independent HTTP requests. We needed a server-enforced atomic mechanism.

## Decision: what we chose

We chose to implement a single PostgreSQL stored procedure:
`public.create_booking(payload jsonb) returns jsonb`
configured with `security definer` and `set search_path = public, pg_temp`.

Key characteristics of this decision:
1. **Absolute Server Price Authority:** The RPC ignores all client-supplied price parameters. It queries authoritative prices from `public.packages` and `public.food_items`, sums the extras, enforces `package_categories` selection limits, and computes `estimated_total`.
2. **Transactional Atomicity:** Postgres functions execute within a single transaction boundary. If any step, rule, or constraint fails, the entire transaction rolls back automatically. No orphan booking can ever be persisted.
3. **Identity Binding:** The function asserts `auth.uid() is not null` and explicitly assigns `customer_id = auth.uid()`, preventing impersonation.
4. **Collision-Resistant Reference Generation:** The booking reference (`JM-XXXXXXXX`) is generated from `gen_random_bytes` and persisted under a `unique` constraint. Collisions are handled by catching `unique_violation` and retrying (up to 5 attempts) — **not** by a pre-insert `select` check, which would be a TOCTOU race and would not protect the write.

## Alternatives: what we rejected and why

### 1. Client-Side Multi-Request Transaction
- **Idea:** Keep the two `supabase.from(...).insert(...)` calls and attempt client-side compensation (e.g., catching errors and issuing a `delete` on the booking).
- **Why rejected:** Two network roundtrips cannot guarantee atomicity over the public internet. If the browser closes, loses signal, or crashes between calls, compensation never runs. Furthermore, this does nothing to solve the price tampering vulnerability.

### 2. Supabase Edge Function (Deno / TypeScript)
- **Idea:** Deploy a TypeScript Supabase Edge Function to validate inputs, compute prices, and write to the database.
- **Why rejected:**
  - An Edge Function still interacts with Postgres over HTTP/PostgREST unless it uses a direct connection pooler, which re-introduces the multi-statement transaction problem.
  - It introduces cold starts and an additional runtime and deployment dependency (Deno runtime, Supabase CLI deployment) when the team has explicitly constrained deployment to standard Vite static hosting and managed Supabase Postgres.
  - Logic is farther from the data; foreign keys, availability blocks, and row locks are best resolved directly in Postgres.

### 3. Direct Multi-Table Insert via PostgREST with Triggers and RLS
- **Idea:** Rely on direct table inserts into `bookings` and `booking_food_items`, but use `BEFORE INSERT` triggers to recompute price.
- **Why rejected:**
  - PostgREST cannot insert into both `bookings` and `booking_food_items` in a single request while maintaining parent foreign key constraints without an RPC.
  - A `BEFORE INSERT` trigger on `bookings` cannot easily compute the sum of items that have not yet been inserted into `booking_food_items`.
  - Enforcing category selection counts requires child rows to exist, making chicken-and-egg trigger logic fragile and complex compared to an explicit PL/pgSQL function.

## Consequences: what this makes easy, what it makes hard

### What this makes easy:
- **Zero Price Tampering:** The frontend estimate is strictly a display preview. The database calculation is the sole source of truth.
- **Atomic Reliability:** Bookings and menu snapshots succeed or fail as a single unit.
- **Performance:** Reduced network latency (1 HTTP roundtrip instead of 2+).
- **Testability:** The function can be tested purely in SQL transactions using `npm run test:db` without launching browser harnesses.

### What this makes hard:
- **Business Logic in SQL:** Modifying validation rules, selection counts, or discount logic requires SQL migrations (`database/05_booking_rpc.sql`) rather than TypeScript/JavaScript code edits.
- **JSON Payload Parsing:** Type casting and array handling inside PL/pgSQL require defensive JSONB extraction.
- **Error Code Mapping:** The frontend must maintain an explicit error-code mapping layer to convert Postgres exception strings into localized user messages.

## Revisit if: the signal that would reopen this

We will revisit this architectural pattern if:
1. **Third-Party Payment Gateways (Slice 6):** If booking creation becomes dependent on synchronous credit card pre-authorization or webhook-driven two-phase commit flows (e.g., Stripe/PayMongo checkout sessions where the booking must exist in a `pending_payment` state pending webhook verification).
2. **Dedicated Backend Migration:** If the project outgrows client-to-Supabase static architecture and introduces a dedicated Node.js, Go, or Python application backend that manages transactional DB sessions directly via Prisma, Kysely, or raw SQL.
3. **Complex Dynamic Rules Engine:** If catering menu rules expand to include dynamic multi-item discounts, time-based surge pricing, or customer loyalty tiers that become too complex or unwieldy to maintain in PL/pgSQL.
