
-- donations
DROP POLICY "Staff update donations" ON public.donations;
CREATE POLICY "Staff update donations" ON public.donations FOR UPDATE TO authenticated USING (is_staff(auth.uid())) WITH CHECK (is_staff(auth.uid()));
DROP POLICY "Users insert own donations" ON public.donations;
CREATE POLICY "Users insert own donations" ON public.donations FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY "Users view own donations, staff view all" ON public.donations;
CREATE POLICY "Users view own donations, staff view all" ON public.donations FOR SELECT TO authenticated USING ((auth.uid() = user_id) OR is_staff(auth.uid()));
REVOKE ALL ON public.donations FROM anon;

-- players coach policy
DROP POLICY "Coach manage own team roster" ON public.players;
CREATE POLICY "Coach manage own team roster" ON public.players FOR ALL TO authenticated
USING (team_id IS NOT NULL AND EXISTS (SELECT 1 FROM teams t WHERE t.id = players.team_id AND t.coach_id = auth.uid()))
WITH CHECK (team_id IS NOT NULL AND EXISTS (SELECT 1 FROM teams t WHERE t.id = players.team_id AND t.coach_id = auth.uid()));

-- registrations select
DROP POLICY "Staff view all, users view own" ON public.registrations;
CREATE POLICY "Staff view all, users view own" ON public.registrations FOR SELECT TO authenticated USING (deleted_at IS NULL AND ((auth.uid() = user_id) OR is_staff(auth.uid())));
REVOKE ALL ON public.registrations FROM anon;

-- teams coach policies
DROP POLICY "Coaches submit team drafts" ON public.teams;
CREATE POLICY "Coaches submit team drafts" ON public.teams FOR INSERT TO authenticated
WITH CHECK (submitted_by = auth.uid() AND status = ANY (ARRAY['draft','pending']) AND EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role::text = 'coach'));
DROP POLICY "Coaches update own drafts" ON public.teams;
CREATE POLICY "Coaches update own drafts" ON public.teams FOR UPDATE TO authenticated
USING (submitted_by = auth.uid() AND status = ANY (ARRAY['draft','pending']))
WITH CHECK (submitted_by = auth.uid() AND status = ANY (ARRAY['draft','pending']));

-- otp_codes: fully fail-closed, no client read path
DROP POLICY IF EXISTS "Staff can view otp codes" ON public.otp_codes;
REVOKE ALL ON public.otp_codes FROM anon, authenticated;
GRANT ALL ON public.otp_codes TO service_role;
