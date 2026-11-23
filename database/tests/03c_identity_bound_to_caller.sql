do $$
declare
  v_uid_a uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  v_uid_b uuid := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  v_pkg uuid;
  v_cat uuid;
  v_food uuid;
  v_result jsonb;
  v_booking_id uuid;
  v_customer_id uuid;
begin
  insert into auth.users (id, email) values (v_uid_a, 'a@example.com') on conflict (id) do nothing;
  insert into public.profiles (id, full_name, role) values (v_uid_a, 'Customer A', 'customer') on conflict (id) do nothing;

  select id into v_pkg from public.packages where name = 'Standard Package';
  update public.packages set is_active = true where id = v_pkg;
  select id into v_cat from public.food_categories where name = 'Chicken Dishes';
  insert into public.package_categories (package_id, category_id, selection_limit, is_required)
  values (v_pkg, v_cat, 1, true)
  on conflict (package_id, category_id) do update set selection_limit = 1, is_required = true;
  select id into v_food from public.food_items where category_id = v_cat and is_available = true limit 1;
  if v_food is null then
    insert into public.food_items (category_id, name, extra_price, is_available)
    values (v_cat, 'Test Chicken', 0, true) returning id into v_food;
  end if;

  perform set_config('request.jwt.claims', json_build_object('sub', v_uid_a, 'role', 'authenticated')::text, true);

  v_result := public.create_booking(jsonb_build_object(
    'package_id', v_pkg,
    'customer_id', v_uid_b,
    'full_name', 'Maria Santos',
    'email', 'maria@example.com',
    'phone', '+63 917 123 4567',
    'event_name', 'Chloe Birthday',
    'event_type', 'Birthday',
    'event_date', (current_date + interval '3 days')::date,
    'event_time', '16:00',
    'venue', '123 Balete Drive',
    'guest_count', 40,
    'selected_food_item_ids', jsonb_build_array(v_food::text)
  ));

  v_booking_id := (v_result->>'booking_id')::uuid;
  select customer_id into v_customer_id from public.bookings where id = v_booking_id;
  if v_customer_id <> v_uid_a then
    raise exception 'Assertion failed: customer_id % != %', v_customer_id, v_uid_a;
  end if;
end $$;