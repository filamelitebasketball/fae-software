import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const getConsentRequest = createServerFn({ method: "GET" })
  .inputValidator((data) => z.object({ token: z.string().uuid() }).parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin.rpc("get_consent_request", {
      _token: data.token,
    });
    if (error) throw new Error("Unable to load this consent request.");
    return rows?.[0] ?? null;
  });

export const submitParentalConsent = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z
      .object({
        token: z.string().uuid(),
        guardianName: z.string().trim().min(2).max(120),
        relationship: z.string().trim().max(60).optional().default(""),
        email: z.string().trim().email().max(255),
        phone: z.string().trim().max(40).optional().default(""),
        signature: z.string().trim().min(2).max(120),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: ok, error } = await supabaseAdmin.rpc("submit_parental_consent", {
      _token: data.token,
      _guardian_name: data.guardianName,
      _relationship: data.relationship,
      _email: data.email,
      _phone: data.phone,
      _signature: data.signature,
    });
    if (error) throw new Error("Unable to record consent. Please check your details.");
    return { ok: !!ok };
  });
