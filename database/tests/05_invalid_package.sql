-- 05: a package_id that matches no row raises INVALID_PACKAGE.
do $$
declare
  v_uid uuid := 'a0000000-0000-4000-8000-000000000005';
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', v_uid, 'role', 'authenticated')::text, true);

  begin
    perform public.create_booking(jsonb_build_object(
      'package_id', 'b0000000-0000-4000-8000-00000000dead',
      'full_name', 'Maria Santos',
      'email', 'maria@example.com',
      'phone', '+63 917 123 4567',
      'event_name', 'Unknown Package Event',
      'event_type', 'Birthday',
      'event_date', date '2099-06-05',
      'event_time', '10:00',
      'venue', '123 Balete Drive',
      'guest_count', 40,
      'selected_food_item_ids', '[]'::jsonb
    ));
    raise exception 'ASSERTION_FAILED: create_booking accepted an unknown package';
  exception when others then
    if sqlerrm like 'ASSERTION_FAILED:%' then
      raise;
    end if;
    if sqlstate <> 'P0010' then
      raise exception 'ASSERTION_FAILED: expected SQLSTATE P0010, got % (%)', sqlstate, sqlerrm;
    end if;
    if sqlerrm not like 'INVALID_PACKAGE:%' then
      raise exception 'ASSERTION_FAILED: expected INVALID_PACKAGE, got %', sqlerrm;
    end if;
  end;
end $$;
