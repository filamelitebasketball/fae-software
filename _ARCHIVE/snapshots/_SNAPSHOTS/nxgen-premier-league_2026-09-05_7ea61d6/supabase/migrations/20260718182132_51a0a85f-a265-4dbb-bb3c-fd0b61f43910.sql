
-- Allow staff (admins + managers) to view/update all registrations
DROP POLICY IF EXISTS "Admins update any registration" ON public.registrations;
DROP POLICY IF EXISTS "Users view own registrations" ON public.registrations;

CREATE POLICY "Staff view all, users view own" ON public.registrations
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_staff(auth.uid()));

CREATE POLICY "Staff update any registration" ON public.registrations
  FOR UPDATE TO authenticated
  USING (public.is_staff(auth.uid()));

-- Update trigger so managers can also change status
CREATE OR REPLACE FUNCTION public.prevent_registration_privileged_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF public.is_staff(auth.uid()) THEN
    RETURN NEW;
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION 'Only staff can change registration status';
  END IF;
  IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION 'Cannot change registration user_id';
  END IF;
  NEW.created_at := OLD.created_at;
  RETURN NEW;
END;
$$;

-- Site settings (admin-configurable)
CREATE TABLE IF NOT EXISTS public.site_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

GRANT SELECT ON public.site_settings TO anon, authenticated;
GRANT ALL ON public.site_settings TO service_role;

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read site settings" ON public.site_settings
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Admins insert site settings" ON public.site_settings
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update site settings" ON public.site_settings
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete site settings" ON public.site_settings
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Seed defaults
INSERT INTO public.site_settings (key, value) VALUES
  ('registration_open', 'true'::jsonb),
  ('site_announcement', '""'::jsonb),
  ('livestream_url', '""'::jsonb)
ON CONFLICT (key) DO NOTHING;
