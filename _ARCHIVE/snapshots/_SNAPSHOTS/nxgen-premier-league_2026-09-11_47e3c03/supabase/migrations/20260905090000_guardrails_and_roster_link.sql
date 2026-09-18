-- Applied directly to production on 2026-09-05. Recorded here for the record;
-- migrations in this repo are not auto-applied by the hosting pipeline.

-- 1. Protect columns a member must not be able to set on their own row.
--    Column REVOKEs were tried before and never reached production, so this is
--    a trigger: it survives grant changes and silently reverts the column
--    instead of erroring, so ordinary edits (name, phone) still save.
create or replace function public.guard_protected_columns()
returns trigger language plpgsql security definer set search_path = public as $fn$
begin
  if coalesce(current_setting('request.jwt.claims', true)::jsonb ->> 'role','') = 'service_role'
     or public.is_staff(auth.uid()) then
    return new;
  end if;
  if tg_table_name = 'profiles' then
    new.membership_tier := old.membership_tier;
    new.admin_notes     := old.admin_notes;
  elsif tg_table_name = 'registrations' then
    new.status := old.status;
  end if;
  return new;
end $fn$;

drop trigger if exists profiles_guard on public.profiles;
create trigger profiles_guard before update on public.profiles
  for each row execute function public.guard_protected_columns();

drop trigger if exists registrations_guard on public.registrations;
create trigger registrations_guard before update on public.registrations
  for each row execute function public.guard_protected_columns();

-- 2. players.profile_id was an unconstrained uuid, which is how a roster row
--    ended up pointing at a different person's account with hand-typed totals
--    no game produced.
alter table public.players
  add constraint players_profile_id_fkey
    foreign key (profile_id) references public.profiles(id) on delete set null;
alter table public.players
  add constraint players_profile_id_unique unique (profile_id);
create index if not exists players_profile_id_idx on public.players (profile_id);

-- 3. Season totals were summed across every division and written to every
--    roster row sharing a profile. Scope the recalc to each row's division.
create or replace function public.recalc_player_season_totals(_profile_id uuid)
returns void language plpgsql security definer set search_path = public as $fn$
declare r record;
begin
  for r in select id, division from public.players where profile_id = _profile_id loop
    update public.players p set
      season_pts = t.pts, season_reb = t.reb, season_ast = t.ast,
      season_stl = t.stl, season_blk = t.blk, games_played = t.g, updated_at = now()
    from (
      select coalesce(sum(points),0)::int pts, coalesce(sum(rebounds),0)::int reb,
             coalesce(sum(assists),0)::int ast, coalesce(sum(steals),0)::int stl,
             coalesce(sum(blocks),0)::int blk, count(*)::int g
      from public.player_stats
      where player_id = _profile_id and division = r.division
    ) t
    where p.id = r.id;
  end loop;
end $fn$;

create index if not exists games_status_scheduled_at_idx
  on public.games (status, scheduled_at desc);
