-- 50% deposit workflow, proof of payment, and event bookings.
-- Applied to the live database on 2026-09-01; kept here so the schema stays version-controlled.

alter table public.bookings add column if not exists is_event boolean not null default false;
alter table public.bookings add column if not exists event_name text;
alter table public.bookings add column if not exists deposit_paid numeric(10,2) not null default 0;
alter table public.bookings add column if not exists balance_paid numeric(10,2) not null default 0;

create table if not exists public.booking_payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  kind text not null check (kind in ('Deposit','Balance','Refund')),
  amount numeric(10,2) not null check (amount >= 0),
  method text not null check (method in ('GCash','Maya','Bank Transfer','Cash','Other')),
  reference text,
  proof_path text,
  status text not null default 'Submitted' check (status in ('Submitted','Verified','Rejected')),
  note text,
  submitted_by uuid,
  submitted_by_name text,
  created_at timestamptz not null default now(),
  reviewed_by text,
  reviewed_at timestamptz
);

create index if not exists booking_payments_booking_idx on public.booking_payments(booking_id);
create index if not exists booking_payments_status_idx on public.booking_payments(status, created_at desc);

alter table public.booking_payments enable row level security;

-- A deposit reserves the slot, so it must be traceable. Cash only settles the balance.
alter table public.booking_payments drop constraint if exists booking_payments_deposit_method_ck;
alter table public.booking_payments add constraint booking_payments_deposit_method_ck
  check (kind <> 'Deposit' or method in ('GCash','Maya','Bank Transfer'));

drop policy if exists "bp_read" on public.booking_payments;
create policy "bp_read" on public.booking_payments
  for select to authenticated
  using (
    public.has_staff_access(auth.uid())
    or booking_id in (
      select b.id from public.bookings b
      join public.members m on m.id = b.member_id
      where m.user_id = auth.uid()
    )
  );

drop policy if exists "bp_insert" on public.booking_payments;
create policy "bp_insert" on public.booking_payments
  for insert to authenticated
  with check (
    public.has_staff_access(auth.uid())
    or booking_id in (
      select b.id from public.bookings b
      join public.members m on m.id = b.member_id
      where m.user_id = auth.uid()
    )
  );

drop policy if exists "bp_staff_update" on public.booking_payments;
create policy "bp_staff_update" on public.booking_payments
  for update to authenticated
  using (public.has_staff_access(auth.uid()))
  with check (public.has_staff_access(auth.uid()));

drop policy if exists "bp_staff_delete" on public.booking_payments;
create policy "bp_staff_delete" on public.booking_payments
  for delete to authenticated using (public.has_staff_access(auth.uid()));

-- Private bucket for payment screenshots.
insert into storage.buckets (id, name, public)
select 'payment-proofs','payment-proofs', false
where not exists (select 1 from storage.buckets where id='payment-proofs');

drop policy if exists "proofs_insert" on storage.objects;
create policy "proofs_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'payment-proofs' and owner = auth.uid());

drop policy if exists "proofs_read" on storage.objects;
create policy "proofs_read" on storage.objects
  for select to authenticated
  using (bucket_id = 'payment-proofs' and (owner = auth.uid() or public.has_staff_access(auth.uid())));

drop policy if exists "proofs_staff_delete" on storage.objects;
create policy "proofs_staff_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'payment-proofs' and public.has_staff_access(auth.uid()));
