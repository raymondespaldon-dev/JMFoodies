do $$
declare
  v_uid uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  v_pkg uuid;
  v_event_date date := (current_date + interval '3 days')::date;
begin
  insert into auth.users (id, email) values (v_uid, 'test@example.com') on conflict (id) do nothing;
  insert into public.profiles (id, full_name, role) values (v_uid, 'Test Customer', 'customer') on conflict (id) do nothing;

  select id into v_pkg from public.packages where name = 'Standard Package';
  update public.packages set is_active = true where id = v_pkg;

  insert into public.availability (event_date, start_time, end_time, is_blocked, note)
  values (v_event_date, null, null, true, 'blocked for test');

  perform set_config('request.jwt.claims', json_build_object('sub', v_uid, 'role', 'authenticated')::text, true);

  begin
    perform public.create_booking(jsonb_build_object(
      'package_id', v_pkg,
      'full_name', 'Maria Santos',
      'email', 'maria@example.com',
      'phone', '+63 917 123 4567',
      'event_name', 'Chloe Birthday',
      'event_type', 'Birthday',
      'event_date', v_event_date,
      'event_time', '14:00',
      'venue', '123 Balete Drive',
      'guest_count', 40,
      'selected_food_item_ids', '[]'::jsonb
    ));
    raise exception 'Assertion failed: blocked availability should raise';
  exception when others then
    if sqlstate <> 'P0004' or position('TIME_SLOT_UNAVAILABLE:' in sqlerrm) = 0 then
      raise;
    end if;
  end;
end $$;