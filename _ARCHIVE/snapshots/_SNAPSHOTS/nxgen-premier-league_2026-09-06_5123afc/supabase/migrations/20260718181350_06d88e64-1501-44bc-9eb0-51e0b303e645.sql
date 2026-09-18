
CREATE OR REPLACE FUNCTION public.handle_payment_proof_approval()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  cents integer;
BEGIN
  IF NEW.status = 'approved' AND OLD.status IS DISTINCT FROM 'approved' THEN
    NEW.reviewed_by := auth.uid();
    NEW.reviewed_at := now();
    IF NEW.purpose = 'wallet_topup' THEN
      cents := ROUND(NEW.amount * 100)::integer;
      INSERT INTO public.player_wallets (user_id, balance_cents)
        VALUES (NEW.user_id, cents)
        ON CONFLICT (user_id) DO UPDATE SET balance_cents = public.player_wallets.balance_cents + cents;
      INSERT INTO public.player_ledger_entries
        (user_id, entry_type, payment_method, amount_cents, description, recorded_by)
        VALUES (NEW.user_id, 'topup',
                CASE NEW.method::text WHEN 'gcash' THEN 'gcash' ELSE 'other' END,
                cents, 'Wallet top-up (proof ' || NEW.id || ')', auth.uid());
    END IF;
  ELSIF NEW.status = 'rejected' AND OLD.status IS DISTINCT FROM 'rejected' THEN
    NEW.reviewed_by := auth.uid();
    NEW.reviewed_at := now();
  END IF;
  RETURN NEW;
END;
$$;
