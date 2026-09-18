-- Money moved by read-modify-write from stale client state.
--
-- The café register read a wallet balance when the player was selected, then
-- later wrote `balance + amount` from that remembered figure. Two tills open on
-- the same member — or one page left sitting while another sale went through —
-- silently overwrote each other, and the last write won. Worse, the ledger
-- insert was error-checked but the balance update was not, so a failed update
-- left an entry saying money moved while the balance never changed, and staff
-- were shown a success toast either way.
--
-- This does the arithmetic in the database, where the row is locked for the
-- duration of the statement, and returns the resulting wallet so the caller
-- never has to guess. Staff-only, because it moves money.

create or replace function public.apply_wallet_delta(
  _user_id uuid,
  _balance_delta integer default 0,
  _tab_delta integer default 0
) returns public.player_wallets
language plpgsql
security definer
set search_path = public
as $$
declare w public.player_wallets;
begin
  if not public.is_staff(auth.uid()) then
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

revoke all on function public.apply_wallet_delta(uuid, integer, integer) from public, anon;
grant execute on function public.apply_wallet_delta(uuid, integer, integer) to authenticated;
