-- 15: duplicate food IDs are deduplicated, not rejected, and priced once.
do $$
declare
  v_uid uuid := 'a0000000-0000-4000-8000-000000000015';
  v_pkg uuid := 'b0000000-0000-4000-8000-000000000015';
  v_cat uuid := 'c0000000-0000-4000-8000-000000000015';
  v_food uuid := 'd0000000-0000-4000-8000-000000000015';
  v_result jsonb;
  v_booking_id uuid;
  v_item_count integer;
  v_stored_extra numeric(10,2);
  v_stored_total numeric(12,2);
begin
  insert into auth.users (id, email) values (v_uid, 'slice3-test-15@example.com')
    on conflict (id) do nothing;
  insert into public.profiles (id, full_name) values (v_uid, 'Slice 3 Test Customer')
    on conflict (id) do nothing;
  insert into public.food_categories (id, name) values (v_cat, 'Slice3 Test Category 15')
    on conflict (id) do nothing;
  insert into public.food_items (id, category_id, name, extra_price, is_available)
    values (v_food, v_cat, 'Slice3 Test Dish 15', 25.00, true)
    on conflict (id) do nothing;
  insert into public.packages (id, name, price_per_person, minimum_guests, is_active)
    values (v_pkg, 'Slice3 Test Package 15', 300, 40, true)
    on conflict (id) do nothing;
  insert into public.package_categories (package_id, category_id, selection_limit, is_required)
    values (v_pkg, v_cat, 1, true)
    on conflict (package_id, category_id) do nothing;

  perform set_config('request.jwt.claims',
    json_build_object('sub', v_uid, 'role', 'authenticated')::text, true);

  v_result := public.create_booking(jsonb_build_object(
    'package_id', v_pkg,
    'full_name', 'Maria Santos',
    'email', 'maria@example.com',
    'phone', '+63 917 123 4567',
    'event_name', 'Duplicate Selection Event',
    'event_type', 'Birthday',
    'event_date', date '2099-06-15',
    'event_time', '10:00',
    'venue', '123 Balete Drive',
    'guest_count', 40,
    'selected_food_item_ids',
      jsonb_build_array(v_food::text, v_food::text, v_food::text)
  ));

  v_booking_id := (v_result->>'booking_id')::uuid;

  select count(*) into v_item_count from public.booking_food_items where booking_id = v_booking_id;
  if v_item_count <> 1 then
    raise exception 'ASSERTION_FAILED: expected the dish once, got % row(s)', v_item_count;
  end if;

  select extra_price_per_person, estimated_total
    into v_stored_extra, v_stored_total
    from public.bookings where id = v_booking_id;
  if v_stored_extra <> 25.00 then
    raise exception 'ASSERTION_FAILED: extra counted more than once: %', v_stored_extra;
  end if;
  if v_stored_total <> (300.00 + 25.00) * 40 then
    raise exception 'ASSERTION_FAILED: total reflects duplicates: %', v_stored_total;
  end if;
  if (v_result->>'extra_price_per_person')::numeric <> 25.00 then
    raise exception 'ASSERTION_FAILED: returned extra reflects duplicates: %',
      v_result->>'extra_price_per_person';
  end if;
end $$;
