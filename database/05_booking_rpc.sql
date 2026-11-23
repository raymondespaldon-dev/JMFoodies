-- Slice 3: authoritative, atomic booking creation RPC.
-- Contract: SLICE_3_SPEC.md §2. The database is the sole price authority and
-- the booking plus its menu snapshots are written in one transaction.

create or replace function public.create_booking(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_customer_id uuid;

  v_package_id uuid;
  v_full_name text;
  v_email text;
  v_phone text;
  v_event_name text;
  v_event_type text;
  v_event_date date;
  v_event_time time;
  v_venue text;
  v_guest_count integer;
  v_menu_mode text;
  v_selected uuid[];
  v_special_requests text;
  v_special_food_request text;

  v_pkg_base_price numeric(10,2);
  v_pkg_min_guests integer;
  v_pkg_is_active boolean;

  v_extra_price numeric(10,2);
  v_final_price numeric(10,2);
  v_estimated_total numeric(12,2);

  v_pc record;
  v_count integer;
  v_attempt integer;
  v_inserted boolean;
  v_booking_ref text;
  v_booking_id uuid;
  v_created_at timestamptz;
begin
  -- 2.1 Hard identity binding. Anonymous execution is prohibited.
  v_customer_id := auth.uid();
  if v_customer_id is null then
    raise exception using errcode = '42501',
      message = 'UNAUTHENTICATED: Please sign in or create an account before submitting your booking.';
  end if;

  if payload is null or jsonb_typeof(payload) <> 'object' then
    raise exception using errcode = 'P0001',
      message = 'MISSING_REQUIRED_FIELDS: A booking payload object is required.';
  end if;

  -- 2.2 package_id
  if not (payload ? 'package_id') or nullif(trim(payload->>'package_id'), '') is null then
    raise exception using errcode = 'P0001',
      message = 'MISSING_REQUIRED_FIELDS: package_id is required.';
  end if;
  begin
    v_package_id := (payload->>'package_id')::uuid;
  exception when others then
    raise exception using errcode = 'P0001',
      message = 'MISSING_REQUIRED_FIELDS: package_id must be a valid UUID.';
  end;

  -- 2.2 full_name
  v_full_name := nullif(trim(coalesce(payload->>'full_name', '')), '');
  if v_full_name is null then
    raise exception using errcode = 'P0001',
      message = 'MISSING_REQUIRED_FIELDS: full_name is required.';
  end if;
  if length(v_full_name) > 200 then
    raise exception using errcode = 'P0001',
      message = 'MISSING_REQUIRED_FIELDS: full_name must be at most 200 characters.';
  end if;

  -- 2.2 email
  v_email := nullif(trim(coalesce(payload->>'email', '')), '');
  if v_email is null then
    raise exception using errcode = 'P0001',
      message = 'MISSING_REQUIRED_FIELDS: email is required.';
  end if;
  if v_email !~ '^.+@.+\..+$' then
    raise exception using errcode = 'P0001',
      message = 'MISSING_REQUIRED_FIELDS: email must be a valid address.';
  end if;
  if length(v_email) > 255 then
    raise exception using errcode = 'P0001',
      message = 'MISSING_REQUIRED_FIELDS: email must be at most 255 characters.';
  end if;

  -- 2.2 phone
  v_phone := nullif(trim(coalesce(payload->>'phone', '')), '');
  if v_phone is null then
    raise exception using errcode = 'P0001',
      message = 'MISSING_REQUIRED_FIELDS: phone is required.';
  end if;
  if length(v_phone) < 7 or length(v_phone) > 50 then
    raise exception using errcode = 'P0001',
      message = 'MISSING_REQUIRED_FIELDS: phone must be between 7 and 50 characters.';
  end if;

  -- 2.2 event_name
  v_event_name := nullif(trim(coalesce(payload->>'event_name', '')), '');
  if v_event_name is null then
    raise exception using errcode = 'P0001',
      message = 'MISSING_REQUIRED_FIELDS: event_name is required.';
  end if;
  if length(v_event_name) > 255 then
    raise exception using errcode = 'P0001',
      message = 'MISSING_REQUIRED_FIELDS: event_name must be at most 255 characters.';
  end if;

  -- 2.2 event_type
  v_event_type := nullif(trim(coalesce(payload->>'event_type', '')), '');
  if v_event_type is null then
    raise exception using errcode = 'P0001',
      message = 'MISSING_REQUIRED_FIELDS: event_type is required.';
  end if;
  if length(v_event_type) > 100 then
    raise exception using errcode = 'P0001',
      message = 'MISSING_REQUIRED_FIELDS: event_type must be at most 100 characters.';
  end if;

  -- 2.2 event_date
  if not (payload ? 'event_date') or nullif(trim(payload->>'event_date'), '') is null then
    raise exception using errcode = 'P0001',
      message = 'MISSING_REQUIRED_FIELDS: event_date is required.';
  end if;
  begin
    v_event_date := (payload->>'event_date')::date;
  exception when others then
    raise exception using errcode = 'P0001',
      message = 'MISSING_REQUIRED_FIELDS: event_date must be a valid date.';
  end;

  -- 2.2 event_time
  if not (payload ? 'event_time') or nullif(trim(payload->>'event_time'), '') is null then
    raise exception using errcode = 'P0001',
      message = 'MISSING_REQUIRED_FIELDS: event_time is required.';
  end if;
  begin
    v_event_time := (payload->>'event_time')::time;
  exception when others then
    raise exception using errcode = 'P0001',
      message = 'MISSING_REQUIRED_FIELDS: event_time must be a valid time.';
  end;

  -- 2.2 venue
  v_venue := nullif(trim(coalesce(payload->>'venue', '')), '');
  if v_venue is null then
    raise exception using errcode = 'P0001',
      message = 'MISSING_REQUIRED_FIELDS: venue is required.';
  end if;
  if length(v_venue) > 500 then
    raise exception using errcode = 'P0001',
      message = 'MISSING_REQUIRED_FIELDS: venue must be at most 500 characters.';
  end if;

  -- 2.2 guest_count
  if not (payload ? 'guest_count') or nullif(trim(payload->>'guest_count'), '') is null then
    raise exception using errcode = 'P0001',
      message = 'MISSING_REQUIRED_FIELDS: guest_count is required.';
  end if;
  begin
    v_guest_count := (payload->>'guest_count')::integer;
  exception when others then
    raise exception using errcode = 'P0001',
      message = 'MISSING_REQUIRED_FIELDS: guest_count must be a whole number.';
  end;
  if v_guest_count is null or v_guest_count <= 0 then
    raise exception using errcode = 'P0001',
      message = 'MISSING_REQUIRED_FIELDS: guest_count must be greater than zero.';
  end if;

  -- 2.2 menu_mode (display metadata only; defaults to custom)
  v_menu_mode := coalesce(nullif(trim(coalesce(payload->>'menu_mode', '')), ''), 'custom');
  if v_menu_mode not in ('suggested', 'custom') then
    raise exception using errcode = 'P0001',
      message = 'MISSING_REQUIRED_FIELDS: menu_mode must be suggested or custom.';
  end if;

  -- 2.2 selected_food_item_ids. Duplicates are removed, never rejected (§2.3 step 3).
  if not (payload ? 'selected_food_item_ids') then
    raise exception using errcode = 'P0001',
      message = 'MISSING_REQUIRED_FIELDS: selected_food_item_ids is required.';
  end if;
  if jsonb_typeof(payload->'selected_food_item_ids') <> 'array' then
    raise exception using errcode = 'P0001',
      message = 'MISSING_REQUIRED_FIELDS: selected_food_item_ids must be an array.';
  end if;
  begin
    select coalesce(array_agg(distinct t.elem::uuid), '{}'::uuid[])
      into v_selected
      from jsonb_array_elements_text(payload->'selected_food_item_ids') as t(elem);
  exception when others then
    raise exception using errcode = 'P0001',
      message = 'MISSING_REQUIRED_FIELDS: selected_food_item_ids must contain only UUIDs.';
  end;

  -- 2.2 optional notes
  v_special_requests := nullif(trim(coalesce(payload->>'special_requests', '')), '');
  if v_special_requests is not null and length(v_special_requests) > 2000 then
    raise exception using errcode = 'P0001',
      message = 'MISSING_REQUIRED_FIELDS: special_requests must be at most 2000 characters.';
  end if;
  v_special_food_request := nullif(trim(coalesce(payload->>'special_food_request', '')), '');
  if v_special_food_request is not null and length(v_special_food_request) > 2000 then
    raise exception using errcode = 'P0001',
      message = 'MISSING_REQUIRED_FIELDS: special_food_request must be at most 2000 characters.';
  end if;

  -- 2.3 step 1: package lookup (active state is reported separately from existence).
  select price_per_person, minimum_guests, is_active
    into v_pkg_base_price, v_pkg_min_guests, v_pkg_is_active
    from public.packages
    where id = v_package_id;

  if not found then
    raise exception using errcode = 'P0010',
      message = 'INVALID_PACKAGE: The selected package does not exist. Please re-select a package.';
  end if;
  if not v_pkg_is_active then
    raise exception using errcode = 'P0011',
      message = 'PACKAGE_INACTIVE: The selected package is currently unavailable. Please choose another package.';
  end if;

  -- 2.3 step 2: guest minimum.
  if v_guest_count < v_pkg_min_guests then
    raise exception using errcode = 'P0012',
      message = 'GUESTS_BELOW_MINIMUM: This package requires at least ' || v_pkg_min_guests || ' guests.';
  end if;

  -- 2.3 step 3: every selected item must exist and be available.
  if (select count(*) from public.food_items where id = any(v_selected))
      <> coalesce(cardinality(v_selected), 0) then
    raise exception using errcode = 'P0020',
      message = 'INVALID_FOOD_SELECTION: One or more selected dishes could not be found. Please refresh your menu choices.';
  end if;

  if exists (
    select 1 from public.food_items
    where id = any(v_selected) and is_available = false
  ) then
    raise exception using errcode = 'P0021',
      message = 'FOOD_ITEM_UNAVAILABLE: One or more selected dishes are currently unavailable. Please adjust your menu.';
  end if;

  -- 2.3 step 4: per-category selection limits and required-category exactness.
  for v_pc in
    select pc.category_id, pc.selection_limit, pc.is_required, c.name as category_name
      from public.package_categories pc
      join public.food_categories c on c.id = pc.category_id
      where pc.package_id = v_package_id
  loop
    select count(*) into v_count
      from unnest(v_selected) as s(item_id)
      join public.food_items f on f.id = s.item_id
      where f.category_id = v_pc.category_id;

    if v_count > v_pc.selection_limit then
      raise exception using errcode = 'P0022',
        message = 'MENU_SELECTION_LIMIT_EXCEEDED: You selected more items than allowed for category: ' || v_pc.category_name || '.';
    end if;
    if v_pc.is_required and v_count <> v_pc.selection_limit then
      raise exception using errcode = 'P0023',
        message = 'MENU_REQUIRED_CATEGORY_MISMATCH: Please select exactly ' || v_pc.selection_limit || ' item(s) for ' || v_pc.category_name || '.';
    end if;
  end loop;

  -- 2.3 step 4a: every selected item must belong to a configured category.
  if exists (
    select 1
      from unnest(v_selected) as s(item_id)
      join public.food_items f on f.id = s.item_id
      where not exists (
        select 1 from public.package_categories pc
        where pc.package_id = v_package_id and pc.category_id = f.category_id
      )
  ) then
    raise exception using errcode = 'P0024',
      message = 'FOOD_ITEM_NOT_IN_PACKAGE: One or more selected dishes are not offered by this package. Please adjust your menu.';
  end if;

  -- 2.4 scheduling: past date, minimum notice, blocked windows, exact-time collision.
  if v_event_date < current_date then
    raise exception using errcode = 'P0002',
      message = 'EVENT_DATE_PAST: Event date cannot be in the past.';
  end if;
  if v_event_date < (current_date + interval '3 days')::date then
    raise exception using errcode = 'P0003',
      message = 'MINIMUM_NOTICE_NOT_MET: Bookings require at least 3 calendar days advance notice.';
  end if;

  if exists (
    select 1 from public.availability a
    where a.event_date = v_event_date
      and a.is_blocked = true
      and (
        a.start_time is null
        or (v_event_time >= a.start_time and (a.end_time is null or v_event_time < a.end_time))
      )
  ) then
    raise exception using errcode = 'P0004',
      message = 'TIME_SLOT_UNAVAILABLE: The selected event date/time is unavailable.';
  end if;

  if exists (
    select 1 from public.bookings b
    where b.event_date = v_event_date
      and b.event_time = v_event_time
      and b.status in ('approved', 'confirmed')
  ) then
    raise exception using errcode = 'P0005',
      message = 'TIME_SLOT_COLLISION: An approved reservation already exists at this exact time.';
  end if;

  -- 2.3 step 5: recompute all prices from the catalog; payload prices are ignored.
  select coalesce(sum(f.extra_price), 0)::numeric(10,2)
    into v_extra_price
    from unnest(v_selected) as s(item_id)
    join public.food_items f on f.id = s.item_id;

  v_final_price := v_pkg_base_price + v_extra_price;
  v_estimated_total := v_final_price * v_guest_count;

  -- 2.5 / 2.6: generate the reference and insert parent + children atomically.
  v_inserted := false;
  for v_attempt in 1..5 loop
    v_booking_ref := 'JM-' || upper(substr(encode(extensions.gen_random_bytes(6), 'hex'), 1, 8));
    begin
      insert into public.bookings (
        customer_id, booking_reference, package_id, full_name, email, phone,
        event_name, event_type, event_date, event_time, venue, guest_count,
        base_price_per_person, extra_price_per_person, final_price_per_person,
        estimated_total, special_requests, special_food_request, menu_mode, status
      ) values (
        v_customer_id, v_booking_ref, v_package_id, v_full_name, v_email, v_phone,
        v_event_name, v_event_type, v_event_date, v_event_time, v_venue, v_guest_count,
        v_pkg_base_price, v_extra_price, v_final_price,
        v_estimated_total, v_special_requests, v_special_food_request, v_menu_mode, 'pending'
      )
      returning id, created_at into v_booking_id, v_created_at;
      v_inserted := true;
    exception when unique_violation then
      v_inserted := false;
      if v_attempt = 5 then
        raise;
      end if;
    end;
    exit when v_inserted;
  end loop;

  insert into public.booking_food_items (
    booking_id, food_item_id, item_name_snapshot, category_name_snapshot, extra_price_snapshot
  )
  select
    v_booking_id, f.id, f.name, c.name, f.extra_price
  from unnest(v_selected) as s(item_id)
  join public.food_items f on f.id = s.item_id
  join public.food_categories c on c.id = f.category_id;

  return jsonb_build_object(
    'booking_id', v_booking_id,
    'booking_reference', v_booking_ref,
    'estimated_total', v_estimated_total,
    'base_price_per_person', v_pkg_base_price,
    'extra_price_per_person', v_extra_price,
    'final_price_per_person', v_final_price,
    'guest_count', v_guest_count,
    'status', 'pending',
    'created_at', v_created_at
  );
end;
$$;

revoke all on function public.create_booking(jsonb) from public, anon;
grant execute on function public.create_booking(jsonb) to authenticated;
