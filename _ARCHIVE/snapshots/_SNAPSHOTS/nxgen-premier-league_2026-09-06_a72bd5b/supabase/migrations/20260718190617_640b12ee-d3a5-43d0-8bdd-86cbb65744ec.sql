
-- Revoke EXECUTE on trigger-only SECURITY DEFINER functions from anon/authenticated/public
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.create_wallet_on_signup() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_payment_proof_approval() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.prevent_registration_privileged_changes() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;

-- is_staff should only be callable by authenticated users (not anon)
REVOKE EXECUTE ON FUNCTION public.is_staff(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_staff(uuid) TO authenticated;

-- has_role: only authenticated
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;

-- Public NFC + public player lookups are intentionally callable by anon (public routes need them).
-- Keep get_profile_by_bracelet_uid and get_public_player callable by anon and authenticated.
GRANT EXECUTE ON FUNCTION public.get_profile_by_bracelet_uid(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_player(uuid) TO anon, authenticated;
