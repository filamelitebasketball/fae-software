
DROP POLICY IF EXISTS "Anyone can submit contact" ON public.contact_messages;

CREATE POLICY "Anyone can submit contact"
ON public.contact_messages
FOR INSERT
TO anon, authenticated
WITH CHECK (
  length(name) BETWEEN 1 AND 200
  AND length(email) BETWEEN 3 AND 320
  AND length(message) BETWEEN 1 AND 5000
  AND (subject IS NULL OR length(subject) <= 300)
);
