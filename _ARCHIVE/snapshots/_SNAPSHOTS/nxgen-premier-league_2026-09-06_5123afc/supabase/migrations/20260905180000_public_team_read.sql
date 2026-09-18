-- Public visitors could not read the teams table at all.
--
-- The single SELECT policy ended in `public.is_staff(auth.uid())`. Postgres
-- checks EXECUTE on a function in the plan, not only when the branch is taken,
-- so an anonymous request failed outright with "permission denied for function
-- is_staff" rather than quietly returning the approved teams. Every division on
-- the public standings page therefore rendered empty.
--
-- Split by role instead of granting anon the right to call is_staff: an
-- anonymous plan never mentions the function, so there is nothing to permit and
-- nobody can probe whether a given uuid is staff.

DROP POLICY IF EXISTS "Approved teams public, staff & submitter see all" ON public.teams;

CREATE POLICY "Approved teams are public"
ON public.teams FOR SELECT TO anon
USING (status = 'approved');

CREATE POLICY "Members see approved teams and their own"
ON public.teams FOR SELECT TO authenticated
USING (
  status = 'approved'
  OR submitted_by = auth.uid()
  OR coach_id = auth.uid()
  OR public.is_staff(auth.uid())
);

-- Signed-in members still evaluate is_staff, so make the grant explicit rather
-- than leaving it to whatever an earlier revoke sweep happened to leave behind.
GRANT EXECUTE ON FUNCTION public.is_staff(uuid) TO authenticated;
