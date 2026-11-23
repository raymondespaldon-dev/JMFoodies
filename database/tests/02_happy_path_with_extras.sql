-- 02: happy path where selected dishes carry extra per-person charges.
do $$
declare
  v_uid uuid := 'a0000000-0000-4000-8000-000000000002';
  v_pkg uuid := 'b0000000-0000-4000-8000-000000000002';
  v_cat1 uuid := 'c0000000-0000-4000-8000-000000000002';
  v_cat2 uuid := 'c0000000-0000-4000-8000-000000000012';
  v_food1 uuid := 'd0000000-0000-4000-8000-000000000002';
  v_food2 uuid := 'd0000000-0000-4000-8000-000000000012';
  v_result jsonb;
  v_booking_id uuid;
  v_item_count integer;
  v_stored_extra numeric(10,2);
  v_stored_total numeric(12,2);
  v_expected_extra numeric(10,2) := 30.00 + 80.00;
  v_expected_final numeric(10,2) := 300.00 + 30.00 + 80.00;
begin
  insert into auth.users (id, email) values (v_uid, 'slice3-test-02@example.com')
    on conflict (id) do nothing;
  insert into public.profiles (id, full_name) values (v_uid, 'Slice 3 Test Customer')
    on conflict (id) do nothing;
  insert into public.food_categories (id, name) values
    (v_cat1, 'Slice3 Test Chicken 02'),
    (v_cat2, 'Slice3 Test Seafood 02')
    on conflict (id) do nothing;
  insert into public.food_items (id, category_id, name, extra_price, is_available) values
    (v_food1, v_cat1, 'Slice3 Test Chicken Dish 02', 30.00, true),
    (v_food2, v_cat2, 'Slice3 Test Shrimp Dish 02', 80.00, true)
    on conflict (id) do nothing;
  insert into public.packages (id, name, price_per_person, minimum_guests, is_active)
    values (v_pkg, 'Slice3 Test Package 02', 300, 30, true)
    on conflict (id) do nothing;
  insert into public.package_categories (package_id, category_id, selection_limit, is_required) values
    (v_pkg, v_cat1, 1, true),
    (v_pkg, v_cat2, 1, true)
    on conflict (package_id, category_id) do nothing;

  perform set_config('request.jwt.claims',
    json_build_object('sub', v_uid, 'role', 'authenticated')::text, true);

  v_result := public.create_booking(jsonb_build_object(
    'package_id', v_pkg,
    'full_name', 'Juan Dela Cruz',
    'email', 'juan@example.com',
    'phone', '+63 918 555 0101',
    'event_name', 'Family Reunion',
    'event_type', 'Reunion',
    'event_date', date '2099-06-02',
    'event_time', '11:30',
    'venue', '45 Katipunan Avenue',
    'guest_count', 35,
    'selected_food_item_ids', jsonb_build_array(v_food1::text, v_food2::text)
  ));

  if (v_result->>'extra_price_per_person')::numeric <> v_expected_extra then
    raise exception 'ASSERTION_FAILED: extra_price_per_person % != sum of extras %',
      v_result->>'extra_price_per_person', v_expected_extra;
  end if;
  if (v_result->>'final_price_per_person')::numeric <> v_expected_final then
    raise exception 'ASSERTION_FAILED: final_price_per_person % != base + extras %',
      v_result->>'final_price_per_person', v_expected_final;
  end if;

  v_booking_id := (v_result->>'booking_id')::uuid;
  select extra_price_per_person, estimated_total
    into v_stored_extra, v_stored_total
    from public.bookings where id = v_booking_id;
  if v_stored_extra <> v_expected_extra then
    raise exception 'ASSERTION_FAILED: stored extra % != expected %', v_stored_extra, v_expected_extra;
  end if;
  if v_stored_total <> v_expected_final * 35 then
    raise exception 'ASSERTION_FAILED: stored total % != (base + extras) * guests %',
      v_stored_total, v_expected_final * 35;
  end if;

  select count(*) into v_item_count from public.booking_food_items where booking_id = v_booking_id;
  if v_item_count <> 2 then
    raise exception 'ASSERTION_FAILED: expected 2 booking_food_items rows, got %', v_item_count;
  end if;
end $$;
