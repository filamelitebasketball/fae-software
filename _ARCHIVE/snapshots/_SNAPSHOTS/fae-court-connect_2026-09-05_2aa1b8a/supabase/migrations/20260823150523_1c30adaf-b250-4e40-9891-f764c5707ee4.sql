CREATE POLICY "Admins insert bookings"
ON public.bookings
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));