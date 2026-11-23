-- 03b: authenticated role with no JWT subject must hit the explicit guard.
-- @role authenticated
--
-- No @sub directive, so auth.uid() is null. Assert the message prefix, not just
-- the SQLSTATE, because a missing grant would also surface as 42501.
do $$
begin
  begin
    perform public.create_booking('{}'::jsonb);
    raise exception 'ASSERTION_FAILED: create_booking ran without an auth subject';
  exception when others then
    if sqlerrm like 'ASSERTION_FAILED:%' then
      raise;
    end if;
    if sqlstate <> '42501' then
      raise exception 'ASSERTION_FAILED: expected SQLSTATE 42501, got % (%)', sqlstate, sqlerrm;
    end if;
    if sqlerrm not like 'UNAUTHENTICATED:%' then
      raise exception 'ASSERTION_FAILED: expected the UNAUTHENTICATED guard, got %', sqlerrm;
    end if;
  end;
end $$;
