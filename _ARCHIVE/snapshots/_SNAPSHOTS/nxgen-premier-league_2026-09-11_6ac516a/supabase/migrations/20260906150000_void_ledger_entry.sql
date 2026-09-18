-- Undo a charge or top-up that should not have happened.
--
-- Mistakes at a counter are normal: a double tap, the wrong member, the wrong
-- item. Until now the only correction was editing the database by hand.
--
-- Money history is never deleted. The original entry stays, marked voided, and
-- an opposite entry is written beside it, so the day's ledger still adds up and
-- anyone reading it later can see both the mistake and the correction. The
-- wallet or tab is moved back through apply_wallet_delta, so the arithmetic
-- happens in one locked statement rather than from a remembered balance.

alter table public.player_ledger_entries
  add column if not exists voided_at   timestamptz,
  add column if not exists voided_by   uuid references auth.users(id),
  add column if not exists void_reason text,
  add column if not exists reverses_id uuid references public.player_ledger_entries(id);

comment on column public.player_ledger_entries.reverses_id is
  'Set on the correcting entry, pointing at the entry it cancels.';

create index if not exists ledger_reverses_idx
  on public.player_ledger_entries (reverses_id) where reverses_id is not null;

create or replace function public.void_ledger_entry(_entry_id uuid, _reason text default null)
returns public.player_ledger_entries
language plpgsql
security definer
set search_path = public
as $$
declare original public.player_ledger_entries;
        reversal public.player_ledger_entries;
begin
  if not public.is_staff(auth.uid()) then
    raise exception 'Only staff can void a transaction';
  end if;

  -- FOR UPDATE is what makes a double-tap safe: the second call waits, then
  -- finds voided_at already set and refuses instead of reversing twice.
  select * into original from public.player_ledger_entries where id = _entry_id for update;
  if not found then raise exception 'No such transaction'; end if;
  if original.voided_at is not null then raise exception 'That transaction was already voided'; end if;
  if original.reverses_id is not null then raise exception 'A reversal cannot itself be voided'; end if;

  insert into public.player_ledger_entries
    (user_id, daily_ledger_id, item_id, entry_type, payment_method, amount_cents,
     quantity, description, recorded_by, reverses_id)
  values
    (original.user_id, original.daily_ledger_id, original.item_id, original.entry_type,
     original.payment_method, -original.amount_cents, original.quantity,
     'Void: ' || coalesce(original.description, 'transaction'), auth.uid(), original.id)
  returning * into reversal;

  update public.player_ledger_entries
     set voided_at = now(), voided_by = auth.uid(), void_reason = _reason
   where id = original.id;

  -- Put the money back the way it left.
  if original.payment_method = 'wallet' then
    perform public.apply_wallet_delta(original.user_id, -original.amount_cents, 0);
  elsif original.payment_method = 'tab' then
    perform public.apply_wallet_delta(original.user_id, 0, -abs(original.amount_cents));
  end if;

  return reversal;
end $$;

revoke all on function public.void_ledger_entry(uuid, text) from public, anon;
grant execute on function public.void_ledger_entry(uuid, text) to authenticated;
