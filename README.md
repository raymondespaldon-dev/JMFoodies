# JMFoodies Catering Booking System

A Vite + vanilla JavaScript + Supabase starter implementation for the JMFoodies catering workflow. It includes a public package catalogue, authenticated customer booking flow, menu selection and per-person estimate, booking tracking by reference, and protected admin pages for bookings, packages, menu items and reports.

> **Honest implementation note:** this is a functional foundation, not a fully production-certified catering platform. Before taking live payments or relying on it for real bookings, review the security and database notes below and complete the verification checklist. In particular, the browser calculates the estimate for display; the current SQL constraints validate arithmetic consistency but do not yet recompute package/menu pricing from authoritative rows in a database-side booking RPC. Add that server-side validation before production use.

## Requirements
- Node.js 20+ and npm
- Visual Studio Code
- A Supabase project

## Run locally
1. Extract the ZIP and open `catering-booking-system` in VS Code.
2. In the terminal run `npm install`.
3. Copy `.env.example` to `.env`.
4. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` using your Supabase project's Project URL and publishable/anon key.
5. In Supabase SQL Editor run scripts in this order:
   - `database/01_schema.sql`
   - `database/02_functions.sql`
   - `database/03_policies.sql`
   - `database/04_seed.sql`
6. In the terminal run `npm run dev` and open the local URL shown by Vite (normally http://localhost:5173).

## Supabase Auth
1. In Authentication → Providers, enable Email.
2. For local testing, configure the Site URL and redirect URLs to include `http://localhost:5173/**`.
3. Customers register at `/register.html`. If email confirmation is enabled, confirm the email before signing in.
4. To create the first administrator, register a normal account, confirm it, then run this SQL in the Supabase SQL Editor, replacing the email:
   ```sql
   update public.profiles p
   set role = 'admin'
   from auth.users u
   where p.id = u.id and u.email = 'admin@example.com';
   ```
   Only a trusted project owner should execute this. Do not expose service-role credentials. There is intentionally no public admin registration.

## Database setup notes
- The SQL scripts create profiles, packages, categories, food items, package/category rules, default menu links, alternatives, bookings, booking item snapshots, status history, availability and settings.
- RLS is enabled on every app table.
- Menu changes do not change the item-name and price snapshots already stored in booking details.
- Add package/category rules in Supabase after seeding. A package is not selectable in the booking flow until its categories and selection limits have been configured.
- `package_food_items` associates included/default dishes with packages. `package_categories.selection_limit` defines each category's maximum number of picks.
- The current customer UI supports package selection, category-based menu selection, a special request field and price estimate. Alternatives are represented in the database but the visual alternative-comparison UI is not yet wired.
- Availability blocks are checked by a trigger, and approved/confirmed bookings at the same date/time are checked. This is a basic exact-time conflict check, not a full duration/venue capacity scheduler.
- Customers must sign in before submitting. Booking tracking by reference currently returns limited event/estimate details; RLS still restricts the underlying booking query to the authenticated customer or admin.

## Storage
This implementation accepts image URLs, so Supabase Storage is optional. If you want uploads, create a public bucket named `menu-images`, set allowed MIME types to image/jpeg, image/png and image/webp, and implement upload policies before adding upload controls. Do not allow arbitrary executable file types.

## Environment variables
`.env` is read by Vite. Only the Supabase project URL and publishable/anon key belong in frontend environment variables. Never put the `service_role` key in `.env` for this browser app or commit `.env` to source control.

## Admin pages
- `/admin/dashboard.html`
- `/admin/bookings.html`
- `/admin/packages.html`
- `/admin/food-management.html`
- `/admin/reports.html`
- `/admin/settings.html`

Admin access is checked against `profiles.role='admin'` and reinforced by RLS. Do not rely on the frontend check alone.

## Build
```bash
npm run build
npm run preview
```

Deploy the generated `dist/` folder to a static host such as Netlify, Vercel or Cloudflare Pages. Set the same two Vite environment variables in the host's build settings. Add the deployed domain to Supabase Auth redirect URLs.

## Before production
- Implement database-side authoritative price and package/menu rule validation in a single transaction/RPC. Do not trust client-submitted prices.
- Add server-side checks that selected food items are active, belong to an allowed category, satisfy required category counts and do not exceed limits.
- Add alternative recommendation UI using `food_alternatives` and package inclusion data.
- Implement full create/edit/deactivate workflows for packages, menu items, categories, alternatives, services and settings; current admin UI covers basic create/list for packages and food, plus booking status updates.
- Implement customer booking edit/cancel flow and full status history display.
- Add date/time duration and capacity-aware scheduling, cancellation policy enforcement, spam protection, rate limiting and audit logging.
- Review every RLS policy with test customer and admin accounts. In particular, consider using a secure RPC for booking submission and tracking.
- Add automated tests (unit, integration and end-to-end), accessibility checks, backup strategy and monitoring.
