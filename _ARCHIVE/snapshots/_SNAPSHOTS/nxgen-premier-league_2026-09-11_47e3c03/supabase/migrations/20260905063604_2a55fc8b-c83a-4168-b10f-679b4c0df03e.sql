DROP POLICY "Anyone can submit a sponsor inquiry" ON public.sponsor_inquiries;

CREATE POLICY "Anyone can submit a sponsor inquiry"
ON public.sponsor_inquiries
FOR INSERT
WITH CHECK (
  length(name) >= 1 AND length(name) <= 200
  AND length(company) >= 1 AND length(company) <= 200
  AND length(email) >= 3 AND length(email) <= 320
  AND length(message) >= 1 AND length(message) <= 5000
);