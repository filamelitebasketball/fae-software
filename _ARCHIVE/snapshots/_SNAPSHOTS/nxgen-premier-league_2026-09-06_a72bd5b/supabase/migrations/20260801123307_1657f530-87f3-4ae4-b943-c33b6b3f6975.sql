REVOKE EXECUTE ON FUNCTION public.get_consent_request(uuid) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.submit_parental_consent(uuid, text, text, text, text, text) FROM anon, authenticated, PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_consent_request(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.submit_parental_consent(uuid, text, text, text, text, text) TO service_role;