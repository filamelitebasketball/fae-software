import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Bracelet linking, enforced on the server.
 *
 * A bracelet UID is the credential that opens the building door and pays at the
 * cafe, so binding one to an account is a privileged action. It used to run
 * entirely in the browser:
 *
 *   - the only check that the account was verified was a component that
 *     rendered a locked panel, which is a UI state and not a control
 *   - the client wrote `membership_tier = 'rfid_linked'` to its own profile
 *     row straight after inserting, so anyone could promote themselves to Full
 *     Member from the console without ever holding a bracelet
 *   - activate and unlink took a row id with no ownership check beyond RLS
 *
 * Everything now happens here under the service role, after the caller's
 * identity comes from the auth middleware rather than from the request body.
 * The tier is set by the server as a consequence of a successful link; it is
 * never something the client can ask for.
 */

/** Strip separators and normalise to uppercase hex, the form readers emit. */
function normalizeUid(raw: string) {
  return raw.replace(/[\s:-]/g, "").toUpperCase();
}

const UID = z
  .string()
  .min(1)
  .transform(normalizeUid)
  .refine((v) => /^[0-9A-F]{6,64}$/.test(v), "Enter a valid bracelet UID (hex, 6-64 characters).");

/** Shared guard: the account must have verified its email before linking. */
async function requireVerified(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: profile, error } = await supabaseAdmin
    .from("profiles")
    .select("membership_tier")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw new Error("Could not read your account.");
  const tier = profile?.membership_tier;
  if (tier !== "otp_verified" && tier !== "rfid_linked") {
    throw new Error("Verify your email from your account dashboard before linking a bracelet.");
  }
  return supabaseAdmin;
}

export const linkBracelet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ uid: UID, label: z.string().max(60).optional() }).parse(data))
  .handler(async ({ data, context }) => {
    const supabaseAdmin = await requireVerified(context.userId);

    const { error } = await supabaseAdmin.from("bracelets").insert({
      user_id: context.userId,
      uid: data.uid,
      label: data.label?.trim() || null,
    });

    if (error) {
      // 23505 is the unique violation on uid — the bracelet belongs to someone
      // else. Do not say who; that would leak account membership.
      if (error.code === "23505") throw new Error("That bracelet is already linked to an account.");
      throw new Error("Could not link that bracelet.");
    }

    // Promotion is a consequence of a successful link, decided here.
    await supabaseAdmin
      .from("profiles")
      .update({ membership_tier: "rfid_linked" })
      .eq("id", context.userId);

    return { ok: true as const };
  });

export const setBraceletActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ id: z.string().uuid(), active: z.boolean() }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Ownership is part of the filter, so another user's row cannot be touched
    // even if its id is known.
    const { error, count } = await supabaseAdmin
      .from("bracelets")
      .update({ active: data.active }, { count: "exact" })
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error("Could not update that bracelet.");
    if (!count) throw new Error("That bracelet is not on your account.");
    return { ok: true as const };
  });

export const unlinkBracelet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error, count } = await supabaseAdmin
      .from("bracelets")
      .delete({ count: "exact" })
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error("Could not unlink that bracelet.");
    if (!count) throw new Error("That bracelet is not on your account.");

    // Dropping the last bracelet should not leave a Full Member badge behind.
    const { count: left } = await supabaseAdmin
      .from("bracelets")
      .select("id", { count: "exact", head: true })
      .eq("user_id", context.userId);
    if (!left) {
      await supabaseAdmin
        .from("profiles")
        .update({ membership_tier: "otp_verified" })
        .eq("id", context.userId);
    }

    return { ok: true as const };
  });
