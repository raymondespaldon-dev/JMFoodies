-- 03a: role anon must not have EXECUTE on the function at all.
-- @role anon
--
-- This asserts the grant boundary (REVOKE ... FROM anon), not the internal
-- auth.uid() guard. The error is "permission denied for function", which is
-- materially different from the guard's UNAUTHENTICATED message even though
-- both use SQLSTATE 42501.
do $$
begin
  begin
    perform public.create_booking('{}'::jsonb);
    raise exception 'ASSERTION_FAILED: anon executed create_booking';
  exception when others then
    if sqlerrm like 'ASSERTION_FAILED:%' then
      raise;
    end if;
    if sqlstate <> '42501' then
      raise exception 'ASSERTION_FAILED: expected SQLSTATE 42501, got % (%)', sqlstate, sqlerrm;
    end if;
    if sqlerrm not like '%permission denied for function%' then
      raise exception 'ASSERTION_FAILED: expected a function privilege error, got %', sqlerrm;
    end if;
  end;
end $$;
