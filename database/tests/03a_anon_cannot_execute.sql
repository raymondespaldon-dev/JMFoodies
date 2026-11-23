-- @role anon
do $$
begin
  perform public.create_booking('{}'::jsonb);
  raise exception 'Assertion failed: anon should not be able to execute create_booking';
exception when others then
  if sqlstate <> '42501' then
    raise;
  end if;
  if position('permission denied' in sqlerrm) = 0 then
    raise exception 'Assertion failed: expected permission denied, got %', sqlerrm;
  end if;
end $$;