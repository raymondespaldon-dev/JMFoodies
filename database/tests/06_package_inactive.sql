-- 06: an existing package with is_active = false raises PACKAGE_INACTIVE.
do $$
declare
  v_uid uuid := 'a0000000-0000-4000-8000-000000000006';
  v_pkg uuid := 'b0000000-0000-4000-8000-000000000006';
begin
  insert into auth.users (id, email) values (v_uid, 'slice3-test-06@example.com')
    on conflict (id) do nothing;
  insert into public.profiles (id, full_name) values (v_uid, 'Slice 3 Test Customer')
    on conflict (id) do nothing;
  insert into public.packages (id, name, price_per_person, minimum_guests, is_active)
    values (v_pkg, 'Slice3 Test Package 06', 350, 40, false)
    on conflict (id) do nothing;

  perform set_config('request.jwt.claims',
    json_build_object('sub', v_uid, 'role', 'authenticated')::text, true);

  begin
    perform public.create_booking(jsonb_build_object(
      'package_id', v_pkg,
      'full_name', 'Maria Santos',
      'email', 'maria@example.com',
      'phone', '+63 917 123 4567',
      'event_name', 'Inactive Package Event',
      'event_type', 'Birthday',
      'event_date', date '2099-06-06',
      'event_time', '10:00',
      'venue', '123 Balete Drive',
      'guest_count', 40,
      'selected_food_item_ids', '[]'::jsonb
    ));
    raise exception 'ASSERTION_FAILED: create_booking accepted an inactive package';
  exception when others then
    if sqlerrm like 'ASSERTION_FAILED:%' then
      raise;
    end if;
    if sqlstate <> 'P0011' then
      raise exception 'ASSERTION_FAILED: expected SQLSTATE P0011, got % (%)', sqlstate, sqlerrm;
    end if;
    if sqlerrm not like 'PACKAGE_INACTIVE:%' then
      raise exception 'ASSERTION_FAILED: expected PACKAGE_INACTIVE, got %', sqlerrm;
    end if;
  end;
end $$;
