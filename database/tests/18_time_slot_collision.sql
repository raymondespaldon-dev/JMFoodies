do $$
declare
  v_uid uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  v_pkg uuid;
  v_base numeric(10,2);
  v_event_date date := (current_date + interval '3 days')::date;
begin
  insert into auth.users (id, email) values (v_uid, 'test@example.com') on conflict (id) do nothing;
  insert into public.profiles (id, full_name, role) values (v_uid, 'Test Customer', 'customer') on conflict (id) do nothing;

  select id, price_per_person into v_pkg, v_base from public.packages where name = 'Standard Package';
  update public.packages set is_active = true where id = v_pkg;

  insert into public.bookings (
    customer_id, booking_reference, package_id, full_name, email, phone,
    event_name, event_type, event_date, event_time, venue, guest_count,
    base_price_per_person, extra_price_per_person, final_price_per_person,
    estimated_total, menu_mode, status
  ) values (
    v_uid, 'JM-COLLISION-TEST', v_pkg, 'Existing Booking', 'existing@example.com', '+63 917 000 0000',
    'Existing Event', 'Birthday', v_event_date, '14:00', 'Existing Venue', 40,
    v_base, 0, v_base, v_base * 40, 'custom', 'approved'
  );

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
    raise exception 'Assertion failed: time slot collision should raise';
  exception when others then
    if sqlstate <> 'P0005' or position('TIME_SLOT_COLLISION:' in sqlerrm) = 0 then
      raise;
    end if;
  end;
end $$;