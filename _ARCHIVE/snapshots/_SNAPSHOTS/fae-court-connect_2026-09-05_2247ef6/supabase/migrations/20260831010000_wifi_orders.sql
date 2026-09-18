-- WiFi ordering for the F.A.E. internet cafe.
-- Applied to the live database on 2026-08-31; kept here so the schema stays version-controlled.

create table if not exists public.wifi_plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  minutes int not null,
  price numeric(10,2) not null,
  devices int not null default 1,
  description text,
  active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz default now()
);

create table if not exists public.wifi_orders (
  id uuid primary key default gen_random_uuid(),
  member_id uuid references public.members(id) on delete set null,
  plan_id uuid references public.wifi_plans(id),
  plan_name text not null,
  minutes int not null,
  devices int not null default 1,
  amount numeric(10,2) not null,
  code text unique not null,
  buyer_name text,
  status text not null default 'Pending'
    check (status in ('Pending','Paid','Active','Expired','Cancelled')),
  payment_method text,
  activated_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  updated_by text
);

create index if not exists wifi_orders_member_idx on public.wifi_orders(member_id);
create index if not exists wifi_orders_status_idx on public.wifi_orders(status, created_at desc);

alter table public.wifi_plans enable row level security;
alter table public.wifi_orders enable row level security;

-- Plans: any signed-in user may read what's on sale; only staff may change it.
drop policy if exists "wifi_plans_read" on public.wifi_plans;
create policy "wifi_plans_read" on public.wifi_plans
  for select to authenticated using (active or public.has_staff_access(auth.uid()));

drop policy if exists "wifi_plans_staff_write" on public.wifi_plans;
create policy "wifi_plans_staff_write" on public.wifi_plans
  for all to authenticated
  using (public.has_staff_access(auth.uid()))
  with check (public.has_staff_access(auth.uid()));

-- Orders: a member sees only their own; staff see and manage everything.
drop policy if exists "wifi_orders_own_read" on public.wifi_orders;
create policy "wifi_orders_own_read" on public.wifi_orders
  for select to authenticated
  using (
    public.has_staff_access(auth.uid())
    or member_id in (select id from public.members where user_id = auth.uid())
  );

drop policy if exists "wifi_orders_own_insert" on public.wifi_orders;
create policy "wifi_orders_own_insert" on public.wifi_orders
  for insert to authenticated
  with check (
    public.has_staff_access(auth.uid())
    or member_id in (select id from public.members where user_id = auth.uid())
  );

drop policy if exists "wifi_orders_staff_write" on public.wifi_orders;
create policy "wifi_orders_staff_write" on public.wifi_orders
  for update to authenticated
  using (public.has_staff_access(auth.uid()))
  with check (public.has_staff_access(auth.uid()));

drop policy if exists "wifi_orders_staff_delete" on public.wifi_orders;
create policy "wifi_orders_staff_delete" on public.wifi_orders
  for delete to authenticated using (public.has_staff_access(auth.uid()));

insert into public.wifi_plans (name, minutes, price, devices, description, sort_order)
select * from (values
  ('Quick 1 Hour',          60,    20.00, 1, 'One hour of F.A.E. Court WiFi on a single device.',            1),
  ('Half Day · 4 Hours',    240,   60.00, 1, 'Four hours — good for a full session plus recovery time.',     2),
  ('All Day',               720,  100.00, 2, 'Twelve hours, up to two devices. Best value for a long stay.', 3),
  ('Weekly Pass',         10080,  450.00, 2, 'Seven days of access on two devices. For regulars.',           4),
  ('Team Room · 5 Devices', 240,  250.00, 5, 'Four hours on five devices — for teams and events.',           5)
) as v(name, minutes, price, devices, description, sort_order)
where not exists (select 1 from public.wifi_plans);
