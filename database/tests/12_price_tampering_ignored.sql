-- 12: client-supplied prices are ignored; the server-computed total is stored.
do $$
declare
  v_uid uuid := 'a0000000-0000-4000-8000-000000000012';
  v_pkg uuid := 'b0000000-0000-4000-8000-000000000012';
  v_cat uuid := 'c0000000-0000-4000-8000-000000000012';
  v_food uuid := 'd0000000-0000-4000-8000-000000000012';
  v_guests integer := 40;
  v_base numeric(10,2);
  v_extra numeric(10,2);
  v_expected_total numeric(12,2);
  v_result jsonb;
  v_booking_id uuid;
  v_stored_total numeric(12,2);
  v_stored_extra numeric(10,2);
  v_stored_final numeric(10,2);
begin
  insert into auth.users (id, email) values (v_uid, 'slice3-test-12@example.com')
    on conflict (id) do nothing;
  insert into public.profiles (id, full_name) values (v_uid, 'Slice 3 Test Customer')
    on conflict (id) do nothing;
  insert into public.food_categories (id, name) values (v_cat, 'Slice3 Test Category 12')
    on conflict (id) do nothing;
  insert into public.food_items (id, category_id, name, extra_price, is_available)
    values (v_food, v_cat, 'Slice3 Test Dish 12', 30.00, true)
    on conflict (id) do nothing;
  insert into public.packages (id, name, price_per_person, minimum_guests, is_active)
    values (v_pkg, 'Slice3 Test Package 12', 350, 40, true)
    on conflict (id) do nothing;
  insert into public.package_categories (package_id, category_id, selection_limit, is_required)
    values (v_pkg, v_cat, 1, true)
    on conflict (package_id, category_id) do nothing;

  -- Expected values are computed from the catalog, never hardcoded.
  select p.price_per_person, f.extra_price
    into v_base, v_extra
    from public.packages p, public.food_items f
    where p.id = v_pkg and f.id = v_food;
  v_expected_total := (v_base + v_extra) * v_guests;

  perform set_config('request.jwt.claims',
    json_build_object('sub', v_uid, 'role', 'authenticated')::text, true);

  v_result := public.create_booking(jsonb_build_object(
    'package_id', v_pkg,
    'full_name', 'Maria Santos',
    'email', 'maria@example.com',
    'phone', '+63 917 123 4567',
    'event_name', 'Tampered Price Event',
    'event_type', 'Birthday',
    'event_date', date '2099-06-12',
    'event_time', '10:00',
    'venue', '123 Balete Drive',
    'guest_count', v_guests,
    'selected_food_item_ids', jsonb_build_array(v_food::text),
    'estimated_total', 1.00,
    'final_price_per_person', 0.50,
    'base_price_per_person', 0.10,
    'extra_price_per_person', 0.40
  ));

  v_booking_id := (v_result->>'booking_id')::uuid;
  select estimated_total, extra_price_per_person, final_price_per_person
    into v_stored_total, v_stored_extra, v_stored_final
    from public.bookings where id = v_booking_id;

  if v_stored_total <> v_expected_total then
    raise exception 'ASSERTION_FAILED: stored total % != server-computed %',
      v_stored_total, v_expected_total;
  end if;
  if v_stored_total = 1.00::numeric(12,2) then
    raise exception 'ASSERTION_FAILED: tampered estimated_total was accepted';
  end if;
  if v_stored_extra <> v_extra then
    raise exception 'ASSERTION_FAILED: stored extra % != catalog extra %', v_stored_extra, v_extra;
  end if;
  if v_stored_final <> v_base + v_extra then
    raise exception 'ASSERTION_FAILED: stored final % != base + extras %',
      v_stored_final, v_base + v_extra;
  end if;
  if (v_result->>'estimated_total')::numeric <> v_expected_total then
    raise exception 'ASSERTION_FAILED: returned total % != server-computed %',
      v_result->>'estimated_total', v_expected_total;
  end if;
end $$;
