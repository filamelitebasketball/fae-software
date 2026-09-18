CREATE TABLE public.sponsor_inquiries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  company TEXT NOT NULL,
  email TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT INSERT ON public.sponsor_inquiries TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.sponsor_inquiries TO authenticated;
GRANT ALL ON public.sponsor_inquiries TO service_role;
ALTER TABLE public.sponsor_inquiries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can submit a sponsor inquiry" ON public.sponsor_inquiries FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Staff can view sponsor inquiries" ON public.sponsor_inquiries FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff can update sponsor inquiries" ON public.sponsor_inquiries FOR UPDATE TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff can delete sponsor inquiries" ON public.sponsor_inquiries FOR DELETE TO authenticated USING (public.is_staff(auth.uid()));

CREATE TABLE public.seasons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  year INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'in_progress',
  summary TEXT,
  stats_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.seasons TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.seasons TO authenticated;
GRANT ALL ON public.seasons TO service_role;
ALTER TABLE public.seasons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Seasons are public" ON public.seasons FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Staff manage seasons" ON public.seasons FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

CREATE TABLE public.season_champions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  season_id UUID NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
  division TEXT NOT NULL,
  champion TEXT,
  runner_up TEXT,
  mvp TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.season_champions TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.season_champions TO authenticated;
GRANT ALL ON public.season_champions TO service_role;
ALTER TABLE public.season_champions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Season champions are public" ON public.season_champions FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Staff manage season champions" ON public.season_champions FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

INSERT INTO public.seasons (name, year, status, summary, stats_url)
VALUES ('Season 2026', 2026, 'in_progress', 'The inaugural NXGEN Premier League season. Standings, champions and season stats are updated as games are played.', '/standings');

INSERT INTO public.season_champions (season_id, division)
SELECT s.id, d.division FROM public.seasons s,
  (VALUES ('Rising Stars'), ('Legacy'), ('3x3'), ('King of the Court')) AS d(division)
WHERE s.year = 2026;