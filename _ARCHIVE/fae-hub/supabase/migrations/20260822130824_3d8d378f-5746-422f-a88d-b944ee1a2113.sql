create type public.app_role as enum ('admin', 'staff', 'member');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create policy "Users can read their own roles" on public.user_roles for select to authenticated using (auth.uid() = user_id);

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  )
$$;

create or replace function public.claim_admin_if_first()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return false;
  end if;
  if exists (select 1 from public.user_roles where role = 'admin') then
    return exists (select 1 from public.user_roles where role = 'admin' and user_id = auth.uid());
  end if;
  insert into public.user_roles (user_id, role) values (auth.uid(), 'admin') on conflict do nothing;
  return true;
end;
$$;

create table public.members (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique,
  name text not null,
  email text unique not null,
  phone text,
  tier text default 'Regular' check (tier in ('Regular','Elite','Partner','Corporate')),
  band_id text default '—',
  sport text default 'basketball',
  provider text default 'Email',
  role text default 'member' check (role in ('member','admin','staff')),
  joined_at timestamptz default now()
);
grant select, insert, update on public.members to authenticated;
grant all on public.members to service_role;
alter table public.members enable row level security;
create policy "Members read own profile" on public.members for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));
create policy "Members create own profile" on public.members for insert to authenticated with check (user_id = auth.uid());
create policy "Members update own profile" on public.members for update to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  member_id uuid references public.members(id),
  sport text not null,
  court_id text not null,
  date date not null,
  start_hour int not null,
  hours int not null default 1,
  amount numeric(10,2) not null,
  status text default 'Unpaid' check (status in ('Unpaid','Partial','Paid - Cash','Paid - GCash','Paid - Other','Cancelled')),
  channel text default 'Website',
  ref text unique,
  created_at timestamptz default now()
);
grant select, insert, update on public.bookings to authenticated;
grant all on public.bookings to service_role;
alter table public.bookings enable row level security;
create policy "Members read own bookings" on public.bookings for select to authenticated using (
  member_id in (select id from public.members where user_id = auth.uid()) or public.has_role(auth.uid(), 'admin')
);
create policy "Members create own bookings" on public.bookings for insert to authenticated with check (
  member_id in (select id from public.members where user_id = auth.uid())
);
create policy "Members update own bookings" on public.bookings for update to authenticated using (
  member_id in (select id from public.members where user_id = auth.uid()) or public.has_role(auth.uid(), 'admin')
);

create table public.inventory (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null check (category in ('drinks','food','service')),
  sku text unique not null,
  price numeric(10,2) not null,
  stock int,
  par_level int,
  updated_at timestamptz default now()
);
grant select on public.inventory to anon;
grant select, insert, update, delete on public.inventory to authenticated;
grant all on public.inventory to service_role;
alter table public.inventory enable row level security;
create policy "Anyone can view inventory" on public.inventory for select to anon, authenticated using (true);
create policy "Admins insert inventory" on public.inventory for insert to authenticated with check (public.has_role(auth.uid(), 'admin'));
create policy "Admins update inventory" on public.inventory for update to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "Admins delete inventory" on public.inventory for delete to authenticated using (public.has_role(auth.uid(), 'admin'));

create table public.tabs (
  id uuid primary key default gen_random_uuid(),
  member_id uuid references public.members(id),
  items jsonb default '[]',
  total numeric(10,2) default 0,
  settled boolean default false,
  created_at timestamptz default now()
);
grant select, insert, update on public.tabs to authenticated;
grant all on public.tabs to service_role;
alter table public.tabs enable row level security;
create policy "Members read own tabs" on public.tabs for select to authenticated using (
  member_id in (select id from public.members where user_id = auth.uid()) or public.has_role(auth.uid(), 'admin')
);
create policy "Admins manage tabs" on public.tabs for insert to authenticated with check (public.has_role(auth.uid(), 'admin'));
create policy "Admins update tabs" on public.tabs for update to authenticated using (public.has_role(auth.uid(), 'admin'));

create table public.sales (
  id uuid primary key default gen_random_uuid(),
  member_id uuid references public.members(id),
  item_id uuid references public.inventory(id),
  name text not null,
  category text not null,
  qty int not null default 1,
  amount numeric(10,2) not null,
  created_at timestamptz default now()
);
grant select, insert on public.sales to authenticated;
grant all on public.sales to service_role;
alter table public.sales enable row level security;
create policy "Members read own sales" on public.sales for select to authenticated using (
  member_id in (select id from public.members where user_id = auth.uid()) or public.has_role(auth.uid(), 'admin')
);
create policy "Admins record sales" on public.sales for insert to authenticated with check (public.has_role(auth.uid(), 'admin'));

create table public.activity_log (
  id uuid primary key default gen_random_uuid(),
  action text not null,
  details text,
  created_at timestamptz default now()
);
grant select, insert on public.activity_log to authenticated;
grant all on public.activity_log to service_role;
alter table public.activity_log enable row level security;
create policy "Admins read activity" on public.activity_log for select to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "Admins write activity" on public.activity_log for insert to authenticated with check (public.has_role(auth.uid(), 'admin'));

insert into public.inventory (name, category, sku, price, stock, par_level) values
  ('Bottled water 500ml', 'drinks', 'DRK-001', 25, 118, 60),
  ('Gatorade blue 500ml', 'drinks', 'DRK-002', 60, 44, 40),
  ('Cobra energy', 'drinks', 'DRK-003', 35, 28, 24),
  ('Coke Zero 330ml', 'drinks', 'DRK-004', 45, 33, 24),
  ('Iced coffee', 'drinks', 'DRK-005', 85, 16, 12),
  ('Fresh buko', 'drinks', 'DRK-006', 70, 11, 10),
  ('Protein shake', 'drinks', 'DRK-007', 150, 7, 12),
  ('Isotonic 1L', 'drinks', 'DRK-008', 110, 5, 10),
  ('Chicken sandwich', 'food', 'FOD-001', 140, 14, 10),
  ('Beef tapa rice', 'food', 'FOD-002', 180, 9, 8),
  ('Banana', 'food', 'FOD-003', 15, 56, 40),
  ('Protein bar', 'food', 'FOD-004', 120, 21, 15),
  ('Pancit canton', 'food', 'FOD-005', 45, 27, 20),
  ('PB toast', 'food', 'FOD-006', 65, 6, 10),
  ('Boiled egg', 'food', 'FOD-007', 20, 22, 20),
  ('Court rental 1hr', 'service', 'SVC-001', 900, null, null),
  ('Half court 1hr', 'service', 'SVC-002', 500, null, null),
  ('Skills session', 'service', 'SVC-003', 1200, null, null),
  ('Guest pass', 'service', 'SVC-004', 100, null, null),
  ('Locker day', 'service', 'SVC-005', 50, null, null),
  ('RFID band', 'service', 'SVC-006', 250, 34, 20),
  ('Towel rental', 'service', 'SVC-007', 40, 18, 15);

insert into public.members (name, email, phone, tier, band_id, sport) values
  ('Marco Villanueva', 'marco.villanueva@faecourt.ph', '+63 917 501 8801', 'Elite', 'FAE-0417', 'basketball'),
  ('Aliyah Santos', 'aliyah.santos@faecourt.ph', '+63 917 501 8802', 'Elite', 'FAE-0288', 'volleyball'),
  ('Coach Danilo Cruz', 'danilo.cruz@faecourt.ph', '+63 917 501 8803', 'Partner', 'FAE-0011', 'pickleball'),
  ('Team Aguila', 'team.aguila@faecourt.ph', '+63 917 501 8804', 'Corporate', 'FAE-TEAM-03', 'basketball'),
  ('Jhaz Reyes', 'jhaz.reyes@faecourt.ph', '+63 917 501 8805', 'Regular', '—', 'volleyball');