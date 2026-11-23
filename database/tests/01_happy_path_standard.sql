-- 01: happy path with a standard package and base inclusions.
do $$
declare
  v_uid uuid := 'a0000000-0000-4000-8000-000000000001';
  v_pkg uuid := 'b0000000-0000-4000-8000-000000000001';
  v_cat uuid := 'c0000000-0000-4000-8000-000000000001';
  v_food uuid := 'd0000000-0000-4000-8000-000000000001';
  v_result jsonb;
  v_booking_id uuid;
  v_item_count integer;
  v_stored_total numeric(12,2);
begin
  insert into auth.users (id, email) values (v_uid, 'slice3-test-01@example.com')
    on conflict (id) do nothing;
  insert into public.profiles (id, full_name) values (v_uid, 'Slice 3 Test Customer')
    on conflict (id) do nothing;
  insert into public.food_categories (id, name) values (v_cat, 'Slice3 Test Category 01')
    on conflict (id) do nothing;
  insert into public.food_items (id, category_id, name, extra_price, is_available)
    values (v_food, v_cat, 'Slice3 Test Dish 01', 0, true)
    on conflict (id) do nothing;
  insert into public.packages (id, name, price_per_person, minimum_guests, is_active)
    values (v_pkg, 'Slice3 Test Package 01', 350, 40, true)
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
    'event_name', 'Chloe 7th Birthday',
    'event_type', 'Birthday',
    'event_date', date '2099-06-01',
    'event_time', '10:00',
    'venue', '123 Balete Drive, Quezon City',
    'guest_count', 50,
    'menu_mode', 'custom',
    'selected_food_item_ids', jsonb_build_array(v_food::text)
  ));

  if v_result->>'booking_reference' not like 'JM-%' then
    raise exception 'ASSERTION_FAILED: booking_reference must start with JM-, got %',
      v_result->>'booking_reference';
  end if;
  if length(v_result->>'booking_reference') <> 11 then
    raise exception 'ASSERTION_FAILED: booking_reference must be JM- plus 8 chars, got %',
      v_result->>'booking_reference';
  end if;
  if v_result->>'status' <> 'pending' then
    raise exception 'ASSERTION_FAILED: status must be pending, got %', v_result->>'status';
  end if;

  v_booking_id := (v_result->>'booking_id')::uuid;
  select estimated_total into v_stored_total from public.bookings where id = v_booking_id;
  if v_stored_total <> 350.00 * 50 then
    raise exception 'ASSERTION_FAILED: stored total % != base * guests (17500.00)', v_stored_total;
  end if;
  if (v_result->>'estimated_total')::numeric <> v_stored_total then
    raise exception 'ASSERTION_FAILED: returned total % != stored total %',
      v_result->>'estimated_total', v_stored_total;
  end if;
  if (v_result->>'base_price_per_person')::numeric <> 350.00 then
    raise exception 'ASSERTION_FAILED: base_price_per_person must be 350.00';
  end if;
  if (v_result->>'extra_price_per_person')::numeric <> 0.00 then
    raise exception 'ASSERTION_FAILED: extra_price_per_person must be 0.00';
  end if;
  if (v_result->>'final_price_per_person')::numeric <> 350.00 then
    raise exception 'ASSERTION_FAILED: final_price_per_person must be 350.00';
  end if;

  select count(*) into v_item_count from public.booking_food_items where booking_id = v_booking_id;
  if v_item_count <> 1 then
    raise exception 'ASSERTION_FAILED: expected 1 booking_food_items row, got %', v_item_count;
  end if;
end $$;
