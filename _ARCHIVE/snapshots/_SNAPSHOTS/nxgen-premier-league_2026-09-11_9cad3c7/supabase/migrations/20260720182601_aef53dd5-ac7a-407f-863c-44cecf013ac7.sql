
REVOKE EXECUTE ON FUNCTION public.enforce_registration_insert_defaults() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.prevent_registration_privileged_changes() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.create_wallet_on_signup() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_payment_proof_approval() FROM anon, authenticated, PUBLIC;
