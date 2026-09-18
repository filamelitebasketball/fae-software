CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TABLE public.bracelets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  uid TEXT NOT NULL UNIQUE,
  label TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  issued_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bracelets TO authenticated;
GRANT ALL ON public.bracelets TO service_role;

ALTER TABLE public.bracelets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own bracelets" ON public.bracelets
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users insert own bracelets" ON public.bracelets
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own bracelets" ON public.bracelets
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users delete own bracelets" ON public.bracelets
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE INDEX bracelets_user_id_idx ON public.bracelets(user_id);

CREATE TRIGGER update_bracelets_updated_at
  BEFORE UPDATE ON public.bracelets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();