# JMFoodies — Slice 3 Specification: Secure Booking Core & Atomic RPC

- **Status:** Frozen
- **Version:** 1.1.0
- **Date:** 2026-11-23
- **Author:** Antigravity Architect
- **Reviewed by:** OpenCode (gate review, see §9)
- **Target Implementation:** `database/05_booking_rpc.sql`, `src/main.js`, `database/tests/*.sql`

---

## 1. Executive Summary & Problem Statement

In the baseline implementation (`src/main.js:283-288`), the booking submission path contains two critical security and architectural flaws:
1. **Client Price Authority:** The browser computes `base_price_per_person`, `extra_price_per_person`, `final_price_per_person`, and `estimated_total` client-side, sending them directly in an `insert` query. Any client can tamper with the payload to record arbitrarily low catering prices.
2. **Non-Atomic Multi-Request Writes:** The booking record is inserted first (`bookings`). Next, in a separate network call, selected dishes are inserted (`booking_food_items`). If the client loses connection or the second write fails, the database retains an orphan booking without menu items.

Slice 3 replaces this client-orchestrated write with a single, authoritative database function: `public.create_booking(payload jsonb)`. The function recomputes all prices from database catalog tables, enforces package and category constraints, validates event date lead times, generates a collision-resistant booking reference, and inserts both parent and child rows in one atomic transaction.

---

## 2. Architectural Contract: `public.create_booking(payload jsonb)`

### 2.1 Function Signature & Header

```sql
create or replace function public.create_booking(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
...
$$;
```

- **Execution Privileges:**
  - `REVOKE ALL ON FUNCTION public.create_booking(jsonb) FROM public, anon;`
  - `GRANT EXECUTE ON FUNCTION public.create_booking(jsonb) TO authenticated;`
- **Security Definer Context:**
  - Must immediately assert `auth.uid() is not null`. Anonymous execution is strictly prohibited.
  - Hardcoded `search_path = public, pg_temp` prevents search-path hijacking attacks.
  - The function inserts into `public.bookings` using `customer_id = auth.uid()`. Even if the client sends a `customer_id` field, it is completely ignored.

---

### 2.2 Input Payload Contract

The function takes a single argument `payload jsonb`. All fields are parsed from this object. Any unrecognized fields or client-supplied pricing fields (e.g., `estimated_total`, `base_price_per_person`, `final_price_per_person`, `extra_price_per_person`) are **strictly ignored**.

#### Input JSON Schema

```json
{
  "package_id": "00000000-0000-0000-0000-000000000000",
  "full_name": "Maria Santos",
  "email": "maria@example.com",
  "phone": "+63 917 123 4567",
  "event_name": "Chloe's 7th Birthday",
  "event_type": "Birthday",
  "event_date": "2026-12-15",
  "event_time": "14:00",
  "venue": "123 Balete Drive, Quezon City",
  "guest_count": 50,
  "menu_mode": "custom",
  "selected_food_item_ids": [
    "11111111-1111-1111-1111-111111111111",
    "22222222-2222-2222-2222-222222222222"
  ],
  "special_requests": "Need high chairs for 3 toddlers.",
  "special_food_request": "One guest has severe peanut allergy."
}
```

#### Detailed Field Specification

| Field Name | Type | Required | Default / Constraints | Validation Rule |
|---|---|---|---|---|
| `package_id` | `uuid` | **Yes** | None | Must exist in `public.packages` where `is_active = true`. |
| `full_name` | `text` | **Yes** | Trimmed text | `length(trim(full_name)) > 0`, max 200 chars. |
| `email` | `text` | **Yes** | Trimmed text | Must match basic email regex `^.+@.+\..+$`. |
| `phone` | `text` | **Yes** | Trimmed text | `length(trim(phone)) >= 7`, max 50 chars. |
| `event_name` | `text` | **Yes** | Trimmed text | `length(trim(event_name)) > 0`, max 255 chars. |
| `event_type` | `text` | **Yes** | Trimmed text | `length(trim(event_type)) > 0`, max 100 chars. |
| `event_date` | `date` | **Yes** | YYYY-MM-DD | Must not be in the past (`>= current_date`). Must satisfy minimum advance notice (>= `current_date + 3 days`). |
| `event_time` | `time` | **Yes** | HH:MM or HH:MM:SS | Valid time format. Must not conflict with blocked availability or existing confirmed/approved bookings. |
| `venue` | `text` | **Yes** | Trimmed text | `length(trim(venue)) > 0`, max 500 chars. |
| `guest_count` | `integer` | **Yes** | Integer > 0 | Must be `>= packages.minimum_guests` for the selected package. |
| `menu_mode` | `text` | No | `'custom'` | Must be one of `'suggested'` or `'custom'`. |
| `selected_food_item_ids` | `uuid[]` | **Yes** | Array of UUIDs | Array of unique food item UUIDs. Each item must exist in `public.food_items` with `is_available = true`. |
| `special_requests` | `text` | No | `null` | Optional customer notes. Max 2000 chars. |
| `special_food_request` | `text` | No | `null` | Optional dietary/custom request text. Max 2000 chars. |

---

### 2.3 Server-Side Price Recomputation & Authority

The SQL function is the **sole price authority**. The price calculation follows this exact deterministic algorithm:

1. **Base Price Query:**
   ```sql
   select price_per_person, minimum_guests
   into v_pkg_base_price, v_pkg_min_guests
   from public.packages
   where id = v_package_id and is_active = true;
   ```
   If not found: raise error code `INVALID_PACKAGE` or `PACKAGE_INACTIVE`.

2. **Guest Minimum Check:**
   If `v_guest_count < v_pkg_min_guests`: raise error code `GUESTS_BELOW_MINIMUM`.

3. **Menu Item Validation & Extra Price Calculation:**
   - **Duplicates are removed, not rejected.** Normalise with `select distinct` / `array_agg(distinct id)` before any count, price or insert work. A duplicate UUID is a harmless client bug and must not block a paying customer's booking; deduplication also removes the only way duplicates could inflate a category count. (v1.0 text offered "reject or dedupe" as a choice — that ambiguity is removed here.)
   - Fetch items from `public.food_items`:
     ```sql
     select
       f.id,
       f.category_id,
       f.name,
       c.name as category_name,
       f.extra_price,
       f.is_available
     from unnest(v_selected_food_item_ids) s(item_id)
     join public.food_items f on f.id = s.item_id
     join public.food_categories c on c.id = f.category_id;
     ```
   - If count of matched rows `< cardinality(v_selected_food_item_ids)`:
     Raise error code `INVALID_FOOD_SELECTION` (one or more items do not exist).
   - If any selected food item has `is_available = false`:
     Raise error code `FOOD_ITEM_UNAVAILABLE`.

4. **Category Selection Limit Validation:**
   For every category configured for this package in `public.package_categories`:
   ```sql
   select category_id, selection_limit, is_required
   from public.package_categories
   where package_id = v_package_id;
   ```
   For each category rule:
   - Let `v_count` = count of items in `selected_food_item_ids` that belong to `category_id`.
   - If `v_count > selection_limit`:
     Raise error code `MENU_SELECTION_LIMIT_EXCEEDED` (user selected too many items in this category).
   - If `is_required = true` and `v_count <> selection_limit`:
     Raise error code `MENU_REQUIRED_CATEGORY_MISMATCH` (required category must have exactly `selection_limit` items selected).

4a. **Every selected item must belong to a category the package actually configures.** The per-category loop above only inspects categories that `package_categories` lists; it never notices an item from a *foreign* category, which would be priced and stored anyway. Assert it explicitly:

   ```sql
   if exists (
     select 1
     from unnest(v_selected_food_item_ids) s(item_id)
     join public.food_items f on f.id = s.item_id
     where not exists (
       select 1 from public.package_categories pc
       where pc.package_id = v_package_id and pc.category_id = f.category_id
     )
   ) then
     raise exception using errcode = 'P0024',
       message = 'FOOD_ITEM_NOT_IN_PACKAGE: One or more selected dishes are not offered by this package.';
   end if;
   ```

   **`package_food_items` is not an allowlist.** It records curated defaults (`is_default`), not entitlement; membership does **not** gate selection. Only `package_categories` does. *(Deliberate reading of an ambiguous schema — a strict allowlist here would make every food item outside the curated list silently illegal. If the business means it as a hard allowlist, change this rule and its test; nothing else depends on it.)*

5. **Final Price Invariants:**
   - `extra_price_per_person = sum(food_items.extra_price)` across selected items.
   - `base_price_per_person = packages.price_per_person`.
   - `final_price_per_person = base_price_per_person + extra_price_per_person`.
   - `estimated_total = final_price_per_person * guest_count`.
   - All arithmetic uses `numeric(10,2)` and `numeric(12,2)`. These values exactly satisfy the check constraints in `public.bookings`:
     - `check(final_price_per_person = base_price_per_person + extra_price_per_person)`
     - `check(estimated_total = final_price_per_person * guest_count)`

---

### 2.4 Event Scheduling & Minimum Notice Validation

1. **Lead Time Check:**
   - Policy: Minimum booking notice is **3 calendar days** (settled in `VIBE_CODING_OS.md` §9 and `business_settings.booking_rules`).
   - Check:
     ```sql
     if v_event_date < current_date then
       raise exception using errcode = 'P0002', message = 'EVENT_DATE_PAST: Event date cannot be in the past.';
     end if;
     if v_event_date < (current_date + interval '3 days')::date then
       raise exception using errcode = 'P0003', message = 'MINIMUM_NOTICE_NOT_MET: Bookings require at least 3 calendar days advance notice.';
     end if;
     ```

2. **Availability Block & Collision Check:**
   - Check against `public.availability`:
     ```sql
     if exists (
       select 1 from public.availability a
       where a.event_date = v_event_date and a.is_blocked = true
         and (a.start_time is null or (v_event_time >= a.start_time and (a.end_time is null or v_event_time < a.end_time)))
     ) then
       raise exception using errcode = 'P0004', message = 'TIME_SLOT_UNAVAILABLE: The selected event date/time is unavailable.';
     end if;
     ```
   - Check against confirmed/approved collisions:
     ```sql
     if exists (
       select 1 from public.bookings b
       where b.event_date = v_event_date and b.event_time = v_event_time
         and b.status in ('approved', 'confirmed')
     ) then
       raise exception using errcode = 'P0005', message = 'TIME_SLOT_COLLISION: An approved reservation already exists at this exact time.';
     end if;
     ```

---

### 2.5 Server-Side Reference Generation

- **Format:** `JM-` followed by an 8-character uppercase alphanumeric string derived from cryptographic randomness.
  Example: `JM-7K9W2B4X`.
- **Generation Logic:**
  ```sql
  v_booking_ref := 'JM-' || upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 8));
  ```
- **Collision Protection:** A loop with up to 5 attempts ensures collision resistance against the `unique(booking_reference)` constraint.

---

### 2.6 Atomic Persistence Protocol

Within the single transaction of `create_booking`:
1. Insert the parent record into `public.bookings`:
   - `customer_id` = `auth.uid()`
   - `booking_reference` = `v_booking_ref`
   - `package_id` = `v_package_id`
   - `full_name` = `v_full_name`
   - `email` = `v_email`
   - `phone` = `v_phone`
   - `event_name` = `v_event_name`
   - `event_type` = `v_event_type`
   - `event_date` = `v_event_date`
   - `event_time` = `v_event_time`
   - `venue` = `v_venue`
   - `guest_count` = `v_guest_count`
   - `base_price_per_person` = `v_pkg_base_price`
   - `extra_price_per_person` = `v_extra_price`
   - `final_price_per_person` = `v_final_price`
   - `estimated_total` = `v_estimated_total`
   - `special_requests` = `v_special_requests`
   - `special_food_request` = `v_special_food_request`
   - `menu_mode` = `v_menu_mode`
   - `status` = `'pending'` (immutable at creation)
   - Returning `id` into `v_booking_id`.

2. Insert child snapshots into `public.booking_food_items`:
   ```sql
   insert into public.booking_food_items (
     booking_id,
     food_item_id,
     item_name_snapshot,
     category_name_snapshot,
     extra_price_snapshot
   )
   select
     v_booking_id,
     f.id,
     f.name,
     c.name,
     f.extra_price
   from unnest(v_selected_food_item_ids) s(item_id)
   join public.food_items f on f.id = s.item_id
   join public.food_categories c on c.id = f.category_id;
   ```

3. Any runtime error, check constraint violation, or explicit exception rolls back **both** inserts.

---

### 2.7 Return Value Contract

The function returns a `jsonb` object with the created booking summary:

```json
{
  "booking_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "booking_reference": "JM-7K9W2B4X",
  "estimated_total": 17500.00,
  "base_price_per_person": 350.00,
  "extra_price_per_person": 0.00,
  "final_price_per_person": 350.00,
  "guest_count": 50,
  "status": "pending",
  "created_at": "2026-11-23T09:45:00.000Z"
}
```

---

## 3. Error Codes & User-Facing Error Mapping Table

Postgres exceptions raised by `create_booking` must use standardized error codes (either structured in the exception message prefix or using custom SQLSTATE codes). To allow simple parsing in `src/main.js` whether Supabase returns `error.message` or `error.code`, every raised message begins with `CODE: Description`.

| Machine Error Code | Custom SQLSTATE | Cause | UI Notification Message (`src/main.js`) |
|---|---|---|---|
| `UNAUTHENTICATED` | `42501` | `auth.uid() is null` | "Please sign in or create an account before submitting your booking." |
| `MISSING_REQUIRED_FIELDS` | `P0001` | Missing full_name, email, phone, venue, etc. | "Please fill in all required event and contact fields." |
| `INVALID_PACKAGE` | `P0010` | `package_id` does not match any record | "The selected package does not exist. Please re-select a package." |
| `PACKAGE_INACTIVE` | `P0011` | Package has `is_active = false` | "The selected package is currently unavailable. Please choose another package." |
| `GUESTS_BELOW_MINIMUM` | `P0012` | `guest_count < minimum_guests` | "This package requires at least {minimum_guests} guests." |
| `EVENT_DATE_PAST` | `P0002` | `event_date < current_date` | "Event date cannot be in the past." |
| `MINIMUM_NOTICE_NOT_MET` | `P0003` | `event_date < current_date + 3 days` | "Bookings require at least 3 calendar days advance notice." |
| `TIME_SLOT_UNAVAILABLE` | `P0004` | Date/time blocked in `availability` | "The selected date and time is blocked for catering. Please choose another time." |
| `TIME_SLOT_COLLISION` | `P0005` | Approved booking already exists | "An approved reservation already exists at this exact time. Please select another time." |
| `INVALID_FOOD_SELECTION` | `P0020` | Unknown food item UUID in selection | "One or more selected dishes could not be found. Please refresh your menu choices." |
| `FOOD_ITEM_UNAVAILABLE` | `P0021` | Item has `is_available = false` | "One or more selected dishes are currently unavailable. Please adjust your menu." |
| `MENU_SELECTION_LIMIT_EXCEEDED` | `P0022` | Selected items in category > limit | "You selected more items than allowed for category: {category_name}." |
| `MENU_REQUIRED_CATEGORY_MISMATCH` | `P0023` | Selected items in required category != limit | "Please select exactly {limit} item(s) for {category_name}." |
| `FOOD_ITEM_NOT_IN_PACKAGE` | `P0024` | Selected item's category is not configured for this package | "One or more selected dishes are not offered by this package. Please adjust your menu." |
| `PRICE_TAMPERING_ATTEMPT` | `P0030` | Explicit client override attempt (if enforced) | "Invalid booking request. Pricing has been recalculated based on official menu rules." |

### 3.1 Policy on Client-Supplied Price Fields
If a client sends fields like `estimated_total` or `final_price_per_person` in the payload:
- **Decision:** The RPC **silently ignores** all client-submitted price fields and replaces them with authoritative database calculations.
- **Rationale:** Preventing false positives due to minor rounding differences between JavaScript IEEE 754 floats and Postgres `numeric(12,2)`. The stored booking will reflect the database calculation regardless of what the client sent.

---

## 4. Row-Level Security (RLS) & Execution Security Model

### 4.1 Invocation Privileges
- Role `authenticated`: Granted `EXECUTE`.
- Role `anon`: `REVOKE EXECUTE`. Public visitors cannot call `create_booking`.
- Role `service_role`: Retains default admin execution.

### 4.2 Why `SECURITY DEFINER` Does Not Create an Access Hole
A naive `SECURITY DEFINER` function can be hazardous if it executes with superuser/owner privileges without guarding inputs. `create_booking` is secure because:
1. **Strict Search Path:** `set search_path = public, pg_temp` prevents malicious function shadowing.
2. **Hard Identity Binding:** `v_customer_id := auth.uid();` binds the booking owner directly to the authenticated caller session. It is impossible to submit a booking under another user's `customer_id`.
3. **Hard Status Binding:** `status` is hardcoded to `'pending'`. A customer cannot create an `'approved'` or `'confirmed'` booking.
4. **Data Isolation:** The function only inserts one row in `public.bookings` and its associated items in `public.booking_food_items`. It never updates or reads records belonging to other customers.
5. **No Weakening of Existing Policies:**
   - Existing table RLS on `bookings` (`customer read own bookings`, `customer create own booking`) and `booking_food_items` remain active.
   - Even if direct table insert permissions for `authenticated` are retained or tightened in the future, the RPC encapsulates all business and pricing logic.

---

## 5. Executable SQL Test Specification (`database/tests/`)

Tests are executed by `scripts/db-test.mjs` against a staging Postgres database.

### Runner Rules
- Directives in the first 20 lines define the session identity:
  - `-- @role authenticated`
  - `-- @sub <uuid>`
- The test runner wraps each file in a transaction and issues a `ROLLBACK` at the end.
- A test **passes** if the file completes without unhandled errors.
- A test **fails** by raising an exception (e.g., `raise exception 'Assertion failed: ...'`).

### Test Suite Inventory

| File | Scenario | Setup & Execution | Assertion Criteria |
|---|---|---|---|
| `database/tests/01_happy_path_standard.sql` | Happy path with standard package and base inclusions | Auth customer submits valid active package and matching required menu items. | Booking row created; `booking_reference` starts with `'JM-'`; `estimated_total = base_price * guests`; items in `booking_food_items` match count. |
| `database/tests/02_happy_path_with_extras.sql` | Happy path with extra-charge food items | Auth customer submits items with positive `extra_price`. | `extra_price_per_person` equals sum of extras; `estimated_total = (base + extra) * guests`. |
| `database/tests/03a_anon_cannot_execute.sql` | Anonymous role cannot reach the function at all | `-- @role anon`, no sub. Calls `create_booking`. | Call fails with `42501` **permission denied for function** — this asserts the `REVOKE ... FROM anon` grant, not the internal guard. Keep it separate from 03b, because both surface as `42501` and conflating them lets the guard go untested. |
| `database/tests/03b_authenticated_without_claims_rejected.sql` | Authenticated role with no JWT subject | `-- @role authenticated`, **no `@sub`** so `auth.uid()` is null. | Call raises `UNAUTHENTICATED` from the explicit guard, not from a privilege error. Assert on the message prefix, not only the SQLSTATE. |
| `database/tests/03c_identity_bound_to_caller.sql` | Payload cannot choose the owner | `-- @sub <A>`; payload also contains `"customer_id": "<B>"`. | Stored `bookings.customer_id = A`. Proves `customer_id` is taken from `auth.uid()` and the payload field is ignored. |
| `database/tests/04_missing_required_fields.sql` | Missing contact/event fields | Payload omits `full_name` or `venue`. | Call raises `MISSING_REQUIRED_FIELDS`. |
| `database/tests/05_invalid_package.sql` | Non-existent package UUID | Payload supplies random UUID not in `packages`. | Call raises `INVALID_PACKAGE`. |
| `database/tests/06_package_inactive.sql` | Inactive package | Active package is set to `is_active = false`; customer calls RPC. | Call raises `PACKAGE_INACTIVE`. |
| `database/tests/07_guests_below_minimum.sql` | Guest count < minimum | Package requires 40 guests; payload sends 25. | Call raises `GUESTS_BELOW_MINIMUM`. |
| `database/tests/08_date_in_past.sql` | Event date yesterday | Payload supplies `current_date - 1`. | Call raises `EVENT_DATE_PAST`. |
| `database/tests/09_notice_period_violation.sql` | Event date in 1 day (less than 3 days) | Payload supplies `current_date + 1`. | Call raises `MINIMUM_NOTICE_NOT_MET`. |
| `database/tests/10_category_limit_exceeded.sql` | Exceeding category `selection_limit` | Category allows 1 item; payload sends 2. | Call raises `MENU_SELECTION_LIMIT_EXCEEDED`. |
| `database/tests/11_category_under_limit.sql` | Missing required category item | Category is required with limit 2; payload sends 1. | Call raises `MENU_REQUIRED_CATEGORY_MISMATCH`. |
| `database/tests/12_price_tampering_ignored.sql` | Client passes fake cheap price | Payload includes `"estimated_total": 1.00`, `"final_price_per_person": 0.50`. | RPC succeeds and the stored row equals the **server-computed** total. Do **not** hardcode `17500.00`: compute the expected value in the test from `packages.price_per_person`, the summed `food_items.extra_price` of the selected ids, and `guest_count`, then compare. A literal breaks every time seed data changes and hides a real mismatch. |
| `database/tests/13_atomicity_on_failure.sql` | Child-insert failure rolls the parent back | `-- @sub <uuid>` only (**no `@role`**, so DDL is permitted). Inside the file: `create trigger` on `booking_food_items` that raises on insert; call `create_booking` inside an exception block; then assert `not exists (select 1 from bookings where booking_reference = <ref>)`; finally drop the trigger. | Booking row does **not** persist after the child failure. Note: the v1.0 wording ("invalid food UUID") could not test atomicity at all — UUID validation runs *before* any insert, so the parent was never written and nothing was proven. The failure must be injected **after** the parent insert. |
| `database/tests/14_blocked_availability.sql` | Blocked date/time collision | An entry in `availability` blocks the date/time. | Call raises `TIME_SLOT_UNAVAILABLE`. |
| `database/tests/15_duplicate_selection_deduped.sql` | Duplicate food IDs are tolerated | `selected_food_item_ids` repeats one UUID; the rest satisfy the package rules. | Call succeeds; `booking_food_items` contains the item **once**; category counts and total reflect distinct items only. |
| `database/tests/16_item_not_in_package.sql` | Item from a category the package does not configure | Select an available food item whose category has no `package_categories` row for this package. | Call raises `FOOD_ITEM_NOT_IN_PACKAGE`. |

---

## 6. Frontend Integration Specification (`src/main.js`)

In `src/main.js`, `submitBooking(e)` will be updated to:
1. Gather form fields into the input payload shape defined in §2.2.
2. Send only `selected_food_item_ids`, customer info, event details, guest count, and notes.
   - `menu_mode` is **display metadata only**. The client must always send the fully resolved selection in `selected_food_item_ids`, including in `suggested` mode (resolve the package defaults client-side first). The server does not expand defaults, so an empty array in `suggested` mode fails validation.
3. Compute client-side estimate for immediate display only, labelled "Estimated Preview".
4. Call Supabase RPC:
   ```javascript
   const { data, error } = await supabase.rpc('create_booking', { payload });
   if (error) {
     const friendlyMessage = mapRpcErrorToMessage(error);
     notify(friendlyMessage, true);
     return;
   }
   location.href = '/track-booking.html?ref=' + encodeURIComponent(data.booking_reference);
   ```
5. Implement `mapRpcErrorToMessage(error)` using the table in §3.

---

## 7. Non-Goals for Slice 3

The following items are explicitly **out of scope** for Slice 3:
- Payment gateway integration (Stripe, PayMongo, GCash).
- Deposit calculations and invoice generation.
- Automated SMS or external email delivery (Resend / Twilio).
- Customer cancellation workflow or cancellation approval RPC.
- Admin manual booking overrides or status transition state-machines.
- Capacity scheduling beyond exact start-time availability blocks.

---

## 8. Open Decisions & Source Gap Analysis

Based on reverse engineering of existing source code and seed files:

1. **Lead Time Calculation & Timezone:**
   - *Status:* Resolved in `VIBE_CODING_OS.md` §9.
   - *Rule:* 3 calendar days lead time based on Asia/Manila date (`current_date + interval '3 days'`).
2. **Pricing Discrepancy Action:**
   - *Status:* Resolved.
   - *Rule:* The RPC silently overwrites any client-supplied price with the server recomputed value rather than throwing an error, avoiding client float/rounding discrepancies.
3. **Availability Duration vs. Exact Start Time:**
   - *Source Gap:* Current `availability` schema has `start_time` and `end_time`, but `bookings` only stores `event_time` (start time) with no event duration.
   - *Resolution for Slice 3:* Retain exact start-time collision check and window checks where `event_time >= start_time and event_time < end_time`. Duration-based scheduling is deferred to Slice 6.
4. **Special Food Requests:**
   - *Source Gap:* `special_food_request` is plain text.
   - *Resolution for Slice 3:* Stored verbatim as text notes without pricing implications.

---

## 9. Gate review amendments (v1.1.0)

Applied by OpenCode after reviewing v1.0.0 against the real schema, triggers and form. Each one fixed a defect that would have reached the workers.

| # | Defect in v1.0 | Amendment |
|---|---|---|
| A1 | Duplicate food IDs were "rejected **or** deduped" — a contradiction a worker would have had to resolve alone | Dedupe always (§2.3 step 3). Rejecting is user-hostile for a harmless client bug and buys nothing. |
| A2 | No rule covered an item whose category is not configured for the package; it would be priced and stored silently | New `FOOD_ITEM_NOT_IN_PACKAGE` / `P0024` rule (§2.3 step 4a) |
| A3 | `package_food_items` was never referenced, leaving its role undefined | Declared **curated defaults, not an allowlist** (§2.3 step 4a) |
| A4 | Test 03 asserted `42501` for "unauthenticated" — but a role that lacks `EXECUTE` also gets `42501`, so the internal `auth.uid()` guard was untested | Split into 03a (grant boundary), 03b (guard, no JWT subject), 03c (identity binding) |
| A5 | Test 13 claimed to test atomicity via an invalid food UUID — but UUID validation runs *before* any insert, so the parent was never written and nothing was proven | Redesigned to inject the failure **after** the parent insert via a temporary trigger, then assert no booking persists |
| A6 | Test 12 hardcoded `17500.00`, which breaks on any seed change and masks real mismatches | Compute the expected total inside the test from the catalog tables |
| A7 | `suggested` menu mode was ambiguous about who resolves the defaults | Client always sends the resolved selection (§6 item 2) |

### Interaction with the existing database triggers — implementers must know this

Verified in `database/02_functions.sql`:

1. **`booking_constraints` is a BEFORE INSERT trigger and already enforces** package-active, guest minimum, availability blocks and time collisions. It raises **generic** messages. The RPC must run its own checks first so the specific `P00xx` codes surface; the trigger is defence in depth. If a customer ever sees a raw Postgres message, the RPC has a hole — treat it as a P1 bug, not a cosmetic one.
2. **`booking_status_log` is an AFTER INSERT trigger** that writes `booking_status_history` automatically. **Do not insert into `booking_status_history` from the RPC** — it would double-log every booking.
3. **`booking_reference` uniqueness is a UNIQUE constraint.** The retry loop must catch `unique_violation` and retry (5 attempts). A pre-check `select ... where booking_reference = ...` is a TOCTOU race and does not protect you; the constraint plus the catch does.

### What this review did not do

It verified the contract against the schema and the existing triggers. It did **not** execute anything — there is no `SUPABASE_DB_URL` on this machine, so no SQL has been run. The first real proof is `npm run test:db` in the `slice3-db` worker.
