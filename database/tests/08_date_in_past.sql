-- 08: an event date before current_date raises EVENT_DATE_PAST.
do $$
declare
  v_uid uuid := 'a0000000-0000-4000-8000-000000000008';
  v_pkg uuid := 'b0000000-0000-4000-8000-000000000008';
  v_cat uuid := 'c0000000-0000-4000-8000-000000000008';
  v_food uuid := 'd0000000-0000-4000-8000-000000000008';
begin
  insert into auth.users (id, email) values (v_uid, 'slice3-test-08@example.com')
    on conflict (id) do nothing;
  insert into public.profiles (id, full_name) values (v_uid, 'Slice 3 Test Customer')
    on conflict (id) do nothing;
  insert into public.food_categories (id, name) values (v_cat, 'Slice3 Test Category 08')
    on conflict (id) do nothing;
  insert into public.food_items (id, category_id, name, extra_price, is_available)
    values (v_food, v_cat, 'Slice3 Test Dish 08', 0, true)
    on conflict (id) do nothing;
  insert into public.packages (id, name, price_per_person, minimum_guests, is_active)
    values (v_pkg, 'Slice3 Test Package 08', 350, 40, true)
    on conflict (id) do nothing;
  insert into public.package_categories (package_id, category_id, selection_limit, is_required)
    values (v_pkg, v_cat, 1, true)
    on conflict (package_id, category_id) do nothing;

  perform set_config('request.jwt.claims',
    json_build_object('sub', v_uid, 'role', 'authenticated')::text, true);

  begin
    perform public.create_booking(jsonb_build_object(
      'package_id', v_pkg,
      'full_name', 'Maria Santos',
      'email', 'maria@example.com',
      'phone', '+63 917 123 4567',
      'event_name', 'Past Event',
      'event_type', 'Birthday',
      'event_date', current_date - 1,
      'event_time', '10:00',
      'venue', '123 Balete Drive',
      'guest_count', 40,
      'selected_food_item_ids', jsonb_build_array(v_food::text)
    ));
    raise exception 'ASSERTION_FAILED: create_booking accepted a past event date';
  exception when others then
    if sqlerrm like 'ASSERTION_FAILED:%' then
      raise;
    end if;
    if sqlstate <> 'P0002' then
      raise exception 'ASSERTION_FAILED: expected SQLSTATE P0002, got % (%)', sqlstate, sqlerrm;
    end if;
    if sqlerrm not like 'EVENT_DATE_PAST:%' then
      raise exception 'ASSERTION_FAILED: expected EVENT_DATE_PAST, got %', sqlerrm;
    end if;
  end;
end $$;
