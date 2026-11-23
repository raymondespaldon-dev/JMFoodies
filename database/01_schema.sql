-- JMFoodies catering system schema. Run once in Supabase SQL Editor.
create extension if not exists pgcrypto;
create type public.app_role as enum ('customer','admin');
create type public.booking_status as enum ('pending','under_review','approved','confirmed','rejected','cancelled','completed');

create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 full_name text,
 phone text,
 role public.app_role not null default 'customer',
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create table public.packages (
 id uuid primary key default gen_random_uuid(),
 name text not null unique,
 description text,
 price_per_person numeric(10,2) not null check(price_per_person>=0),
 minimum_guests integer not null default 1 check(minimum_guests>0),
 image_url text,
 is_active boolean not null default true,
 sort_order integer not null default 0,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create table public.food_categories (
 id uuid primary key default gen_random_uuid(),
 name text not null unique,
 sort_order integer not null default 0,
 is_active boolean not null default true,
 created_at timestamptz not null default now()
);
create table public.food_items (
 id uuid primary key default gen_random_uuid(),
 category_id uuid not null references public.food_categories(id) on delete restrict,
 name text not null,
 description text,
 image_url text,
 extra_price numeric(10,2) not null default 0 check(extra_price>=0),
 is_available boolean not null default true,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(category_id,name)
);
create table public.package_categories (
 id uuid primary key default gen_random_uuid(),
 package_id uuid not null references public.packages(id) on delete cascade,
 category_id uuid not null references public.food_categories(id) on delete restrict,
 selection_limit integer not null check(selection_limit>=0),
 is_required boolean not null default true,
 unique(package_id,category_id)
);
create table public.package_food_items (
 package_id uuid not null references public.packages(id) on delete cascade,
 food_item_id uuid not null references public.food_items(id) on delete cascade,
 is_default boolean not null default false,
 primary key(package_id,food_item_id)
);
create table public.food_alternatives (
 food_item_id uuid not null references public.food_items(id) on delete cascade,
 alternative_food_item_id uuid not null references public.food_items(id) on delete cascade,
 created_at timestamptz not null default now(),
 primary key(food_item_id,alternative_food_item_id),
 check(food_item_id<>alternative_food_item_id)
);
create table public.additional_services (
 id uuid primary key default gen_random_uuid(),
 name text not null unique,
 description text,
 price numeric(10,2) not null default 0 check(price>=0),
 pricing_type text not null default 'flat' check(pricing_type in ('flat','per_person')),
 is_active boolean not null default true,
 created_at timestamptz not null default now()
);
create table public.bookings (
 id uuid primary key default gen_random_uuid(),
 customer_id uuid not null references public.profiles(id) on delete restrict,
 booking_reference text not null unique,
 package_id uuid not null references public.packages(id) on delete restrict,
 full_name text not null,
 email text not null,
 phone text not null,
 event_name text not null,
 event_type text not null,
 event_date date not null,
 event_time time not null,
 venue text not null,
 guest_count integer not null check(guest_count>0),
 base_price_per_person numeric(10,2) not null check(base_price_per_person>=0),
 extra_price_per_person numeric(10,2) not null default 0 check(extra_price_per_person>=0),
 final_price_per_person numeric(10,2) not null check(final_price_per_person>=0),
 estimated_total numeric(12,2) not null check(estimated_total>=0),
 special_requests text,
 special_food_request text,
 menu_mode text not null default 'custom' check(menu_mode in ('suggested','custom')),
 status public.booking_status not null default 'pending',
 admin_notes text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 check(event_date>=current_date),
 check(final_price_per_person=base_price_per_person+extra_price_per_person),
 check(estimated_total=final_price_per_person*guest_count)
);
create table public.booking_food_items (
 id uuid primary key default gen_random_uuid(),
 booking_id uuid not null references public.bookings(id) on delete cascade,
 food_item_id uuid references public.food_items(id) on delete set null,
 item_name_snapshot text not null,
 category_name_snapshot text not null default '',
 extra_price_snapshot numeric(10,2) not null default 0 check(extra_price_snapshot>=0),
 created_at timestamptz not null default now()
);
create table public.booking_services (
 id uuid primary key default gen_random_uuid(),
 booking_id uuid not null references public.bookings(id) on delete cascade,
 service_id uuid references public.additional_services(id) on delete set null,
 service_name_snapshot text not null,
 price_snapshot numeric(10,2) not null,
 quantity integer not null default 1 check(quantity>0)
);
create table public.booking_status_history (
 id uuid primary key default gen_random_uuid(),
 booking_id uuid not null references public.bookings(id) on delete cascade,
 old_status public.booking_status,
 new_status public.booking_status not null,
 changed_by uuid references public.profiles(id) on delete set null,
 note text,
 created_at timestamptz not null default now()
);
create table public.availability (
 id uuid primary key default gen_random_uuid(),
 event_date date not null,
 start_time time,
 end_time time,
 is_blocked boolean not null default true,
 note text,
 created_at timestamptz not null default now(),
 check(end_time is null or start_time is null or end_time>start_time)
);
create table public.business_settings (
 key text primary key,
 value jsonb not null default '{}'::jsonb,
 updated_at timestamptz not null default now()
);
create index bookings_customer_idx on public.bookings(customer_id);
create index bookings_event_date_idx on public.bookings(event_date);
create index bookings_status_idx on public.bookings(status);
create index food_items_category_idx on public.food_items(category_id);
create index booking_food_booking_idx on public.booking_food_items(booking_id);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  message text not null,
  type text not null default 'info',
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.booking_cancellation_requests (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  customer_id uuid not null references auth.users(id) on delete cascade,
  reason text not null,
  status text not null default 'pending' check(status in ('pending','approved','rejected')),
  admin_note text,
  created_at timestamptz not null default now()
);

create index notifications_user_idx on public.notifications(user_id);
create index notifications_read_idx on public.notifications(user_id, is_read);
create index cancellation_requests_booking_idx on public.booking_cancellation_requests(booking_id);
create index cancellation_requests_customer_idx on public.booking_cancellation_requests(customer_id);
create index cancellation_requests_status_idx on public.booking_cancellation_requests(status);
