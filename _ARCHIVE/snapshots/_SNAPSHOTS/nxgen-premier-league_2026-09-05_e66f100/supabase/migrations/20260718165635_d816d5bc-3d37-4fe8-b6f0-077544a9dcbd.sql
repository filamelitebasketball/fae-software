
-- Protected flag on user_roles (marks the master admin)
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS protected BOOLEAN NOT NULL DEFAULT false;

-- Audit log table
CREATE TABLE public.admin_role_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  target_user_id UUID NOT NULL,
  target_name TEXT,
  changed_by_user_id UUID,
  changed_by_name TEXT,
  role public.app_role NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('granted','revoked')),
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.admin_role_audit_log TO authenticated;
GRANT ALL ON public.admin_role_audit_log TO service_role;

ALTER TABLE public.admin_role_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit log"
  ON public.admin_role_audit_log
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_admin_role_audit_log_created_at ON public.admin_role_audit_log(created_at DESC);
CREATE INDEX idx_admin_role_audit_log_target ON public.admin_role_audit_log(target_user_id);
