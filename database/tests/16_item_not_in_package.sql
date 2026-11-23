do $$
declare
  v_uid uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  v_pkg uuid;
  v_cat uuid;
  v_food uuid;
begin
  insert into auth.users (id, email) values (v_uid, 'test@example.com') on conflict (id) do nothing;
  insert into public.profiles (id, full_name, role) values (v_uid, 'Test Customer', 'customer') on conflict (id) do nothing;

  select id into v_pkg from public.packages where name = 'Standard Package';
  update public.packages set is_active = true where id = v_pkg;
  select id into v_cat from public.food_categories where name = 'Chicken Dishes';
  insert into public.package_categories (package_id, category_id, selection_limit, is_required)
  values (v_pkg, v_cat, 1, true)
  on conflict (package_id, category_id) do update set selection_limit = 1, is_required = true;

  select id into v_food from public.food_items
  where category_id = (select id from public.food_categories where name = 'Desserts')
    and is_available = true limit 1;
  if v_food is null then
    raise exception 'Seed food item missing for test';
  end if;

  perform set_config('request.jwt.claims', json_build_object('sub', v_uid, 'role', 'authenticated')::text, true);

  begin
    perform public.create_booking(jsonb_build_object(
      'package_id', v_pkg,
      'full_name', 'Maria Santos',
      'email', 'maria@example.com',
      'phone', '+63 917 123 4567',
      'event_name', 'Chloe Birthday',
      'event_type', 'Birthday',
      'event_date', (current_date + interval '3 days')::date,
      'event_time', '20:00',
      'venue', '123 Balete Drive',
      'guest_count', 40,
      'selected_food_item_ids', jsonb_build_array(v_food::text)
    ));
    raise exception 'Assertion failed: foreign item should raise';
  exception when others then
    if sqlstate <> 'P0024' or position('FOOD_ITEM_NOT_IN_PACKAGE:' in sqlerrm) = 0 then
      raise;
    end if;
  end;
end $$;