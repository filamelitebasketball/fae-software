
ALTER TABLE public.registrations
  ADD COLUMN IF NOT EXISTS instagram_handle TEXT,
  ADD COLUMN IF NOT EXISTS facebook_handle TEXT,
  ADD COLUMN IF NOT EXISTS twitter_handle TEXT,
  ADD COLUMN IF NOT EXISTS tiktok_handle TEXT;
