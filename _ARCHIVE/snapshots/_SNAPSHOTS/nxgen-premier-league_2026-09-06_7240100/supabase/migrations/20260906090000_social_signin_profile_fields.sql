-- Social sign-in: fill the profile from whatever the provider actually sends.
--
-- Facebook is now offered on the sign-in page. Providers disagree about where
-- the name and photo live in raw_user_meta_data: Google sends full_name and
-- name, Facebook sends name, some send only given_name/family_name, and the
-- avatar arrives as either avatar_url or picture. The original trigger read
-- full_name then name, so a Facebook signup could land with a blank name and no
-- photo — which shows up as "NXGEN Player" on their card.
--
-- NULLIF is there because these keys arrive as empty strings rather than NULL,
-- and COALESCE would happily keep an empty string.

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(
      NULLIF(NEW.raw_user_meta_data->>'full_name', ''),
      NULLIF(NEW.raw_user_meta_data->>'name', ''),
      NULLIF(TRIM(CONCAT_WS(' ',
        NEW.raw_user_meta_data->>'given_name',
        NEW.raw_user_meta_data->>'family_name')), ''),
      ''
    ),
    COALESCE(NEW.phone, ''),
    COALESCE(
      NULLIF(NEW.raw_user_meta_data->>'avatar_url', ''),
      NULLIF(NEW.raw_user_meta_data->>'picture', '')
    )
  );
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user') ON CONFLICT DO NOTHING;
  INSERT INTO public.player_wallets (user_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $function$;
