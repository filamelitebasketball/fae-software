
-- Public read of both buckets so <img src> works
CREATE POLICY "Public read player-photos" ON storage.objects
  FOR SELECT USING (bucket_id = 'player-photos');
CREATE POLICY "Public read potg-posts" ON storage.objects
  FOR SELECT USING (bucket_id = 'potg-posts');

-- Users can upload/update/delete their own head shot (path prefix = auth.uid())
CREATE POLICY "Users upload own player photo" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'player-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users update own player photo" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'player-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users delete own player photo" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'player-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Staff can also manage player photos (admin edits)
CREATE POLICY "Staff manage player photos" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'player-photos' AND public.is_staff(auth.uid()))
  WITH CHECK (bucket_id = 'player-photos' AND public.is_staff(auth.uid()));

-- Only staff can manage POTG post assets
CREATE POLICY "Staff manage potg-posts" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'potg-posts' AND public.is_staff(auth.uid()))
  WITH CHECK (bucket_id = 'potg-posts' AND public.is_staff(auth.uid()));
