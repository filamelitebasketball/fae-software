DROP POLICY IF EXISTS "Anyone can read gallery objects" ON storage.objects;
CREATE POLICY "Public read gallery (published photos only)"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'gallery' AND (
    is_staff(auth.uid())
    OR EXISTS (SELECT 1 FROM public.gallery_photos g WHERE g.image_path = objects.name)
  )
);

DROP POLICY IF EXISTS "Public read player-photos (public profiles/roster only)" ON storage.objects;
CREATE POLICY "Public read player-photos (public profiles/roster only)"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'player-photos' AND (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id::text = split_part(objects.name, '/', 1)
        AND COALESCE(p.is_public, false) = true
    )
    OR EXISTS (
      SELECT 1 FROM public.players pl
      WHERE pl.photo_url = objects.name
         OR pl.photo_url LIKE '%/player-photos/' || objects.name
    )
  )
);

DROP POLICY IF EXISTS "Public read potg-posts (referenced posts only)" ON storage.objects;
CREATE POLICY "Public read potg-posts (referenced posts only)"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'potg-posts' AND EXISTS (
    SELECT 1 FROM public.player_of_the_game potg
    WHERE potg.image_url = objects.name
       OR potg.image_url LIKE '%/potg-posts/' || objects.name
  )
);