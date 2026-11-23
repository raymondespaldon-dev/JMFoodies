-- 13: a failure after the parent insert must roll the booking back.
-- @sub a0000000-0000-4000-8000-000000000013
--
-- No @role directive, so this file runs as the session owner and may create the
-- temporary trigger used to inject the failure.
do $test$
declare
  v_uid uuid := 'a0000000-0000-4000-8000-000000000013';
  v_pkg uuid := 'b0000000-0000-4000-8000-000000000013';
  v_cat uuid := 'c0000000-0000-4000-8000-000000000013';
  v_food uuid := 'd0000000-0000-4000-8000-000000000013';
  v_ref text;
begin
  insert into auth.users (id, email) values (v_uid, 'slice3-test-13@example.com')
    on conflict (id) do nothing;
  insert into public.profiles (id, full_name) values (v_uid, 'Slice 3 Test Customer')
    on conflict (id) do nothing;
  insert into public.food_categories (id, name) values (v_cat, 'Slice3 Test Category 13')
    on conflict (id) do nothing;
  insert into public.food_items (id, category_id, name, extra_price, is_available)
    values (v_food, v_cat, 'Slice3 Test Dish 13', 0, true)
    on conflict (id) do nothing;
  insert into public.packages (id, name, price_per_person, minimum_guests, is_active)
    values (v_pkg, 'Slice3 Test Package 13', 350, 40, true)
    on conflict (id) do nothing;
  insert into public.package_categories (package_id, category_id, selection_limit, is_required)
    values (v_pkg, v_cat, 1, true)
    on conflict (package_id, category_id) do nothing;

  -- Fail the child insert after the parent row has already been written.
  create or replace function public._slice3_fail_child() returns trigger
  language plpgsql as $fn$
  declare
    v_ref text;
  begin
    select booking_reference into v_ref from public.bookings where id = new.booking_id;
    raise exception 'injected child insert failure: %', coalesce(v_ref, '<unknown>');
  end;
  $fn$;

  create trigger _slice3_fail_child_bfi
    before insert on public.booking_food_items
    for each row execute function public._slice3_fail_child();

  begin
    perform public.create_booking(jsonb_build_object(
      'package_id', v_pkg,
      'full_name', 'Maria Santos',
      'email', 'maria@example.com',
      'phone', '+63 917 123 4567',
      'event_name', 'Atomicity Event',
      'event_type', 'Birthday',
      'event_date', date '2099-06-13',
      'event_time', '10:00',
      'venue', '123 Balete Drive',
      'guest_count', 40,
      'selected_food_item_ids', jsonb_build_array(v_food::text)
    ));
    raise exception 'ASSERTION_FAILED: create_booking should have raised on child insert';
  exception when others then
    if sqlerrm like 'ASSERTION_FAILED:%' then
      raise;
    end if;
    if position('injected child insert failure:' in sqlerrm) = 0 then
      raise exception 'ASSERTION_FAILED: unexpected error: %', sqlerrm;
    end if;
    v_ref := trim(substring(sqlerrm from 'injected child insert failure: (.*)'));
  end;

  if v_ref is null or v_ref = '' then
    raise exception 'ASSERTION_FAILED: could not capture the attempted booking reference';
  end if;

  if exists (select 1 from public.bookings where booking_reference = v_ref) then
    raise exception 'ASSERTION_FAILED: booking % persisted after the child insert failed', v_ref;
  end if;
  if exists (
    select 1 from public.booking_food_items bfi
    join public.bookings b on b.id = bfi.booking_id
    where b.booking_reference = v_ref
  ) then
    raise exception 'ASSERTION_FAILED: booking_food_items persisted for %', v_ref;
  end if;

  drop trigger if exists _slice3_fail_child_bfi on public.booking_food_items;
  drop function if exists public._slice3_fail_child();
end $test$;
