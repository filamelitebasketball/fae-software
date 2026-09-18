-- Release lapsed unpaid holds so a paying member can take the slot.
--
-- Members cannot read or update each other's bookings under RLS, so this runs
-- SECURITY DEFINER. It is deliberately narrow: it only ever cancels rows that
-- are already forfeit by policy (no verified deposit, not cancelled, past the
-- grace window) and that overlap the requested slot. Callers can narrow the
-- match with the slot coordinates but cannot widen it.
create or replace function public.release_lapsed_holds(
  _court_id text, _date date, _start_hour int, _hours int, _grace_minutes int default 120
) returns int
language plpgsql security definer set search_path = public as $$
declare released int;
begin
  if _hours < 1 or _hours > 18 or _start_hour < 0 or _start_hour > 23 then
    raise exception 'invalid slot';
  end if;

  with lapsed as (
    select id from bookings
    where court_id = _court_id and date = _date
      and coalesce(deposit_paid, 0) = 0
      and status <> 'Cancelled'
      and created_at < now() - make_interval(mins => greatest(_grace_minutes, 30))
      and _start_hour < start_hour + hours
      and start_hour < _start_hour + _hours
  ), done as (
    update bookings b
       set status = 'Cancelled', updated_at = now()
      from lapsed l where b.id = l.id
     returning b.id
  )
  select count(*) into released from done;
  return released;
end; $$;

revoke all on function public.release_lapsed_holds(text, date, int, int, int) from public, anon;
grant execute on function public.release_lapsed_holds(text, date, int, int, int) to authenticated;
