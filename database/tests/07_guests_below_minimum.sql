-- 07: guest_count below packages.minimum_guests raises GUESTS_BELOW_MINIMUM.
do $$
declare
  v_uid uuid := 'a0000000-0000-4000-8000-000000000007';
  v_pkg uuid := 'b0000000-0000-4000-8000-000000000007';
begin
  insert into auth.users (id, email) values (v_uid, 'slice3-test-07@example.com')
    on conflict (id) do nothing;
  insert into public.profiles (id, full_name) values (v_uid, 'Slice 3 Test Customer')
    on conflict (id) do nothing;
  insert into public.packages (id, name, price_per_person, minimum_guests, is_active)
    values (v_pkg, 'Slice3 Test Package 07', 350, 40, true)
    on conflict (id) do nothing;

  perform set_config('request.jwt.claims',
    json_build_object('sub', v_uid, 'role', 'authenticated')::text, true);

  begin
    perform public.create_booking(jsonb_build_object(
      'package_id', v_pkg,
      'full_name', 'Maria Santos',
      'email', 'maria@example.com',
      'phone', '+63 917 123 4567',
      'event_name', 'Too Few Guests Event',
      'event_type', 'Birthday',
      'event_date', date '2099-06-07',
      'event_time', '10:00',
      'venue', '123 Balete Drive',
      'guest_count', 25,
      'selected_food_item_ids', '[]'::jsonb
    ));
    raise exception 'ASSERTION_FAILED: create_booking accepted 25 guests for a 40-guest minimum';
  exception when others then
    if sqlerrm like 'ASSERTION_FAILED:%' then
      raise;
    end if;
    if sqlstate <> 'P0012' then
      raise exception 'ASSERTION_FAILED: expected SQLSTATE P0012, got % (%)', sqlstate, sqlerrm;
    end if;
    if sqlerrm not like 'GUESTS_BELOW_MINIMUM:%' then
      raise exception 'ASSERTION_FAILED: expected GUESTS_BELOW_MINIMUM, got %', sqlerrm;
    end if;
  end;
end $$;
