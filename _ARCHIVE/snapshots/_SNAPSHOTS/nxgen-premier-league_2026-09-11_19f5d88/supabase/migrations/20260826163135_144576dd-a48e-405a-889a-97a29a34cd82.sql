DROP POLICY IF EXISTS "Approved teams public, staff & submitter see all" ON public.teams;
CREATE POLICY "Approved teams public, staff & submitter see all"
ON public.teams FOR SELECT
USING (
  status = 'approved'
  OR (auth.uid() IS NOT NULL AND (
        submitted_by = auth.uid()
        OR coach_id = auth.uid()
        OR public.is_staff(auth.uid())
     ))
);