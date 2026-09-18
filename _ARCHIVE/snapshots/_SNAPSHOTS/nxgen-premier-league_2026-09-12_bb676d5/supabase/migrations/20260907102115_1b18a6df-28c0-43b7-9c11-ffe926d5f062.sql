CREATE OR REPLACE FUNCTION public.void_ledger_entry(_entry_id uuid, _reason text DEFAULT NULL::text)
 RETURNS player_ledger_entries
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare original public.player_ledger_entries;
        reversal public.player_ledger_entries;
begin
  if not public.is_staff(auth.uid()) then
    raise exception 'Only staff can void a transaction';
  end if;

  select * into original from public.player_ledger_entries where id = _entry_id for update;
  if not found then raise exception 'No such transaction'; end if;
  if original.voided_at is not null then raise exception 'That transaction was already voided'; end if;
  if original.reverses_id is not null then raise exception 'A reversal cannot itself be voided'; end if;

  -- Money history is never deleted. The original stays, marked voided, and an
  -- opposite entry records the correction so the day's ledger still adds up.
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

  -- Put the money back exactly the way it left. Top-ups always credit the
  -- wallet regardless of how the member paid at the counter, so voiding one
  -- must always take that credit back; spending entries reverse by method.
  if original.entry_type = 'topup' then
    perform public.apply_wallet_delta(original.user_id, -original.amount_cents, 0);
  elsif original.payment_method = 'wallet' then
    perform public.apply_wallet_delta(original.user_id, -original.amount_cents, 0);
  elsif original.payment_method = 'tab' then
    perform public.apply_wallet_delta(original.user_id, 0, -abs(original.amount_cents));
  end if;

  return reversal;
end $function$;