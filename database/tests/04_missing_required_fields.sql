-- 04: missing contact/event fields raise MISSING_REQUIRED_FIELDS.
do $$
declare
  v_uid uuid := 'a0000000-0000-4000-8000-000000000004';
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', v_uid, 'role', 'authenticated')::text, true);

  begin
    -- venue is deliberately omitted
    perform public.create_booking(jsonb_build_object(
      'package_id', 'b0000000-0000-4000-8000-000000000004',
      'full_name', 'Maria Santos',
      'email', 'maria@example.com',
      'phone', '+63 917 123 4567',
      'event_name', 'Missing Venue Event',
      'event_type', 'Birthday',
      'event_date', date '2099-06-04',
      'event_time', '10:00',
      'guest_count', 40,
      'selected_food_item_ids', '[]'::jsonb
    ));
    raise exception 'ASSERTION_FAILED: create_booking accepted a payload without venue';
  exception when others then
    if sqlerrm like 'ASSERTION_FAILED:%' then
      raise;
    end if;
    if sqlstate <> 'P0001' then
      raise exception 'ASSERTION_FAILED: expected SQLSTATE P0001, got % (%)', sqlstate, sqlerrm;
    end if;
    if sqlerrm not like 'MISSING_REQUIRED_FIELDS:%' then
      raise exception 'ASSERTION_FAILED: expected MISSING_REQUIRED_FIELDS, got %', sqlerrm;
    end if;
  end;
end $$;
