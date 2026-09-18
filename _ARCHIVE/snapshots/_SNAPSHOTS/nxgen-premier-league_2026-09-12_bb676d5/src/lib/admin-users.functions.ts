import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function ensureAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Response("Forbidden", { status: 403 });
}

export const listUsersWithRoles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: authList, error: authErr } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 200,
    });
    if (authErr) throw new Error(authErr.message);

    const ids = authList.users.map((u) => u.id);
    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, phone")
      .in("id", ids);
    const { data: roles } = await supabaseAdmin
      .from("user_roles")
      .select("user_id, role, protected")
      .in("user_id", ids);

    const profMap = new Map((profiles ?? []).map((p) => [p.id, p]));
    const roleMap = new Map<string, { role: string; protected: boolean }[]>();
    (roles ?? []).forEach((r: any) => {
      const list = roleMap.get(r.user_id) ?? [];
      list.push({ role: r.role, protected: !!r.protected });
      roleMap.set(r.user_id, list);
    });

    return authList.users.map((u) => {
      const rs = roleMap.get(u.id) ?? [];
      return {
        id: u.id,
        email: u.email ?? "",
        full_name: profMap.get(u.id)?.full_name ?? null,
        phone: profMap.get(u.id)?.phone ?? null,
        roles: rs.map((r) => r.role),
        is_master: rs.some((r) => r.role === "admin" && r.protected),
        created_at: u.created_at,
      };
    });
  });

export const setAdminRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({ userId: z.string().uuid(), makeAdmin: z.boolean() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    await ensureAdmin(context.supabase, context.userId);
    if (data.userId === context.userId && !data.makeAdmin) {
      throw new Error("You cannot remove your own admin role.");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Look up target and actor names for a readable audit entry
    const { data: profs } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name")
      .in("id", [data.userId, context.userId]);
    const nameOf = (id: string) =>
      profs?.find((p) => p.id === id)?.full_name ?? null;

    if (data.makeAdmin) {
      const { error } = await supabaseAdmin
        .from("user_roles")
        .insert({ user_id: data.userId, role: "admin" });
      if (error && !error.message.includes("duplicate")) throw new Error(error.message);
    } else {
      // Block removing a protected (master) admin
      const { data: existing } = await supabaseAdmin
        .from("user_roles")
        .select("protected")
        .eq("user_id", data.userId)
        .eq("role", "admin")
        .maybeSingle();
      if (existing?.protected) {
        throw new Error("This is the master admin and cannot be demoted.");
      }
      const { error } = await supabaseAdmin
        .from("user_roles")
        .delete()
        .eq("user_id", data.userId)
        .eq("role", "admin");
      if (error) throw new Error(error.message);
    }

    // Write audit entry (best-effort)
    await supabaseAdmin.from("admin_role_audit_log").insert({
      target_user_id: data.userId,
      target_name: nameOf(data.userId),
      changed_by_user_id: context.userId,
      changed_by_name: nameOf(context.userId),
      role: "admin",
      action: data.makeAdmin ? "granted" : "revoked",
    });

    return { ok: true };
  });

export const setManagerRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({ userId: z.string().uuid(), makeManager: z.boolean() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    await ensureAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: profs } = await supabaseAdmin
      .from("profiles").select("id, full_name").in("id", [data.userId, context.userId]);
    const nameOf = (id: string) => profs?.find((p) => p.id === id)?.full_name ?? null;

    if (data.makeManager) {
      const { error } = await supabaseAdmin
        .from("user_roles").insert({ user_id: data.userId, role: "manager" });
      if (error && !error.message.includes("duplicate")) throw new Error(error.message);
    } else {
      const { error } = await supabaseAdmin
        .from("user_roles").delete().eq("user_id", data.userId).eq("role", "manager");
      if (error) throw new Error(error.message);
    }

    await supabaseAdmin.from("admin_role_audit_log").insert({
      target_user_id: data.userId,
      target_name: nameOf(data.userId),
      changed_by_user_id: context.userId,
      changed_by_name: nameOf(context.userId),
      role: "manager",
      action: data.makeManager ? "granted" : "revoked",
    });
    return { ok: true };
  });


export const listAdminAuditLog = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("admin_role_audit_log")
      .select("id, target_user_id, target_name, changed_by_user_id, changed_by_name, role, action, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return data ?? [];
  });
