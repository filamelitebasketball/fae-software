-- 1. Bracelets: require staff verification before a bracelet is active
ALTER TABLE public.bracelets ALTER COLUMN active SET DEFAULT false;

CREATE OR REPLACE FUNCTION public.enforce_bracelet_activation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_staff(auth.uid()) THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.active := false;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.active AND NOT COALESCE(OLD.active, false) THEN
      RAISE EXCEPTION 'Only league staff can activate a bracelet';
    END IF;
    NEW.user_id := OLD.user_id;
    NEW.uid := OLD.uid;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_bracelet_activation() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS enforce_bracelet_activation_ins ON public.bracelets;
CREATE TRIGGER enforce_bracelet_activation_ins
BEFORE INSERT ON public.bracelets
FOR EACH ROW EXECUTE FUNCTION public.enforce_bracelet_activation();

DROP TRIGGER IF EXISTS enforce_bracelet_activation_upd ON public.bracelets;
CREATE TRIGGER enforce_bracelet_activation_upd
BEFORE UPDATE ON public.bracelets
FOR EACH ROW EXECUTE FUNCTION public.enforce_bracelet_activation();

-- Staff can view/manage bracelets for verification
DROP POLICY IF EXISTS "Staff manage bracelets" ON public.bracelets;
CREATE POLICY "Staff manage bracelets" ON public.bracelets
FOR ALL TO authenticated
USING (public.is_staff(auth.uid()))
WITH CHECK (public.is_staff(auth.uid()));

-- 2. Players: hide profile_id from public/authenticated reads
REVOKE SELECT ON public.players FROM anon, authenticated;
GRANT SELECT (id, name, photo_url, team_id, division, jersey_number, position, bio,
              season_pts, season_reb, season_ast, season_stl, season_blk, games_played,
              created_at, updated_at)
  ON public.players TO anon, authenticated;
GRANT ALL ON public.players TO service_role;