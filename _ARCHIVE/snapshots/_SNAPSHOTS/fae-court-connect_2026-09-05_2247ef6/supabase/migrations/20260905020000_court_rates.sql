-- Live court pricing. Previously the admin Settings panel wrote rates to
-- localStorage, so edits never left the operator's browser and never changed
-- what a customer was charged.
create table if not exists public.court_rates (
  court_id text primary key,
  sport text not null,
  name text not null,
  member_rate numeric(10,2) not null check (member_rate >= 0),
  non_member_rate numeric(10,2) not null check (non_member_rate >= 0),
  active boolean not null default true,
  sort_order int not null default 0,
  updated_at timestamptz not null default now(),
  updated_by uuid
);

alter table public.court_rates enable row level security;

-- Prices are public information: anyone may read, only staff may change.
drop policy if exists "rates_public_read" on public.court_rates;
create policy "rates_public_read" on public.court_rates
  for select to anon, authenticated using (true);

drop policy if exists "rates_staff_write" on public.court_rates;
create policy "rates_staff_write" on public.court_rates
  for all to authenticated
  using (public.has_staff_access(auth.uid()))
  with check (public.has_staff_access(auth.uid()));

insert into public.court_rates (court_id, sport, name, member_rate, non_member_rate, sort_order)
values
  ('bb-full', 'basketball', 'Full court',         900.00, 1200.00, 1),
  ('vb-1',    'volleyball', 'Indoor court',       900.00, 1200.00, 2),
  ('pb-1',    'pickleball', 'Pickleball court 1', 500.00,  700.00, 3)
on conflict (court_id) do nothing;
