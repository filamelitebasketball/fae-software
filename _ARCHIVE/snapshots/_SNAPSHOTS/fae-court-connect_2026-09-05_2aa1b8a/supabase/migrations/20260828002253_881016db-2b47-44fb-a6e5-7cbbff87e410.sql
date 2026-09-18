CREATE POLICY "Staff read incident evidence" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'incident-evidence' AND public.has_staff_access(auth.uid()));

CREATE POLICY "Staff upload incident evidence" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'incident-evidence' AND public.has_staff_access(auth.uid()));

CREATE POLICY "Staff update incident evidence" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'incident-evidence' AND public.has_staff_access(auth.uid()));
