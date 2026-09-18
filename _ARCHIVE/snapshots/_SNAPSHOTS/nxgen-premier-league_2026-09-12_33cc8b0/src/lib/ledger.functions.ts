import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * The wallet and void tools move real money, so they are no longer callable
 * straight from the browser. They run here, on the server, and only after the
 * caller has been confirmed as league staff.
 */
async function ensureStaff(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .in("role", ["admin", "manager"]);
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) throw new Response("Forbidden", { status: 403 });
}

export const applyWalletDelta = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        userId: z.string().uuid(),
        balanceDelta: z.number().int().default(0),
        tabDelta: z.number().int().default(0),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await ensureStaff(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.rpc("apply_wallet_delta", {
      _user_id: data.userId,
      _balance_delta: data.balanceDelta,
      _tab_delta: data.tabDelta,
      _actor: context.userId,
    } as never);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const voidLedgerEntry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ entryId: z.string().uuid(), reason: z.string().max(500).optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await ensureStaff(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.rpc("void_ledger_entry", {
      _entry_id: data.entryId,
      _reason: data.reason ?? null,
      _actor: context.userId,
    } as never);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });
