do $$
declare
  v_uid uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  v_pkg uuid;
begin
  insert into auth.users (id, email) values (v_uid, 'test@example.com') on conflict (id) do nothing;
  insert into public.profiles (id, full_name, role) values (v_uid, 'Test Customer', 'customer') on conflict (id) do nothing;
  select id into v_pkg from public.packages where name = 'Standard Package';

  perform set_config('request.jwt.claims', json_build_object('sub', v_uid, 'role', 'authenticated')::text, true);

  -- missing full_name
  begin
    perform public.create_booking(jsonb_build_object(
      'package_id', v_pkg,
      'email', 'maria@example.com',
      'phone', '+63 917 123 4567',
      'event_name', 'Chloe Birthday',
      'event_type', 'Birthday',
      'event_date', (current_date + interval '3 days')::date,
      'event_time', '14:00',
      'venue', '123 Balete Drive',
      'guest_count', 40,
      'selected_food_item_ids', '[]'::jsonb
    ));
    raise exception 'Assertion failed: missing full_name should raise';
  exception when others then
    if sqlstate <> 'P0001' or position('MISSING_REQUIRED_FIELDS:' in sqlerrm) = 0 then
      raise;
    end if;
  end;

  -- missing venue
  begin
    perform public.create_booking(jsonb_build_object(
      'package_id', v_pkg,
      'full_name', 'Maria Santos',
      'email', 'maria@example.com',
      'phone', '+63 917 123 4567',
      'event_name', 'Chloe Birthday',
      'event_type', 'Birthday',
      'event_date', (current_date + interval '3 days')::date,
      'event_time', '14:00',
      'guest_count', 40,
      'selected_food_item_ids', '[]'::jsonb
    ));
    raise exception 'Assertion failed: missing venue should raise';
  exception when others then
    if sqlstate <> 'P0001' or position('MISSING_REQUIRED_FIELDS:' in sqlerrm) = 0 then
      raise;
    end if;
  end;
end $$;