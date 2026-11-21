create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path=public
as $$ select exists(select 1 from public.profiles where id=auth.uid() and role='admin'); $$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path=public
as $$
begin
 insert into public.profiles(id,full_name) values(new.id,coalesce(new.raw_user_meta_data->>'full_name',''));
 return new;
end; $$;


-- Prevent users from promoting themselves by editing their own profile row.
create or replace function public.protect_profile_role()
returns trigger language plpgsql security definer set search_path=public
as $$
begin
 if new.role is distinct from old.role and not public.is_admin() then
   raise exception 'Only an administrator can change account roles';
 end if;
 return new;
end; $$;

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at=now(); return new; end; $$;

create or replace function public.log_booking_status()
returns trigger language plpgsql security definer set search_path=public
as $$
begin
 if tg_op='INSERT' then
  insert into public.booking_status_history(booking_id,new_status,changed_by) values(new.id,new.status,auth.uid());
 elsif new.status is distinct from old.status then
  insert into public.booking_status_history(booking_id,old_status,new_status,changed_by,note)
  values(new.id,old.status,new.status,auth.uid(),new.admin_notes);
 end if;
 return new;
end; $$;

create or replace function public.check_booking_constraints()
returns trigger language plpgsql security definer set search_path=public
as $$
declare min_guests integer; blocked boolean;
begin
 select minimum_guests into min_guests from public.packages where id=new.package_id and is_active=true;
 if min_guests is null then raise exception 'Selected package is unavailable'; end if;
 if new.guest_count<min_guests then raise exception 'Package requires at least % guests',min_guests; end if;
 select exists(select 1 from public.availability a where a.event_date=new.event_date and a.is_blocked=true
   and (a.start_time is null or (new.event_time>=a.start_time and (a.end_time is null or new.event_time<a.end_time))))
 into blocked;
 if blocked then raise exception 'The selected event time is unavailable'; end if;
 if exists(select 1 from public.bookings b where b.event_date=new.event_date and b.event_time=new.event_time
   and b.status in ('approved','confirmed') and b.id is distinct from new.id) then
   raise exception 'This event time already has an approved reservation';
 end if;
 return new;
end; $$;

create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();
create trigger profiles_role_guard before update on public.profiles for each row execute function public.protect_profile_role();
create trigger profiles_updated before update on public.profiles for each row execute function public.set_updated_at();
create trigger packages_updated before update on public.packages for each row execute function public.set_updated_at();
create trigger food_items_updated before update on public.food_items for each row execute function public.set_updated_at();
create trigger bookings_updated before update on public.bookings for each row execute function public.set_updated_at();
create trigger booking_status_log after insert or update of status on public.bookings for each row execute function public.log_booking_status();
create trigger booking_constraints before insert or update on public.bookings for each row execute function public.check_booking_constraints();
