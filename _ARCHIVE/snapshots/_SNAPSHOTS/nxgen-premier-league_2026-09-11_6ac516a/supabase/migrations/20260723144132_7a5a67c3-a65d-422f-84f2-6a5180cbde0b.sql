
DROP POLICY IF EXISTS "Public read player-photos" ON storage.objects;
DROP POLICY IF EXISTS "Public read potg-posts" ON storage.objects;

CREATE POLICY "Public read player-photos (public profiles/roster only)"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (
  bucket_id = 'player-photos'
  AND (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id::text = split_part(storage.objects.name, '/', 1)
        AND COALESCE(p.is_public, false) = true
    )
    OR EXISTS (
      SELECT 1 FROM public.players pl
      WHERE pl.photo_url LIKE '%' || storage.objects.name
    )
  )
);

CREATE POLICY "Public read potg-posts (referenced posts only)"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (
  bucket_id = 'potg-posts'
  AND EXISTS (
    SELECT 1 FROM public.player_of_the_game potg
    WHERE potg.image_url LIKE '%' || storage.objects.name
  )
);
