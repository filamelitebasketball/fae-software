import { supabase } from "@/integrations/supabase/client";

export type AuditEntity = "team" | "player" | "game" | "score" | "payment" | "import";
export type AuditAction = "created" | "updated" | "deleted" | "approved" | "rejected" | "imported";

/**
 * Best-effort activity log. Row-level security only lets admins/managers write,
 * and only admins read — a failure here must never block the actual operation.
 */
export async function logAdminActivity(
  entity: AuditEntity,
  action: AuditAction,
  opts: { id?: string | null; label?: string | null; details?: string | null } = {},
) {
  try {
    const { data } = await supabase.auth.getUser();
    const user = data.user;
    if (!user) return;
    const { data: prof } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .maybeSingle();
    await supabase.from("admin_activity_log").insert({
      actor_user_id: user.id,
      actor_name: prof?.full_name ?? user.email ?? null,
      entity_type: entity,
      entity_id: opts.id ?? null,
      entity_label: opts.label ?? null,
      action,
      details: opts.details ?? null,
    });
  } catch {
    /* logging is non-critical */
  }
}
