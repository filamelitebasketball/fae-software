GRANT SELECT ON public.players TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.players TO authenticated;
GRANT ALL ON public.players TO service_role;