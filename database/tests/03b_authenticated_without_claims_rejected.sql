-- @role authenticated
do $$
begin
  perform public.create_booking('{}'::jsonb);
  raise exception 'Assertion failed: unauthenticated call should raise';
exception when others then
  if sqlstate <> '42501' then
    raise;
  end if;
  if position('UNAUTHENTICATED:' in sqlerrm) = 0 then
    raise exception 'Assertion failed: expected UNAUTHENTICATED prefix, got %', sqlerrm;
  end if;
end $$;