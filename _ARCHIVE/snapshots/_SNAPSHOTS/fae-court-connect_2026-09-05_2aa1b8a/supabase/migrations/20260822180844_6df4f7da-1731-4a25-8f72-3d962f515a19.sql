ALTER TABLE public.members DROP CONSTRAINT members_tier_check;
UPDATE public.members SET tier = 'member' WHERE tier IN ('Elite', 'Partner', 'Corporate');
UPDATE public.members SET tier = 'non_member' WHERE tier IS NULL OR tier NOT IN ('member', 'non_member');
ALTER TABLE public.members ALTER COLUMN tier SET DEFAULT 'non_member';
ALTER TABLE public.members ADD CONSTRAINT members_tier_check CHECK (tier IN ('member', 'non_member'));