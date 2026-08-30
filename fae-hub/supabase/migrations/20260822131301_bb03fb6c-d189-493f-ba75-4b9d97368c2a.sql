create or replace function public.taken_hours(_court_id text, _date date)
returns table(start_hour int, hours int)
language sql
stable
security definer
set search_path = public
as $$
  select b.start_hour, b.hours
  from public.bookings b
  where b.court_id = _court_id
    and b.date = _date
    and b.status <> 'Cancelled'
$$;
revoke execute on function public.taken_hours(text, date) from public;
grant execute on function public.taken_hours(text, date) to anon, authenticated;

create table public.tryouts (
  id uuid primary key default gen_random_uuid(),
  member_id uuid references public.members(id) not null,
  sport text not null check (sport in ('basketball','volleyball','pickleball')),
  created_at timestamptz default now(),
  unique (member_id, sport)
);
grant select, insert on public.tryouts to authenticated;
grant all on public.tryouts to service_role;
alter table public.tryouts enable row level security;
create policy "Members read own tryouts" on public.tryouts for select to authenticated using (
  member_id in (select id from public.members where user_id = auth.uid()) or public.has_role(auth.uid(), 'admin')
);
create policy "Members create own tryouts" on public.tryouts for insert to authenticated with check (
  member_id in (select id from public.members where user_id = auth.uid())
);