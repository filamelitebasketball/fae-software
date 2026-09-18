
-- ============ INVENTORY / CATALOG ============
CREATE TABLE public.inventory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL CHECK (category IN ('drink','merch','service','cafe','other')),
  sku text UNIQUE,
  price_cents integer NOT NULL DEFAULT 0 CHECK (price_cents >= 0),
  stock integer,
  unit text,
  active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.inventory_items TO authenticated;
GRANT ALL ON public.inventory_items TO service_role;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone signed-in can view active items"
  ON public.inventory_items FOR SELECT TO authenticated USING (active OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins manage inventory"
  ON public.inventory_items FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_inventory_items_updated BEFORE UPDATE ON public.inventory_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ DAILY LEDGERS ============
CREATE TABLE public.daily_ledgers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ledger_date date NOT NULL UNIQUE,
  opened_by uuid REFERENCES auth.users(id),
  opened_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz,
  closed_by uuid REFERENCES auth.users(id),
  total_sales_cents integer NOT NULL DEFAULT 0,
  total_topups_cents integer NOT NULL DEFAULT 0,
  total_tab_cents integer NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.daily_ledgers TO authenticated;
GRANT ALL ON public.daily_ledgers TO service_role;
ALTER TABLE public.daily_ledgers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed-in can view daily ledgers"
  ON public.daily_ledgers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage daily ledgers"
  ON public.daily_ledgers FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_daily_ledgers_updated BEFORE UPDATE ON public.daily_ledgers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ PLAYER WALLETS ============
CREATE TABLE public.player_wallets (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  balance_cents integer NOT NULL DEFAULT 0,
  loyal_tab_enabled boolean NOT NULL DEFAULT false,
  credit_limit_cents integer NOT NULL DEFAULT 0 CHECK (credit_limit_cents >= 0),
  tab_balance_cents integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.player_wallets TO authenticated;
GRANT ALL ON public.player_wallets TO service_role;
ALTER TABLE public.player_wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Players view own wallet"
  ON public.player_wallets FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins manage wallets"
  ON public.player_wallets FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_wallets_updated BEFORE UPDATE ON public.player_wallets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ PLAYER LEDGER ENTRIES ============
CREATE TABLE public.player_ledger_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  daily_ledger_id uuid REFERENCES public.daily_ledgers(id),
  item_id uuid REFERENCES public.inventory_items(id),
  entry_type text NOT NULL CHECK (entry_type IN ('purchase','topup','refund','adjustment','cafe','service')),
  payment_method text NOT NULL CHECK (payment_method IN ('cash','wallet','tab','card','gcash','other')),
  amount_cents integer NOT NULL, -- negative = charge to player, positive = credit
  quantity integer NOT NULL DEFAULT 1,
  description text,
  bracelet_uid text,
  recorded_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_ledger_user ON public.player_ledger_entries(user_id);
CREATE INDEX idx_ledger_daily ON public.player_ledger_entries(daily_ledger_id);
CREATE INDEX idx_ledger_created ON public.player_ledger_entries(created_at DESC);
GRANT SELECT ON public.player_ledger_entries TO authenticated;
GRANT ALL ON public.player_ledger_entries TO service_role;
ALTER TABLE public.player_ledger_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Players view own ledger"
  ON public.player_ledger_entries FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins manage ledger entries"
  ON public.player_ledger_entries FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============ CAFE SESSIONS ============
CREATE TABLE public.cafe_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  station text NOT NULL,
  auth_method text NOT NULL DEFAULT 'rfid' CHECK (auth_method IN ('rfid','phone','manual')),
  bracelet_uid text,
  rate_cents_per_hour integer NOT NULL DEFAULT 0,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  total_charge_cents integer,
  ledger_entry_id uuid REFERENCES public.player_ledger_entries(id),
  started_by uuid REFERENCES auth.users(id),
  ended_by uuid REFERENCES auth.users(id),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_cafe_user ON public.cafe_sessions(user_id);
CREATE INDEX idx_cafe_active ON public.cafe_sessions(ended_at) WHERE ended_at IS NULL;
GRANT SELECT ON public.cafe_sessions TO authenticated;
GRANT ALL ON public.cafe_sessions TO service_role;
ALTER TABLE public.cafe_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Players view own cafe sessions"
  ON public.cafe_sessions FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins manage cafe sessions"
  ON public.cafe_sessions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_cafe_updated BEFORE UPDATE ON public.cafe_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ AUTO-CREATE WALLET FOR NEW USERS ============
CREATE OR REPLACE FUNCTION public.create_wallet_on_signup()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.player_wallets (user_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;

-- Extend existing handle_new_user to also create wallet
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.phone, ''),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user') ON CONFLICT DO NOTHING;
  INSERT INTO public.player_wallets (user_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;

-- Backfill wallets for existing users
INSERT INTO public.player_wallets (user_id)
SELECT id FROM auth.users
ON CONFLICT DO NOTHING;
