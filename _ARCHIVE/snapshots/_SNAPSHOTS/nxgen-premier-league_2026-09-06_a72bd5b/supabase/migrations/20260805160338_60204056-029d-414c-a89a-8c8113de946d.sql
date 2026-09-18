CREATE TABLE public.gallery_photos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT,
  caption TEXT,
  division TEXT,
  game_night DATE,
  image_path TEXT NOT NULL,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT ON public.gallery_photos TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gallery_photos TO authenticated;
GRANT ALL ON public.gallery_photos TO service_role;

ALTER TABLE public.gallery_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Gallery photos are viewable by everyone"
  ON public.gallery_photos FOR SELECT USING (true);
CREATE POLICY "Staff can insert gallery photos"
  ON public.gallery_photos FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Staff can update gallery photos"
  ON public.gallery_photos FOR UPDATE TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Staff can delete gallery photos"
  ON public.gallery_photos FOR DELETE TO authenticated USING (public.is_staff(auth.uid()));

CREATE TRIGGER update_gallery_photos_updated_at
  BEFORE UPDATE ON public.gallery_photos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Anyone can read gallery objects"
  ON storage.objects FOR SELECT USING (bucket_id = 'gallery');
CREATE POLICY "Staff can upload gallery objects"
  ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'gallery' AND public.is_staff(auth.uid()));
CREATE POLICY "Staff can update gallery objects"
  ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'gallery' AND public.is_staff(auth.uid()));
CREATE POLICY "Staff can delete gallery objects"
  ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'gallery' AND public.is_staff(auth.uid()));