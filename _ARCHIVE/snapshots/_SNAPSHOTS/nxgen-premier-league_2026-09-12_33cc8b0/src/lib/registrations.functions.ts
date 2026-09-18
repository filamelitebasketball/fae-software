import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Approving or rejecting a registration changes a column the browser is not
 * allowed to write (the status grant is service-role only), so the decision is
 * made here, on the server, after the caller is confirmed as league staff.
 */
export const setRegistrationStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        registrationId: z.string().uuid(),
        status: z.enum(["approved", "rejected", "pending"]),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: roles, error: roleErr } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .in("role", ["admin", "manager"]);
    if (roleErr) throw new Error(roleErr.message);
    if (!roles || roles.length === 0) throw new Response("Forbidden", { status: 403 });

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("registrations")
      .update({ status: data.status })
      .eq("id", data.registrationId);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });
