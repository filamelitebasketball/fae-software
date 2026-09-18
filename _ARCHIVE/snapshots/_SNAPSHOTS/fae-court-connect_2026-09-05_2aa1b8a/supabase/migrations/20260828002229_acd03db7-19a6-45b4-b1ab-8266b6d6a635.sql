CREATE OR REPLACE FUNCTION public.has_staff_access(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  select coalesce(auth.uid() = _user_id, false)
     and exists (
       select 1 from public.user_roles
       where user_id = _user_id and role in ('admin','staff')
     )
$$;

REVOKE EXECUTE ON FUNCTION public.has_staff_access(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.has_staff_access(uuid) TO authenticated;

CREATE TABLE public.incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_name text NOT NULL,
  member_id uuid NULL REFERENCES public.members(id) ON DELETE SET NULL,
  severity text NOT NULL DEFAULT 'medium' CHECK (severity IN ('low','medium','high')),
  category text NOT NULL DEFAULT 'other' CHECK (category IN ('behavior','property','payment','safety','rules','other')),
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','warning','resolved','banned')),
  notes text,
  evidence_urls text[] NOT NULL DEFAULT '{}',
  filed_by uuid REFERENCES auth.users(id) DEFAULT auth.uid(),
  filed_by_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz NULL
);

GRANT SELECT, INSERT, UPDATE ON public.incidents TO authenticated;
GRANT ALL ON public.incidents TO service_role;

ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff read incidents" ON public.incidents
  FOR SELECT TO authenticated
  USING (public.has_staff_access(auth.uid()));

CREATE POLICY "Staff create incidents" ON public.incidents
  FOR INSERT TO authenticated
  WITH CHECK (public.has_staff_access(auth.uid()) AND filed_by = auth.uid());

CREATE POLICY "Staff update incidents" ON public.incidents
  FOR UPDATE TO authenticated
  USING (public.has_staff_access(auth.uid()))
  WITH CHECK (public.has_staff_access(auth.uid()));

CREATE INDEX incidents_created_at_idx ON public.incidents (created_at DESC);
