-- 03c: the caller's identity is bound from auth.uid(); payload customer_id is ignored.
-- @sub a0000000-0000-4000-8000-000000000003
do $$
declare
  v_uid uuid := 'a0000000-0000-4000-8000-000000000003';
  v_other uuid := 'a0000000-0000-4000-8000-000000000033';
  v_pkg uuid := 'b0000000-0000-4000-8000-000000000003';
  v_cat uuid := 'c0000000-0000-4000-8000-000000000003';
  v_food uuid := 'd0000000-0000-4000-8000-000000000003';
  v_result jsonb;
  v_booking_id uuid;
  v_stored_customer uuid;
begin
  insert into auth.users (id, email) values (v_uid, 'slice3-test-03@example.com')
    on conflict (id) do nothing;
  insert into public.profiles (id, full_name) values (v_uid, 'Slice 3 Test Customer')
    on conflict (id) do nothing;
  insert into public.food_categories (id, name) values (v_cat, 'Slice3 Test Category 03')
    on conflict (id) do nothing;
  insert into public.food_items (id, category_id, name, extra_price, is_available)
    values (v_food, v_cat, 'Slice3 Test Dish 03', 0, true)
    on conflict (id) do nothing;
  insert into public.packages (id, name, price_per_person, minimum_guests, is_active)
    values (v_pkg, 'Slice3 Test Package 03', 350, 40, true)
    on conflict (id) do nothing;
  insert into public.package_categories (package_id, category_id, selection_limit, is_required)
    values (v_pkg, v_cat, 1, true)
    on conflict (package_id, category_id) do nothing;

  v_result := public.create_booking(jsonb_build_object(
    'package_id', v_pkg,
    'customer_id', v_other,
    'full_name', 'Maria Santos',
    'email', 'maria@example.com',
    'phone', '+63 917 123 4567',
    'event_name', 'Identity Binding Event',
    'event_type', 'Birthday',
    'event_date', date '2099-06-03',
    'event_time', '12:00',
    'venue', '123 Balete Drive',
    'guest_count', 40,
    'selected_food_item_ids', jsonb_build_array(v_food::text)
  ));

  v_booking_id := (v_result->>'booking_id')::uuid;
  select customer_id into v_stored_customer from public.bookings where id = v_booking_id;
  if v_stored_customer <> v_uid then
    raise exception 'ASSERTION_FAILED: stored customer_id % != auth.uid() %',
      v_stored_customer, v_uid;
  end if;
  if v_stored_customer = v_other then
    raise exception 'ASSERTION_FAILED: payload customer_id override was accepted';
  end if;
end $$;
