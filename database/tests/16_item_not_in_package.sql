-- 16: a dish from a category the package does not configure raises
-- FOOD_ITEM_NOT_IN_PACKAGE.
do $$
declare
  v_uid uuid := 'a0000000-0000-4000-8000-000000000016';
  v_pkg uuid := 'b0000000-0000-4000-8000-000000000016';
  v_cat_ok uuid := 'c0000000-0000-4000-8000-000000000016';
  v_cat_foreign uuid := 'c0000000-0000-4000-8000-000000000026';
  v_food_ok uuid := 'd0000000-0000-4000-8000-000000000016';
  v_food_foreign uuid := 'd0000000-0000-4000-8000-000000000026';
begin
  insert into auth.users (id, email) values (v_uid, 'slice3-test-16@example.com')
    on conflict (id) do nothing;
  insert into public.profiles (id, full_name) values (v_uid, 'Slice 3 Test Customer')
    on conflict (id) do nothing;
  insert into public.food_categories (id, name) values
    (v_cat_ok, 'Slice3 Test Category 16'),
    (v_cat_foreign, 'Slice3 Test Foreign Category 16')
    on conflict (id) do nothing;
  insert into public.food_items (id, category_id, name, extra_price, is_available) values
    (v_food_ok, v_cat_ok, 'Slice3 Test Dish 16', 0, true),
    (v_food_foreign, v_cat_foreign, 'Slice3 Test Foreign Dish 16', 0, true)
    on conflict (id) do nothing;
  insert into public.packages (id, name, price_per_person, minimum_guests, is_active)
    values (v_pkg, 'Slice3 Test Package 16', 350, 40, true)
    on conflict (id) do nothing;
  -- Only the first category is configured for this package.
  insert into public.package_categories (package_id, category_id, selection_limit, is_required)
    values (v_pkg, v_cat_ok, 1, true)
    on conflict (package_id, category_id) do nothing;

  perform set_config('request.jwt.claims',
    json_build_object('sub', v_uid, 'role', 'authenticated')::text, true);

  begin
    perform public.create_booking(jsonb_build_object(
      'package_id', v_pkg,
      'full_name', 'Maria Santos',
      'email', 'maria@example.com',
      'phone', '+63 917 123 4567',
      'event_name', 'Foreign Dish Event',
      'event_type', 'Birthday',
      'event_date', date '2099-06-16',
      'event_time', '10:00',
      'venue', '123 Balete Drive',
      'guest_count', 40,
      'selected_food_item_ids', jsonb_build_array(v_food_ok::text, v_food_foreign::text)
    ));
    raise exception 'ASSERTION_FAILED: create_booking accepted a dish from an unconfigured category';
  exception when others then
    if sqlerrm like 'ASSERTION_FAILED:%' then
      raise;
    end if;
    if sqlstate <> 'P0024' then
      raise exception 'ASSERTION_FAILED: expected SQLSTATE P0024, got % (%)', sqlstate, sqlerrm;
    end if;
    if sqlerrm not like 'FOOD_ITEM_NOT_IN_PACKAGE:%' then
      raise exception 'ASSERTION_FAILED: expected FOOD_ITEM_NOT_IN_PACKAGE, got %', sqlerrm;
    end if;
  end;
end $$;
