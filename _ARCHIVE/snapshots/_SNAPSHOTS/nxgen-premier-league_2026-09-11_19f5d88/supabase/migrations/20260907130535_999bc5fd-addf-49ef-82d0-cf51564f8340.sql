-- 1. Move the public-stat visibility helper out of the API-exposed schema
CREATE SCHEMA IF NOT EXISTS app_private;

CREATE OR REPLACE FUNCTION app_private.is_visible_stat_player(_player_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  select exists (select 1 from public.players pl where pl.id = _player_id)
     or exists (select 1 from public.profiles p where p.id = _player_id and p.is_public = true)
$$;

REVOKE ALL ON FUNCTION app_private.is_visible_stat_player(uuid) FROM PUBLIC;
GRANT USAGE ON SCHEMA app_private TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION app_private.is_visible_stat_player(uuid) TO anon, authenticated, service_role;

DROP POLICY IF EXISTS "Public stats for public players only" ON public.player_stats;
CREATE POLICY "Public stats for public players only"
ON public.player_stats FOR SELECT TO anon, authenticated
USING (app_private.is_visible_stat_player(player_id));

DROP FUNCTION IF EXISTS public.is_visible_stat_player(uuid);

-- 2. Staff money tools: accept an explicit actor so the trusted server can call them
CREATE OR REPLACE FUNCTION public.apply_wallet_delta(
  _user_id uuid,
  _balance_delta integer DEFAULT 0,
  _tab_delta integer DEFAULT 0,
  _actor uuid DEFAULT NULL
)
RETURNS public.player_wallets
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
declare w public.player_wallets;
        actor uuid := coalesce(_actor, auth.uid());
begin
  if not public.is_staff(actor) then
    raise exception 'Only staff can move money';
  end if;

  update public.player_wallets
     set balance_cents     = balance_cents + _balance_delta,
         tab_balance_cents = tab_balance_cents + _tab_delta,
         updated_at        = now()
   where user_id = _user_id
  returning * into w;

  if not found then
    raise exception 'No wallet exists for %', _user_id;
  end if;

  return w;
end $$;

DROP FUNCTION IF EXISTS public.apply_wallet_delta(uuid, integer, integer);

CREATE OR REPLACE FUNCTION public.void_ledger_entry(
  _entry_id uuid,
  _reason text DEFAULT NULL,
  _actor uuid DEFAULT NULL
)
RETURNS public.player_ledger_entries
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
declare original public.player_ledger_entries;
        reversal public.player_ledger_entries;
        actor uuid := coalesce(_actor, auth.uid());
begin
  if not public.is_staff(actor) then
    raise exception 'Only staff can void a transaction';
  end if;

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
     'Void: ' || coalesce(original.description, 'transaction'), actor, original.id)
  returning * into reversal;

  update public.player_ledger_entries
     set voided_at = now(), voided_by = actor, void_reason = _reason
   where id = original.id;

  if original.entry_type = 'topup' then
    perform public.apply_wallet_delta(original.user_id, -original.amount_cents, 0, actor);
  elsif original.payment_method = 'wallet' then
    perform public.apply_wallet_delta(original.user_id, -original.amount_cents, 0, actor);
  elsif original.payment_method = 'tab' then
    perform public.apply_wallet_delta(original.user_id, 0, -abs(original.amount_cents), actor);
  end if;

  return reversal;
end $$;

DROP FUNCTION IF EXISTS public.void_ledger_entry(uuid, text);

REVOKE ALL ON FUNCTION public.apply_wallet_delta(uuid, integer, integer, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.void_ledger_entry(uuid, text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_wallet_delta(uuid, integer, integer, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.void_ledger_entry(uuid, text, uuid) TO service_role;