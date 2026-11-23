# JMFoodies Catering Booking System — Reverse Engineering Master Specification

**Purpose:** Source-grounded handoff for recreating the existing JMFoodies catering booking system in AppDeploy. The current repository is the evidence baseline; comments and pages may refer to intended functionality that the checked-in database does not supply.

**Inspection boundary:** Static review of this workspace: HTML entry pages, `src/main.js`, `src/supabase.js`, `src/styles.css`, `vite.config.js`, `package.json`, README, and SQL scripts under `database/`. No Supabase project credentials or live database were supplied, so live behavior, deployed schema, RLS behavior, and production settings are unverified. No files were changed as part of this analysis except this specification.

## 1. Executive summary

This is a small multi-page catering booking web app built with Vite, vanilla JavaScript, and Supabase JS v2. Supabase provides email/password authentication, Postgres data and Row Level Security. There is no custom application server; browser code queries Supabase directly using a public anon/publishable key. The UI supports public package browsing, customer accounts, package/menu customization and booking requests, reference-based booking tracking, customer booking lists, an admin console, simple booking reports/CSV export, package and food administration, and cancellation-request UI.

The main booking path is implemented: an authenticated customer chooses a package and dishes, provides event details, sees a client-calculated estimate, submits a pending booking and then sees a reference/details page. Admins can update booking status. SQL triggers log booking status changes and check package minimum guests, blocked dates/times, and exact-time collisions for approved/confirmed bookings.

**This repository is a starter, not a production-ready booking/payment platform.** No payment processing exists. There is no verified email notification pipeline. Frontend references to `notifications`, `booking_cancellation_requests`, and `review_booking_cancellation_request` have no corresponding definitions in the checked-in SQL. Thus notifications and cancellation request management require missing schema/backend objects and are not installable from the documented SQL sequence as-is. Booking insertion and menu-detail insertion are separate requests, so partial bookings can occur. Prices and selected menu rules are not authoritatively recomputed by the database.

## 2. Project structure and technology

| Area | Files | Observed implementation |
|---|---|---|
| Static page entry points | Root `*.html`, `admin/*.html` | Thin HTML shells mounting `#app`, all load shared JS module |
| Main app | `src/main.js` | Route selection by pathname; page markup, event handlers and Supabase calls in one large module |
| Styling | `src/styles.css` | Custom CSS, shared global styles and responsive breakpoints |
| Supabase client | `src/supabase.js` | Reads Vite URL and anon key; persistent session, token refresh, URL session detection |
| DB setup | `database/01_schema.sql`…`04_seed.sql` | Tables/types, triggers/functions, RLS policies, sample categories/packages/foods/settings |
| Build | `package.json`, `vite.config.js` | Vite 7, npm; multi-page build inputs (some HTML pages omitted from explicit build inputs; see audit) |
| External runtime | Supabase, Google Fonts, Unsplash hero photo | Supabase service; remote fonts/image; no payment, email, SMS, map or analytics SDK detected |

Dependencies: runtime `@supabase/supabase-js` ^2.57.0; dev `vite` ^7.1.0. README states Node.js 20+, npm and a Supabase project.

## 3. Roles and access model

- **Unauthenticated visitor:** can view active packages, categories/available foods and package rules; can register/sign in/reset password; can reach booking UI but submission requires a signed-in user. Public booking lookup UI exists, but the checked-in RLS allows booking selects only to that booking’s customer or admin. A reference is not an access token; anonymous tracking is therefore blocked by the supplied policies.
- **Customer:** Supabase Auth account with `profiles.role='customer'` by default. Can read/update own profile, read own bookings, add their own pending booking and food details, read their booking snapshots/status history, and access account/bookings/tracking UI. Cancellation request UI expects extra DB support absent from this repository. No customer edit/delete booking policy or feature is present.
- **Admin:** profile role is manually promoted by trusted owner using SQL. UI calls `requireAdmin`; RLS also gates management operations. Can manage packages, categories, foods, package rules/default links, services, alternatives, availability and settings via DB policies; actual admin pages implement only a subset. Admin can read all bookings and update statuses; can read/manage data under policies.

The `protect_profile_role` trigger prevents non-admin role changes via profile updates. Admin promotion is not self-service. `is_admin()` is SECURITY DEFINER with a fixed search path. Frontend gates are convenience only; DB RLS is the security boundary.

## 4. Page and feature inventory

| Page | Audience | Verified source behavior and inputs | Data/action/result |
|---|---|---|---|
| Home (`index.html`) | Public | Brand intro, hero, featured first three active packages | Reads `packages`; links to packages/booking |
| Packages (`packages.html`) | Public | Active package cards with image, name, description, min guest threshold, PHP/person price | Reads active `packages`; link passes package UUID to booking |
| Register (`register.html`) | Public | Email, password (min 8 chars), full name; Supabase signup with name metadata | Auth creates user; SQL trigger creates customer profile; confirmation may be enabled |
| Login (`login.html`) | Public | Email/password; forgot password prompts for email | Supabase sign-in/reset email; login redirects home |
| Booking (`booking.html`) | Customer after sign-in to submit | Package, suggested/custom menu mode; food selections grouped by configured category; event name/type/date/time/venue, guest count, contact name/email/phone, notes and special-food request | Reads packages, categories, available foods, default package dishes and package-category rules; inserts booking then item snapshots; redirects to tracking by ref |
| Track (`track-booking.html`) | Intended public/customer; effective DB access customer/admin only | Enter reference; displays event, package, chosen dishes, price breakdown, status timeline and cancellation-request controls | Queries booking by reference, package, snapshots, cancellation request table; no anonymous RLS path in supplied SQL |
| Account (`account.html`) | Customer | Profile details and booking summary (inspect exact account rendering in source) | Reads/updates profile and summarizes bookings |
| My Bookings (`my-bookings.html`) | Customer | Own bookings list and tracking links | Reads own bookings; reference links into tracking |
| Notifications (`notifications.html`) | Customer | List, unread count, mark read actions; nav badge subscribes to Supabase Realtime | Frontend expects `notifications` table, RLS and Realtime publication not defined by supplied SQL |
| Admin dashboard | Admin | Counts bookings/pending/approved-confirmed/customers and upcoming events | Reads bookings/profiles |
| Admin bookings | Admin | Search ref/customer/event, status filter, up to 150 rows; dropdown directly updates status | Reads/updates bookings; trigger writes status history |
| Admin packages | Admin | Package create/list plus category selection constraints/default dish setup (see page logic) | `packages`, categories, `package_categories`, `package_food_items`; not full lifecycle verified |
| Admin food management | Admin | Food/category listing and create/edit/availability controls (see page logic) | `food_items`, categories; no complete category/alternatives workflow established |
| Admin cancellation requests | Admin | Lists requests, joins booking/customer, approves/rejects via RPC | Depends on missing request table and `review_booking_cancellation_request` RPC |
| Admin reports | Admin | Date-filtered booking list, estimated value sum, CSV export | Reads booking rows; value is estimate, not collected revenue |
| Admin settings | Admin | Instructions/link to Supabase dashboard, no working settings editor | Settings rows exist but admin page is informational only |

### 4.1 Booking rules and validations actually present

- HTML `required` validation for form fields; email input type; event date minimum set client-side to browser current date; guest count minimum 1 in HTML.
- Before submit, frontend checks package minimum guests and that each required category has exactly its configured number of selections.
- Menu selection UI blocks exceeding a category selection limit on checkbox interaction. Optional categories are not enforced as exact picks.
- Database checks positive guest count, nonnegative prices, arithmetic consistency (`final = base + extras`, `total = per-person * guests`), non-past date, active package/minimum guests, blocked availability and a booking with the same exact date/time in approved/confirmed status.
- Booking status defaults to `pending`; status history trigger records initial and changed status with actor/note.
- Booking reference is generated in the browser using timestamp base36 (`JM-...`); uniqueness constraint can reject collision but there is no retry.
- Selected food snapshots preserve item/category names and price for later display; database does not validate that submitted snapshot set/prices equal current allowed food records.
- Booking row and selected-food rows are separate inserts; detail insert failure leaves a booking without details.
- Special food request is stored as text and shown as subject to approval; it is not priced or a structured dietary/allergen declaration.
- Time conflict test is exact start-time only. `availability.end_time` is used only for blocked intervals. Event duration, venue, capacity, setup buffers, and concurrent transaction locking are absent.

### 4.2 Status lifecycle

Enum values: `pending`, `under_review`, `approved`, `confirmed`, `rejected`, `cancelled`, `completed`. Customer submission sets `pending`. Admin dropdown allows direct transition to any enum value without transition rules. UI timeline groups `pending` and `under_review`, `approved` and `confirmed`, then `completed`; `rejected` and `cancelled` show a terminal message. SQL logs each change but does not constrain legal transitions. Cancellation request approval is intended to invoke an RPC but its body is absent. No payment status exists.

## 5. Data model and relationships

| Table | Purpose and key relationships |
|---|---|
| `profiles` | Auth user 1:1; name/phone/role/timestamps |
| `packages` | Package catalogue; unique name, price/person, minimum guests, active/sort/image |
| `food_categories` | Categorizes menu items |
| `food_items` | Menu entry -> category; per-person extra price, availability |
| `package_categories` | Package-category selection rules, limit and required flag; unique pair |
| `package_food_items` | Many-to-many package-food association and default-selection flag |
| `food_alternatives` | Directed food-item alternative relation; no UI support found |
| `additional_services` | Service catalogue with flat/per-person price; not connected to booking UI |
| `bookings` | Customer/package/event details, price snapshots, special requests, status |
| `booking_food_items` | Booking -> selected dish snapshots; live food reference nullable for historical retention |
| `booking_services` | Booking service snapshots; no booking UI usage found |
| `booking_status_history` | Trigger-written status events, actor, note; customer/admin can read per booking |
| `availability` | Date/time blocks; admin managed; public select policy despite label text “admin read” |
| `business_settings` | JSON values keyed by string; seed has booking rules and public contact |

Relationships: profile 1:N bookings; package 1:N bookings; package N:M categories via rules; package N:M dishes via inclusion; food category 1:N dishes; booking 1:N food snapshots/services/status history. Cascades remove dependent rules/details when package/food/booking is deleted; booking package/customer deletion restricted.

Indexes explicitly created on bookings customer/date/status, food item category and booking food booking ID. No explicit indexes for booking reference (unique index exists), package association lookup columns beyond PK/unique indexes, availability date, or history lookups.

## 6. Architecture and integration flow

Browser loads one of the thin HTML entry files and shared `src/main.js`; module selects a page from pathname and dynamically builds its DOM. `supabase.js` creates browser client only when Vite environment variables are present. Calls go directly from browser to Supabase Auth/PostgREST/Realtime. SQL owns schema, triggers and RLS. No separate API/server layer or server-side booking transaction exists. Static deploy is intended (`dist/` on Netlify/Vercel/Cloudflare Pages).

External integrations present: Supabase Auth, Postgres, Realtime (notification badge code), Google Fonts, Unsplash. No payment gateway, outbound mail service beyond Supabase Auth messages, SMS, calendar, maps, analytics or CRM integration was detected.

## 7. UI/UX assessment

- **Visual system:** warm cream/off-white background, dark ink, forest green, sage, muted gold; DM Sans body and Playfair Display headings; mostly square cards, thin borders, restrained editorial catering aesthetic.
- **Navigation:** sticky top bar, public/customer profile dropdown and separate admin nav; admin nav has many links and can wrap on small screens. Customer role has notification bell and account links.
- **Content patterns:** package cards, bordered panels, booking step labels, sticky estimate card on desktop, tables with horizontal overflow, toast-like fixed notices and status timeline.
- **Responsive behavior:** CSS breakpoints at 800px and 560px; hero and booking grid stack, cards/food grid become single column, nav wraps. It is responsive at CSS level; no real device or accessibility run was performed. No mobile nav collapse; dense admin navigation/table workflows are likely awkward on phones.
- **Usability/accessibility observations:** much of DOM is string-built; labels are generally present for form fields, but status/notice announcements, focus management, keyboard dropdown behavior, contrast, image alternative text, error summaries, loading/empty states and accessible table semantics need a formal pass. Some icon uses emoji. Currency locale is PHP with en-PH formatting, while README doesn’t establish business locale requirement.
- **Recommendations:** preserve green/cream/gold identity; create shared components/tokens; simplify customer booking into a clear progress flow with persistent estimate and validation; visibly label estimate vs confirmed quote; add package inclusion comparison; strengthen mobile admin filtering and booking detail layout; provide accessible status badges/announcements, field-level errors and focus handling; add loading skeletons and recoverable errors consistently.

## 8. Technical audit and prioritized recommendations

### Critical — before real bookings/deployment

1. **Authoritative booking RPC and atomic writes.** Current browser calculates submitted price and inserts parent/detail rows separately. A client can alter values and food item IDs/snapshots/prices; SQL arithmetic checks only internal consistency. Implement one authenticated transaction/RPC that validates active package, category rules, selected available/allowed items, minimum guests, current server-side prices and conflict rules, writes booking plus snapshots, and generates an unpredictable reference. This prevents incorrect quotes and orphan bookings.
2. **Make installation schema match UI.** Add migrations/schema/policies for `notifications`, `booking_cancellation_requests`, and the called review RPC, or remove those UI paths until supported. As checked in, the supplied SQL sequence cannot support these calls.
3. **Define safe tracking access.** Reference lookup currently has no anonymous RLS access, while exposing public booking details solely by guessable ref would be unsafe. Require customer auth or implement an opaque, high-entropy, narrowly scoped tracking token/RPC with field minimization and rate limiting.
4. **Enforce booking state and ownership invariants server-side.** Restrict status transitions, prevent customers modifying protected profile fields (including role at trigger layer), validate event fields and booking edits, and ensure cancellation approvals atomically update both request and booking with audit history. Current admin status selector permits any transition.
5. **Production security / RLS audit.** Test each policy with anon, customer A, customer B and admin; constrain public data (notably public availability rows and broad public read rules on package-food/rules/alternatives); add authorization for any added table/RPC; rate-limit auth/booking submission and protect against spam. Do not put service-role credentials in frontend.

### High priority

1. Add proper scheduling model: event duration, capacity, setup/cleanup buffers, venue/resource constraints, timezone, overlapping intervals and concurrency-safe booking reservation. Exact-time checks permit overlaps and races.
2. Add payment lifecycle only if business needs online payment: gateway integration, server-verified webhook, payment/refund records and explicit distinction of estimate, quote, deposit and paid revenue. No payments are currently implemented.
3. Implement cancellation lifecycle/policy, customer booking amendments, full status history display, decision notes, and durable notification/email delivery. Realtime alone is not a notification delivery system.
4. Complete admin CRUD and validation for package rules/defaults, categories, alternatives, additional services, availability and business settings; enforce required selection counts in UI and server. Existing admin management is partial.
5. Add server-side validation for event minimum advance days from seeded `booking_rules`; currently seed says 3 but client/database do not enforce it. Validate phone, lengths, guest caps, event type, timestamps/timezone and special requests.
6. Improve reliability: collision-resistant reference generation/retry, idempotency for submission, pagination, query limits, consistent error handling, logging/monitoring, automated backups and recovery procedures.
7. Add automated unit/integration/end-to-end, RLS and accessibility tests; test fresh SQL install and production build route availability.

### Medium priority

1. Split the 1,900+ line shared `main.js` into page modules, data services, validation and reusable UI components; define typed contracts/schema migration strategy.
2. Add database constraints/indexes for common query paths (status history booking/time, availability date/ranges, relevant join foreign keys), and inspect query plans with realistic volume.
3. Fix Vite multi-page inputs: account, my-bookings, notifications, cancellation-requests (and possibly other root pages) are omitted from explicit Rollup inputs. Verify whether direct build/deploy URLs are emitted; add all intended entry pages or move to a router.
4. Escape/validate user-supplied search filter syntax and handle all Supabase errors; avoid silently using empty data on query failure. Review inline HTML generation and image URL policy.
5. Use server/business timezone consistently rather than browser ISO date for minimum date/dashboard, and document PHP currency/locale.
6. Improve accessibility and mobile admin navigation/table controls; add empty/error/loading states consistently.

### Optional enhancements

- Dish/package imagery with managed storage and image moderation; no uploads currently, only URLs.
- Package comparison, menu alternatives, dietary/allergen metadata, service add-ons and customer quote PDFs.
- Analytics for booking conversion, popular packages/dishes, cancellation rate and realized revenue after payment data exists.
- Calendar export/integration, maps/venue autocomplete, multilingual support, loyalty or promo codes.

## 9. AppDeploy implementation brief

### Product goal
Recreate JMFoodies as a polished, mobile-friendly catering booking system, preserving verified core behavior and correcting gaps. Treat the existing source and this document as reference; do not assume features marked missing are already functional. Build incrementally, with a real schema/migration and automated checks.

### Required roles
1. Visitor: browse active packages and public menu information; register/sign in.
2. Customer: manage own profile, create booking requests, inspect own bookings and their status/history, submit cancellation request according to policy.
3. Admin: review/update bookings, manage catalogue/rules/availability/settings, review cancellations, view operational reports.

### Required customer workflow
1. Browse package options with inclusion, per-person base price and minimum guests.
2. Authenticate/register before booking submission.
3. Select package; show required/optional menu categories and defaults; enforce category selection bounds and show dish upgrades.
4. Enter event/contact details and special instructions; enforce configurable advance booking, guest minimum and availability.
5. Show explicitly provisional estimate and terms; submit through server-authoritative atomic operation.
6. Return an opaque reference and booking detail page; allow authenticated customer access, show timeline and immutable selected-item/price snapshots.
7. Admin review follows explicit allowed state transitions; customer sees updates via in-app/email notifications.
8. Customer requests cancellation; admin approves/rejects with note; approval updates booking and sends notification atomically.
9. Completion is recorded separately from payment; do not label estimates as revenue.

### Requirements / acceptance criteria
- All page and role access is enforced server-side, with least-privilege RLS and documented policy tests.
- Booking price, package status, minimum guests, item status/category/eligibility, selection rules, availability and reference are validated inside a transaction on trusted backend/database.
- Booking plus line items are atomic and immutable price/name snapshots remain readable if catalogue changes.
- Status transition matrix is explicit and audited (suggested: pending→under_review/approved/rejected; under_review→approved/rejected; approved→confirmed/cancelled; confirmed→completed/cancelled; terminal rejected/cancelled/completed; admin override must be audited). Final matrix requires business confirmation.
- Scheduling checks interval overlaps, capacity and buffers under concurrency; all dates/times use configured business timezone.
- Notification/cancellation features have actual schema, RLS, server handlers and retry-safe delivery; realtime is an optional UI enhancement.
- Admin CRUD covers packages, category rules/default menu, dishes, alternatives, services, availability and settings; destructive changes preserve historical snapshots.
- Reports distinguish requested/approved/completed bookings and estimated vs collected amounts; CSV safely escapes values.
- Responsive and keyboard-accessible flows, semantic labels, announced errors/status, suitable contrast and test evidence.
- Automated build, schema migration, critical workflow, authorization/RLS, validation and mobile/accessibility checks pass before release.

### Suggested phased delivery
1. **Foundation:** schema/migrations, role policies, auth, common UI system, page routing.
2. **Catalogue/admin:** package/menu/category/rule management and public browsing.
3. **Booking core:** authoritative booking RPC, schedule validation, snapshots, status lifecycle and customer history.
4. **Operations:** cancellation, notifications, settings, reports, audit logs.
5. **Hardening:** security/RLS review, tests, performance/accessibility, backups/monitoring, staging verification.
6. **Deployment:** configured environment, migration runbook, auth redirect domains, smoke checks, rollback plan.

### Explicit non-goals until separately specified
- Payment collection, refunds, taxes, delivery/logistics, staffing/inventory, multi-branch tenancy. The repository does not demonstrate these business requirements. Do not invent amounts, policies or legal terms.

## 10. Open business decisions for later implementation
- Confirm operational country/currency (UI formats PHP), timezone, minimum lead time and operating hours.
- Define event duration, concurrent capacity, setup buffers, locations/service radius and blackout process.
- Confirm whether reference tracking must work without login and what fields may be public.
- Approve legal status transition matrix, cancellation cutoffs/fees and quote validity.
- Decide whether online deposits/payments, taxes, discounts, delivery fees or service add-ons are required.
- Decide email/SMS provider and required notification events.
- Confirm dietary/allergen model and whether special food requests require structured review.

## 11. Source evidence index

- `README.md`: stated setup, implementation limitations, deployment and production checklist.
- `package.json`, `vite.config.js`: libraries, commands and explicit build input list.
- `src/main.js`: routes/pages, booking, customer/admin actions, UI and Supabase query references.
- `src/supabase.js`: browser Supabase client and auth session settings.
- `src/styles.css`: design tokens, layouts and breakpoints.
- `database/01_schema.sql`: enums, 14 tables, constraints, initial indexes.
- `database/02_functions.sql`: profile trigger, role guard, status logging and booking constraint trigger.
- `database/03_policies.sql`: RLS policies.
- `database/04_seed.sql`: sample packages/categories/foods/settings.

### Verification notes / limitations
- No changes to application source, database or configuration were made.
- No build, runtime, browser, SQL execution, live Supabase, security test or automated test was run. The user requested reverse engineering first; code modifications were not authorized by the request.
- The README itself labels the implementation a functional foundation and calls out missing authoritative pricing, alternatives UI, incomplete admin CRUD and limited scheduling. This specification adds source cross-checks and identifies missing SQL dependencies.
