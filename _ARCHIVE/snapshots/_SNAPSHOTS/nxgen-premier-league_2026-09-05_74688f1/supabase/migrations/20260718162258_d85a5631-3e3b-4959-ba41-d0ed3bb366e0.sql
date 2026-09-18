
-- Restrict daily_ledgers SELECT to admins only
DROP POLICY IF EXISTS "Signed-in can view daily ledgers" ON public.daily_ledgers;
CREATE POLICY "Admins view daily ledgers"
  ON public.daily_ledgers FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Restrict inventory_items SELECT to admins only
DROP POLICY IF EXISTS "Anyone signed-in can view active items" ON public.inventory_items;
CREATE POLICY "Admins view inventory"
  ON public.inventory_items FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Harden registrations: prevent self-approval at the policy layer too.
-- The existing prevent_registration_privileged_changes trigger blocks status/user_id
-- changes for non-admins, but we also split the UPDATE policy so non-admins can
-- only update rows AS themselves and the trigger is the sole path to status changes.
DROP POLICY IF EXISTS "Users update own registrations" ON public.registrations;

CREATE POLICY "Users update own registration fields"
  ON public.registrations FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id AND NOT public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (auth.uid() = user_id AND NOT public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins update any registration"
  ON public.registrations FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Revoke direct UPDATE on the status column from authenticated as defense-in-depth.
-- Admin status changes go through the admin policy path via service_role or
-- through the trigger which permits admins.
REVOKE UPDATE (status) ON public.registrations FROM authenticated;
GRANT UPDATE (status) ON public.registrations TO service_role;
