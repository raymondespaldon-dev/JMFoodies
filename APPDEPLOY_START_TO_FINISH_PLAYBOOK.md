# JMFoodies Catering Booking System — AppDeploy Start-to-Finish Playbook

This playbook breaks the AppDeploy work into small checkpoints to reduce avoidable rebuilds, prevent invented requirements, and preserve the existing catering system’s verified behavior.

**Companion document:** [`PROJECT_REVERSE_ENGINEERING.md`](./PROJECT_REVERSE_ENGINEERING.md) is the source-grounded master specification. Attach it whenever a new AppDeploy conversation needs project context. The source-code repository is the evidence for existing behavior; the specification is the readable map.

**Current AppDeploy compatibility finding:** The provided AppDeploy assessment says Vite, vanilla JavaScript, and Supabase Auth/Postgres/RLS are compatible. AppDeploy’s deployment setup also offers an `html-static` template using Vite and vanilla JS. However, its current deployment instructions require Vite 8-compatible projects, while this repo declares Vite 7. The likely path is to keep the same framework and backend and make a Vite version compatibility update if required. Have AppDeploy reconcile that before implementation; do not switch to React, Next.js, or another backend without your approval. Compatibility has not been verified by a real build/deployment.

## How to use this playbook

- Work through the parts in order. Do not paste every part into AppDeploy at once.
- Use one AppDeploy conversation for this project if practical. If you start a new one, attach the master spec, relevant source files and the last handoff note.
- The first part asks for a review only. Do not spend build/deploy quota until requirements and implementation scope are clear.
- Quota behavior and the cost of review prompts are not established here. Check AppDeploy’s displayed account/credit status before a build. A short review is intended to avoid expensive implementation rework, but cannot guarantee that it is free.
- Save AppDeploy’s answers and note the completed part at the end of this file or in a separate handoff note.
- Do not include `.env`, Supabase service-role keys, passwords, live customer data, `node_modules`, `dist`, or `.git` when sharing source. Include `.env.example` only if useful; never substitute real credentials into it.
- The prompts below request review or implementation in limited scope. When AppDeploy offers a generated change/deployment, review its plan/diff and result before continuing.

## Part 0 — Prepare a clean handoff

**Goal:** Give AppDeploy the smallest sufficient, safe source package and context.

Checklist:

- [ ] Have `PROJECT_REVERSE_ENGINEERING.md` ready to attach.
- [ ] Prepare the project source (`src/`, `database/`, `admin/`, root HTML pages, `package.json`, `package-lock.json`, `vite.config.js`, `README.md`, `.env.example`).
- [ ] Exclude `.env`, credentials, user/customer records, `node_modules/`, `dist/`, and `.git/`.
- [ ] Attach the supplied AppDeploy assessment text if the interface allows it, or paste its key conclusion: stack supported; build not run; Vite 7 build compatibility unverified; missing build inputs include account, my-bookings, notifications and admin cancellation page.
- [ ] Do not create a new app yet.

**Carry-forward rule:** The documentation contains source findings, not authorization to implement every feature. Features marked missing/unverified remain unapproved until the relevant later part.

## Part 1 — One concise requirements and compatibility review

**Goal:** Confirm shared understanding before spending implementation effort.

Paste this with the master spec, clean source files and AppDeploy assessment attached:

> **Review only. Do not create, edit, or deploy an app.**
>
> Read the attached JMFoodies Catering Booking System master specification and source files, plus the AppDeploy compatibility assessment.
>
> In one concise response:
> 1. Summarize the verified current customer/admin workflows and the most important implementation gaps.
> 2. Confirm that you can use Vite, vanilla JavaScript, Supabase Auth, Postgres and RLS. Reconcile the assessment’s Vite 7 statement with your current deployment requirement for Vite 8-compatible projects. State the smallest version/configuration change needed, if any. Do not change frontend framework or backend platform.
> 3. Identify which business decisions truly block the first safe implementation slice, and which can remain out of scope for now.
> 4. Propose the smallest sequence of build slices, with a brief scope and completion check for each.
>
> Do not implement, edit files, create an app, or deploy. Do not invent business rules. Do not treat missing/unverified features as working. Distinguish source findings from anything you could not verify.

After the response:

- [ ] Check whether it actually honored review-only scope.
- [ ] Confirm any AppDeploy/version limitation and retain the original stack preference.
- [ ] Decide only the questions needed for Slice 1. Keep payments, SMS, add-ons, advanced dietary handling and anonymous tracking out of scope unless you specifically need them now.
- [ ] If it proposes a frontend or backend migration, stop and ask it to revise without that migration; bring the conflict back here if needed.
- [ ] Save its slice plan and blocker list.

**Do not proceed to a build if it has not confirmed the stack constraints or proposes guessed pricing, cancellation, capacity, payment or status rules.**

## Part 2 — Resolve only decisions that block the first slice

Do not answer every future business question now. For an initial safe release, the likely minimum decisions are:

- [ ] Currency and business timezone (the existing UI formats PHP, but confirm it is intended).
- [ ] Minimum booking notice (seed data says 3 days, while current code does not enforce it; confirm whether 3 days is the real rule).
- [ ] Whether customers must sign in to create and view bookings (existing source requires sign-in for submission; RLS also restricts reads to customer/admin).
- [ ] Which booking states admins may set in the first release (do not accept an unapproved transition matrix).
- [ ] Whether first slice is a development/staging app only or intended to accept real customers.

Can explicitly defer for the first slice: payment/deposits, refunds/taxes, SMS, anonymous booking lookup, full cancellation policy, duration/capacity scheduling, delivery/venue service area, additional services, alternative dish UI, and full notification delivery.

**Decision prompt (only if needed):**

> Based on the current source and specification, list the decisions that block the first slice only. Do not ask me to decide deferred features. For each blocker, state the smallest safe default or explain why no default is safe. Do not implement anything.

Write answers down before moving on. Do not accept a default that changes real business rules without owner confirmation.

## Part 3 — Slice 1: Foundation and safe staging shell

**Goal:** Establish the app shell, source structure, environment setup and page/build routing. Avoid production booking behavior in this slice.

Before authorizing implementation, confirm:

- [ ] The app uses Vite + vanilla JavaScript + Supabase; no React/Next or backend-platform replacement.
- [ ] The Vite version follows AppDeploy’s actual build requirement; keep code/config compatible and explain version changes.
- [ ] All intended HTML entry points are included in the Vite build (assessment flags `account.html`, `my-bookings.html`, `notifications.html` and `admin/cancellation-requests.html`).
- [ ] No real credentials are embedded. Frontend may use only Supabase URL and public anon/publishable key; service-role key must stay out of browser code.
- [ ] Existing working source features are preserved or explicitly listed as deferred; no behavior is silently removed.
- [ ] App is marked staging/development until security and live database checks are complete.

**Slice prompt:**

> Implement **Slice 1 only: project foundation and route/build completeness** for JMFoodies. Use Vite, vanilla JavaScript, Supabase Auth/Postgres/RLS. Keep the existing framework and backend platform. Apply only the Vite version/config change required by AppDeploy and state it clearly. Ensure all existing intended page entry points are part of the build. Preserve current application behavior; do not implement missing cancellation, notification, payment, scheduling, or admin features in this slice. Do not invent business rules or put secrets in frontend source. Keep the app labeled staging. Before making changes, summarize the exact files/scope; then implement only that slice and report changed files plus build/deployment checks.

**Completion gate:** App builds; every intended route has a deployable entry; no unsupported framework migration; source/config change list is understandable. If the build fails, fix Slice 1 before adding features.

## Part 4 — Slice 2: Database baseline, roles and access rules

**Goal:** Make the schema reproducible and verify least-privilege visitor/customer/admin behavior before relying on real booking data.

Scope:

- Versioned, repeatable SQL migrations for tables, functions, triggers, indexes and RLS (avoid a one-off manual-only database state).
- Auth profile creation and safe admin promotion process.
- Explicit access matrix for anon, customer A, customer B and admin.
- RLS tests/checks for each role and table.
- Review public read policies, especially availability and public package/menu relationships.
- Do not add notification/cancellation schema unless its user-visible slice is now approved and fully specified.

**Slice prompt:**

> Implement **Slice 2 only: reproducible Supabase schema and access-control baseline** for the verified JMFoodies features. Keep Supabase and the existing Vite/vanilla frontend. First show the migration plan and a table-by-role access matrix for visitor, customer, and admin. Preserve verified behavior, enforce least privilege, and include checks for a visitor, customer A, customer B, and admin. Do not add guessed notification or cancellation behavior, do not implement payment, and do not weaken RLS to make the UI work. Do not deploy to a live/production Supabase project. Report migration files and how to apply/test them in staging.

**Completion gate:** Fresh staging setup works; role-boundary checks pass; no key leakage; migration and rollback/recovery instructions exist.

## Part 5 — Slice 3: Secure booking and menu submission core

**Goal:** Replace the unsafe multi-request/client-priced write with one authoritative, atomic booking operation while preserving the verified customer journey.

Scope:

- Package/item/selection/minimum-guest validation against authoritative database rows.
- Recalculate estimate on trusted server/database side; store immutable booking and food snapshots atomically.
- Availability validation against only the business rules that have been confirmed. Do not claim duration/capacity scheduling while it remains out of scope.
- Safe reference generation and duplicate-submit protection.
- Require sign-in as in current source.
- Explicitly label the result an estimate/request, not a paid invoice or confirmed reservation.

**Slice prompt:**

> Implement **Slice 3 only: secure customer booking submission** for the existing verified workflow. Keep the current sign-in requirement and the Vite/vanilla/Supabase stack. Move authoritative package, dish eligibility, category limits, minimum-guest and price calculation into a trusted atomic database operation (Supabase Postgres function/RPC or another approved Supabase-native method). Write the booking and its immutable food snapshots in the same transaction. Generate a collision-resistant reference and handle repeat submissions safely. Use only the business rules already confirmed in this conversation; list any unresolved scheduling check rather than inventing one. Preserve the estimate/request wording and do not add payment. Before implementation, state the security model and migration; after, report checks for valid booking, invalid price/item, category limits, ownership, and failed/duplicate submission.

**Completion gate:** No client-controlled price can alter the stored quote; booking plus details are atomic; customer cannot create for another user or read someone else’s booking; clear failure messages; tests/checks pass.

## Part 6 — Slice 4: Customer account, booking list and tracking

**Goal:** Complete the already verified authenticated customer views without accidentally creating public reference-based disclosure.

Scope:

- Profile/account view and own bookings list.
- Authenticated tracking of own booking reference/details, selected dish snapshots, status and estimate.
- Status history display if supported by current schema/policy.
- Do not enable anonymous lookup merely because the page has a reference field. That requires a separately approved secure token/access design.

**Slice prompt:**

> Implement **Slice 4 only: authenticated customer account, own-bookings and tracking views** using the existing stack. Enforce that a signed-in customer can read only their own profile, bookings, snapshots and history; admin access follows current RLS. Keep reference lookup authenticated and scoped to the current customer. Do not expose records to anonymous visitors using a guessable reference. Preserve historical snapshots and clearly label prices as estimates. Do not implement cancellation or notifications in this slice. Include checks for customer A vs customer B, missing reference, and a booking with historical item snapshots.

**Completion gate:** Customer A cannot see customer B’s data; all intended customer routes load in deployed build; reference lookup is not an authorization bypass.

## Part 7 — Slice 5: Admin booking operations and catalogue management

**Goal:** Implement only the admin controls needed to operate the verified core, with explicit authorization and data validation.

Recommended sub-slices if the admin work becomes too large:

- 5A: booking list/search/filter and booking detail.
- 5B: approved status transition controls and audit notes/history.
- 5C: package and dish CRUD plus package-category selection rules/defaults.

Do not add categories, alternatives, services, availability or settings UI unless included in an agreed slice.

**Slice prompt:**

> Implement **Slice 5A only: admin booking review** for the existing system. Require the database-backed admin role, not just a frontend route check. Provide booking search/filter/detail with customer/contact/event information needed by the business, package/menu snapshots, estimate and status history. Do not add a transition rule that has not been approved. Do not expose admin data to customers. Include tests/checks proving customer access is denied and admin access works. Summarize exactly what is read or changed.

For status controls later:

> Implement **Slice 5B only: admin status updates**. Before coding, present the proposed allowed transition matrix and wait for my explicit approval of that matrix. Do not ship arbitrary direct status selection or infer cancellation approval rules. Once I approve, enforce the same transitions in the database operation, log actor/time/note, and verify forbidden transitions are rejected.

**Completion gate:** Admin permission enforced by RLS/backend; updates audited; customer data remains isolated; only approved controls are available.

## Part 8 — Slice 6: Explicitly chosen operational features

Do each item only if the business confirms it. Keep independent features as separate AppDeploy tasks.

### Cancellation
Requires policy (eligible states, cutoff, fee/refund effect, admin decision and final status). Then implement request schema, RLS, atomic review operation, audit note and customer/admin screens. Don’t treat cancellation request as instant cancellation.

### Notifications
Choose channels and events first (in-app, email, SMS). Implement persistent notification records, ownership policies and delivery/retry behavior. Realtime badge is not a substitute for durable delivery.

### Scheduling
Confirm timezone, lead time, duration, capacity, buffers, locations and blackout behavior. Then implement overlap-safe transactional checks; exact-time conflict checks are insufficient for duration-based events.

### Payment
Only if required. Choose provider, currency, deposit/full-payment rules, taxes/refunds and webhook model. Keep secret keys backend-only. Do not label estimates as revenue.

### Other catalogue operations
Add alternative foods, add-on services, image uploads or dietary/allergen data only after defining workflows and ownership. Existing DB tables alone do not mean these features are ready.

**Prompt template for one approved feature:**

> Implement **one approved feature only: [FEATURE]**. The approved business rules are: [PASTE THE CONFIRMED RULES]. Use the existing Vite/vanilla/Supabase stack. Keep all authorization server/database-enforced. Do not implement adjacent unapproved features. First list schema, UI, security and failure-path changes; then implement and report focused checks, migration/release steps, and known limitations.

## Part 9 — Slice 7: Reports, mobile usability and accessibility

**Goal:** Improve presentation and operational reporting without changing core business rules.

Tasks:

- Clearly distinguish requests, approved/confirmed events, completed events, estimates and (only if introduced) collected payments.
- Ensure CSV output safely escapes values and reports have useful date/status filters.
- Make admin navigation, dense tables and booking details work on mobile.
- Keyboard test forms/dropdowns; add visible focus, accessible labels/status announcements, field errors, contrast and semantic table headings.
- Preserve the existing warm green/cream/gold visual character unless the owner asks for a rebrand.

**Prompt:**

> Implement **Slice 7 only: responsive and accessible UX improvements plus report accuracy**. Preserve all verified workflows and business rules. Do not add new product features. Keep estimates labeled as estimates and do not call them revenue. Improve mobile admin navigation/tables and keyboard/screen-reader feedback. Identify the changes, then run the relevant responsive/accessibility and CSV/report checks.

## Part 10 — Slice 8: Release verification and deployment

Do not accept “deployed” as equivalent to “safe for real bookings.” Use a staging release first.

Pre-release checklist:

- [ ] Production build succeeds with all intended routes.
- [ ] Fresh database migrations apply in order and recovery/rollback is documented.
- [ ] Supabase URL + public key are configured for the correct environment; service-role key never reaches frontend.
- [ ] Auth email confirmation, password reset and redirect URLs work on staging domain.
- [ ] RLS matrix passes for anonymous visitor, two different customers and admin.
- [ ] Booking atomicity, authoritative price, selection constraints and scheduling checks pass.
- [ ] Status updates and any approved cancellation/notification paths pass end-to-end checks.
- [ ] Mobile viewport, keyboard navigation, validation errors and empty/error states are reviewed.
- [ ] Backups, monitoring, rate limiting/spam controls and support/incident contact are in place for real use.
- [ ] Owner confirms business policies and approves switching from staging to production.

**Release prompt:**

> Prepare a **staging verification and release-readiness report only** for the current JMFoodies build. Do not change business rules or deploy to production. Verify the build, routes, schema/migration instructions, environment configuration, role/RLS boundaries, critical booking workflow, approved status paths, mobile and accessibility checks. List pass/fail evidence, unresolved risks, and the exact steps the owner must complete before production. Do not describe unverified checks as passed.

After the staging report, fix critical/high issues in separate focused tasks. Only deploy to the production Supabase/project after the owner approves the concrete release candidate and environment settings.

## Part 11 — Handoff notes between slices

At the end of every AppDeploy slice, save this information before continuing:

```text
Project: JMFoodies Catering Booking System
Completed slice:
AppDeploy app ID / URL (if created):
Stack and Vite version:
Files changed:
Database migrations added/applied:
Tests/checks run and results:
Open issues:
Business decisions still pending:
Next authorized slice:
```

In a new conversation, attach the master specification and source (if needed), paste the latest handoff note, and request only the next slice. Never repeat the entire original build request as a new broad prompt.

## Suggested progress tracker

- [ ] Part 0 — clean source package ready
- [ ] Part 1 — requirements/compatibility review complete
- [ ] Part 2 — first-slice decisions recorded
- [ ] Part 3 — foundation/routes/build complete
- [ ] Part 4 — schema/RLS baseline checked
- [ ] Part 5 — secure atomic booking core checked
- [ ] Part 6 — customer account/booking/tracking checked
- [ ] Part 7 — admin operations checked
- [ ] Part 8 — only approved optional operational features built
- [ ] Part 9 — responsive/accessibility/report improvements checked
- [ ] Part 10 — staging release checklist passed and owner approves production
- [ ] Part 11 — handoff note saved for any continuation

## Evidence and limitations

This playbook is based on the repository’s static source review, `PROJECT_REVERSE_ENGINEERING.md`, and the provided AppDeploy compatibility assessment. No live Supabase project, AppDeploy build, staging deployment, quota pricing, or production environment was verified here. AppDeploy’s current deployment rule for Vite 8 compatibility should be reconciled with the assessment before the first build. This plan deliberately separates verified behavior from missing/unverified features and leaves business rules to the owner.
