do $$
declare
  v_uid uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  v_pkg uuid;
  v_cat uuid;
  v_food uuid;
  v_extra numeric(10,2);
  v_base numeric(10,2);
  v_guests integer := 40;
  v_result jsonb;
  v_booking_id uuid;
begin
  insert into auth.users (id, email) values (v_uid, 'test@example.com') on conflict (id) do nothing;
  insert into public.profiles (id, full_name, role) values (v_uid, 'Test Customer', 'customer') on conflict (id) do nothing;

  select id, price_per_person into v_pkg, v_base from public.packages where name = 'Standard Package';
  update public.packages set is_active = true where id = v_pkg;

  select id into v_cat from public.food_categories where name = 'Seafood';
  insert into public.package_categories (package_id, category_id, selection_limit, is_required)
  values (v_pkg, v_cat, 1, true)
  on conflict (package_id, category_id) do update set selection_limit = 1, is_required = true;

  select id, extra_price into v_food, v_extra from public.food_items where category_id = v_cat and extra_price > 0 and is_available = true limit 1;
  if v_food is null then
    insert into public.food_items (category_id, name, extra_price, is_available)
    values (v_cat, 'Extra Shrimp', 80, true) returning id, extra_price into v_food, v_extra;
  end if;

  perform set_config('request.jwt.claims', json_build_object('sub', v_uid, 'role', 'authenticated')::text, true);

  v_result := public.create_booking(jsonb_build_object(
    'package_id', v_pkg,
    'full_name', 'Maria Santos',
    'email', 'maria@example.com',
    'phone', '+63 917 123 4567',
    'event_name', 'Chloe Birthday',
    'event_type', 'Birthday',
    'event_date', (current_date + interval '3 days')::date,
    'event_time', '15:00',
    'venue', '123 Balete Drive',
    'guest_count', v_guests,
    'selected_food_item_ids', jsonb_build_array(v_food::text)
  ));

  v_booking_id := (v_result->>'booking_id')::uuid;
  if (v_result->>'extra_price_per_person')::numeric <> v_extra then
    raise exception 'Assertion failed: extra_price_per_person % != %', v_result->>'extra_price_per_person', v_extra;
  end if;
  if (v_result->>'estimated_total')::numeric <> (v_base + v_extra) * v_guests then
    raise exception 'Assertion failed: estimated_total mismatch';
  end if;
end $$;