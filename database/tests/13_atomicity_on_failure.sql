do $$
declare
  v_uid uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  v_pkg uuid;
  v_cat uuid;
  v_food uuid;
  v_ref text;
begin
  insert into auth.users (id, email) values (v_uid, 'test@example.com') on conflict (id) do nothing;
  insert into public.profiles (id, full_name, role) values (v_uid, 'Test Customer', 'customer') on conflict (id) do nothing;

  select id into v_pkg from public.packages where name = 'Standard Package';
  update public.packages set is_active = true where id = v_pkg;
  select id into v_cat from public.food_categories where name = 'Chicken Dishes';
  insert into public.package_categories (package_id, category_id, selection_limit, is_required)
  values (v_pkg, v_cat, 1, true)
  on conflict (package_id, category_id) do update set selection_limit = 1, is_required = true;
  select id into v_food from public.food_items where category_id = v_cat and is_available = true limit 1;
  if v_food is null then
    insert into public.food_items (category_id, name, extra_price, is_available)
    values (v_cat, 'Test Chicken', 0, true) returning id into v_food;
  end if;

  -- inject failure on child insert
  create or replace function public._raise_on_bfi() returns trigger
  language plpgsql as $$
  declare v_ref text;
  begin
    select booking_reference into v_ref from public.bookings where id = new.booking_id;
    raise exception 'injected child insert failure: %', v_ref;
  end; $$;
  create trigger _bfi_fail before insert on public.booking_food_items
  for each row execute function public._raise_on_bfi();

  perform set_config('request.jwt.claims', json_build_object('sub', v_uid, 'role', 'authenticated')::text, true);

  begin
    perform public.create_booking(jsonb_build_object(
      'package_id', v_pkg,
      'full_name', 'Maria Santos',
      'email', 'maria@example.com',
      'phone', '+63 917 123 4567',
      'event_name', 'Chloe Birthday',
      'event_type', 'Birthday',
      'event_date', (current_date + interval '4 days')::date,
      'event_time', '18:00',
      'venue', '123 Balete Drive',
      'guest_count', 40,
      'selected_food_item_ids', jsonb_build_array(v_food::text)
    ));
    raise exception 'Assertion failed: create_booking should have raised';
  exception when others then
    if position('injected child insert failure:' in sqlerrm) = 0 then
      raise;
    end if;
    v_ref := trim(substring(sqlerrm from 'injected child insert failure: (.*)'));
  end;

  if v_ref is null or v_ref = '' then
    raise exception 'Assertion failed: could not capture attempted booking reference';
  end if;
  if exists (select 1 from public.bookings where booking_reference = v_ref) then
    raise exception 'Assertion failed: attempted booking % persisted after child failure', v_ref;
  end if;
  if exists (select 1 from public.booking_food_items bfi join public.bookings b on b.id = bfi.booking_id where b.booking_reference = v_ref) then
    raise exception 'Assertion failed: attempted booking food items persisted for %', v_ref;
  end if;

  drop trigger if exists _bfi_fail on public.booking_food_items;
  drop function if exists public._raise_on_bfi();
end $$;