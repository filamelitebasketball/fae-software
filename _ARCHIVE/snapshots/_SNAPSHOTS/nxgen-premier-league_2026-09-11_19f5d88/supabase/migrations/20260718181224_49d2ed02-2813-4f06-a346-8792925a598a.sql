
-- 1. profiles.is_public
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT true;

-- 2. update get_public_player to respect is_public
CREATE OR REPLACE FUNCTION public.get_public_player(_id uuid)
 RETURNS TABLE(id uuid, full_name text, photo_url text, avatar_url text, bio text, "position" text, jersey_number text, division text, height_cm integer, weight_kg integer, instagram_handle text, facebook_handle text, twitter_handle text, tiktok_handle text)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT id, full_name, photo_url, avatar_url, bio, "position", jersey_number, division,
         height_cm, weight_kg,
         instagram_handle, facebook_handle, twitter_handle, tiktok_handle
  FROM public.profiles
  WHERE id = _id AND COALESCE(is_public, true) = true
$function$;

-- 3. get_profile_by_bracelet_uid: NFC tap resolution
CREATE OR REPLACE FUNCTION public.get_profile_by_bracelet_uid(_uid text)
 RETURNS TABLE(profile_id uuid, is_public boolean)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT p.id, p.is_public
  FROM public.bracelets b
  JOIN public.profiles p ON p.id = b.user_id
  WHERE UPPER(REPLACE(b.uid, ':', '')) = UPPER(REPLACE(_uid, ':', ''))
    AND b.active = true
  LIMIT 1
$function$;

GRANT EXECUTE ON FUNCTION public.get_profile_by_bracelet_uid(text) TO anon, authenticated;

-- 4. payment_proofs table
CREATE TYPE public.payment_proof_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE public.payment_proof_purpose AS ENUM ('wallet_topup', 'merchandise', 'drinks', 'registration', 'other');
CREATE TYPE public.payment_proof_method AS ENUM ('gcash', 'maya', 'bank', 'other');

CREATE TABLE public.payment_proofs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount numeric(10,2) NOT NULL CHECK (amount > 0),
  method public.payment_proof_method NOT NULL,
  purpose public.payment_proof_purpose NOT NULL,
  reference_no text,
  notes text,
  image_path text NOT NULL,
  status public.payment_proof_status NOT NULL DEFAULT 'pending',
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  rejection_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.payment_proofs TO authenticated;
GRANT UPDATE (status, reviewed_by, reviewed_at, rejection_reason, updated_at) ON public.payment_proofs TO authenticated;
GRANT ALL ON public.payment_proofs TO service_role;

ALTER TABLE public.payment_proofs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert own payment proofs"
  ON public.payment_proofs FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users view own payment proofs"
  ON public.payment_proofs FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_staff(auth.uid()));

CREATE POLICY "Staff update payment proofs"
  ON public.payment_proofs FOR UPDATE TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));

CREATE TRIGGER trg_payment_proofs_updated
  BEFORE UPDATE ON public.payment_proofs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. On approve, auto-credit wallet for wallet_topup
CREATE OR REPLACE FUNCTION public.handle_payment_proof_approval()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'approved' AND OLD.status IS DISTINCT FROM 'approved' THEN
    NEW.reviewed_by := auth.uid();
    NEW.reviewed_at := now();
    IF NEW.purpose = 'wallet_topup' THEN
      INSERT INTO public.player_wallets (user_id, balance)
        VALUES (NEW.user_id, NEW.amount)
        ON CONFLICT (user_id) DO UPDATE SET balance = public.player_wallets.balance + NEW.amount;
      INSERT INTO public.player_ledger_entries (user_id, amount, entry_type, description, created_by)
        VALUES (NEW.user_id, NEW.amount, 'credit', 'Wallet top-up (proof #' || NEW.id || ')', auth.uid());
    END IF;
  ELSIF NEW.status = 'rejected' AND OLD.status IS DISTINCT FROM 'rejected' THEN
    NEW.reviewed_by := auth.uid();
    NEW.reviewed_at := now();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_payment_proof_approval
  BEFORE UPDATE ON public.payment_proofs
  FOR EACH ROW EXECUTE FUNCTION public.handle_payment_proof_approval();
