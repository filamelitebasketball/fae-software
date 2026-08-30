import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database, Json } from "@/integrations/supabase/types";
import { groupContiguous, priceHours } from "./booking-utils";
import { isMember, type SportKey } from "./constants";
import type { AdminData, BookingResult, TabItem } from "./fae.types";

/* ---------- Profile ---------- */

export const ensureMemberProfile = createServerFn({ method: "POST" })
  .inputValidator((input: { name?: string; phone?: string; sport?: string }) => input ?? {})
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: existing } = await supabase.from("members").select("*").eq("user_id", userId).maybeSingle();
    if (existing) return { member: existing };

    const { data: authData } = await supabase.auth.getUser();
    const user = authData.user;
    const email = user?.email ?? "";
    const meta = (user?.user_metadata ?? {}) as Record<string, unknown>;
    const provider = (user?.app_metadata?.provider as string) ?? "email";
    const name =
      data.name?.trim() ||
      (meta["full_name"] as string) ||
      [meta["first_name"], meta["last_name"]].filter(Boolean).join(" ") ||
      email.split("@")[0] ||
      "Member";

    const { data: inserted, error } = await supabase
      .from("members")
      .insert({
        user_id: userId,
        name,
        email,
        phone: data.phone?.trim() || (meta["phone"] as string) || null,
        sport: data.sport || (meta["sport"] as string) || "basketball",
        provider: provider === "google" ? "Google" : "Email",
      })
      .select()
      .single();
    if (error) {
      if (error.code === "23505") throw new Error("That email is linked to a counter account — ask staff at the desk to merge it.");
      throw new Error(error.message);
    }
    return { member: inserted };
  });

export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: member } = await context.supabase
      .from("members")
      .select("*")
      .eq("user_id", context.userId)
      .maybeSingle();
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    return { member, isAdmin: !!isAdmin };
  });

export const getAdminStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("claim_admin_if_first");
    return { isAdmin: !!isAdmin };
  });

/* ---------- Bookings ---------- */

export const getAvailability = createServerFn({ method: "GET" })
  .inputValidator((input) => z.object({ courtId: z.string(), date: z.string() }).parse(input))
  .handler(async ({ data }) => {
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
    const supabasePublic = createClient<Database>(process.env["SUPABASE_URL"]!, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input, init) => {
          const headers = new Headers(init?.headers);
          if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) headers.delete("Authorization");
          headers.set("apikey", key);
          return fetch(input, { ...init, headers });
        },
      },
    });
    const { data: rows, error } = await supabasePublic.rpc("taken_hours", { _court_id: data.courtId, _date: data.date });
    if (error) throw new Error(error.message);
    const taken: number[] = [];
    for (const row of rows ?? []) {
      for (let h = row.start_hour; h < row.start_hour + row.hours; h++) taken.push(h);
    }
    return { taken };
  });

export const createBooking = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        sport: z.enum(["basketball", "volleyball", "pickleball"]),
        courtId: z.string().min(1),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        hours: z.array(z.number().int().min(6).max(23)).min(1).max(8),
      })
      .parse(input),
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: member } = await supabase.from("members").select("*").eq("user_id", userId).maybeSingle();
    if (!member) throw new Error("Finish setting up your member profile first.");

    // Re-check availability under the user's own session.
    const { data: takenRows, error: takenError } = await supabase.rpc("taken_hours", {
      _court_id: data.courtId,
      _date: data.date,
    });
    if (takenError) throw new Error(takenError.message);
    const taken = new Set<number>();
    for (const row of takenRows ?? []) {
      for (let h = row.start_hour; h < row.start_hour + row.hours; h++) taken.add(h);
    }
    if (data.hours.some((h) => taken.has(h))) {
      throw new Error("One of those hours was just taken — pick another slot.");
    }

    const blocks = groupContiguous(data.hours);
    const results: BookingResult[] = [];

    for (const block of blocks) {
      const amount = priceHours(data.sport as SportKey, data.courtId, block, isMember(member.tier));

      let inserted: BookingResult | null = null;
      for (let attempt = 0; attempt < 4 && !inserted; attempt++) {
        const ref = `FAE-${Math.floor(10000 + Math.random() * 90000)}`;
        const { data: row, error } = await supabase
          .from("bookings")
          .insert({
            member_id: member.id,
            sport: data.sport,
            court_id: data.courtId,
            date: data.date,
            start_hour: block[0]!,
            hours: block.length,
            amount,
            ref,
          })
          .select()
          .single();
        if (error) {
          if (error.code === "23505") continue; // ref collision — retry
          throw new Error(error.message);
        }
        inserted = { ref: row.ref ?? ref, courtId: data.courtId, date: data.date, startHour: row.start_hour, hours: row.hours, amount: row.amount };
      }
      if (!inserted) throw new Error("Could not allocate a booking reference — try again.");
      results.push(inserted);
    }

    return { bookings: results, tier: member.tier };
  });

export const getMyBookings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: member } = await context.supabase
      .from("members")
      .select("*")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!member) return { member: null, bookings: [] };
    const { data: bookings, error } = await context.supabase
      .from("bookings")
      .select("*")
      .eq("member_id", member.id)
      .order("date", { ascending: false })
      .order("start_hour", { ascending: false })
      .limit(60);
    if (error) throw new Error(error.message);
    return { member, bookings: bookings ?? [] };
  });

export const cancelBooking = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: member } = await supabase.from("members").select("id").eq("user_id", userId).maybeSingle();
    if (!member) throw new Error("Member profile not found.");
    const { data: booking } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", data.id)
      .eq("member_id", member.id)
      .maybeSingle();
    if (!booking) throw new Error("Booking not found.");
    if (booking.status === "Cancelled") return { ok: true };

    const slotUtc = Date.parse(`${booking.date}T00:00:00+08:00`) + booking.start_hour * 3600_000;
    const hoursUntil = (slotUtc - Date.now()) / 3600_000;
    if (hoursUntil < 6) throw new Error("Free cancellation ends 6 hours before your slot.");

    const { error } = await supabase.from("bookings").update({ status: "Cancelled" }).eq("id", booking.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ---------- Counter tab (member view) ---------- */

export const getMyTabs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: member } = await context.supabase
      .from("members")
      .select("id")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!member) return { tabs: [] };
    const { data: tabs, error } = await context.supabase
      .from("tabs")
      .select("*")
      .eq("member_id", member.id)
      .eq("settled", false)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { tabs: tabs ?? [] };
  });

/* ---------- Tryouts ---------- */

export const signupTryout = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ sport: z.enum(["basketball", "volleyball", "pickleball"]) }).parse(input))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: member } = await supabase.from("members").select("id").eq("user_id", userId).maybeSingle();
    if (!member) throw new Error("Finish setting up your member profile first.");
    const { error } = await supabase.from("tryouts").insert({ member_id: member.id, sport: data.sport });
    if (error) {
      if (error.code === "23505") return { already: true };
      throw new Error(error.message);
    }
    return { already: false };
  });

/* ---------- Admin ---------- */

export const getAdminData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminData> => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isAdmin) throw new Error("Forbidden");

    // "Today" in Asia/Manila.
    const manilaNow = new Date(Date.now() + 8 * 3600_000);
    const dayStartUtc = Date.UTC(manilaNow.getUTCFullYear(), manilaNow.getUTCMonth(), manilaNow.getUTCDate()) - 8 * 3600_000;
    const dayStartIso = new Date(dayStartUtc).toISOString();

    const [inventory, members, tabs, sales, activity] = await Promise.all([
      supabase.from("inventory").select("*").order("category").order("name"),
      supabase.from("members").select("*").order("joined_at", { ascending: false }),
      supabase.from("tabs").select("*").eq("settled", false).order("created_at", { ascending: false }),
      supabase.from("sales").select("*").gte("created_at", dayStartIso).order("created_at", { ascending: false }),
      supabase.from("activity_log").select("*").order("created_at", { ascending: false }).limit(60),
    ]);

    for (const q of [inventory, members, tabs, sales, activity]) {
      if (q.error) throw new Error(q.error.message);
    }

    return {
      inventory: inventory.data ?? [],
      members: members.data ?? [],
      openTabs: tabs.data ?? [],
      todaySales: sales.data ?? [],
      activity: activity.data ?? [],
    };
  });

export const logSale = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({ memberId: z.string().uuid(), itemId: z.string().uuid(), qty: z.number().int().min(1).max(99) })
      .parse(input),
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isAdmin) throw new Error("Forbidden");

    const { data: item } = await supabase.from("inventory").select("*").eq("id", data.itemId).maybeSingle();
    if (!item) throw new Error("Item not found.");
    if (item.stock != null && item.stock < data.qty) {
      throw new Error(`Only ${item.stock} left of ${item.name}.`);
    }
    const { data: member } = await supabase.from("members").select("*").eq("id", data.memberId).maybeSingle();
    if (!member) throw new Error("Client not found.");

    if (item.stock != null) {
      const { error } = await supabase
        .from("inventory")
        .update({ stock: item.stock - data.qty, updated_at: new Date().toISOString() })
        .eq("id", item.id);
      if (error) throw new Error(error.message);
    }

    const amount = Math.round(item.price * data.qty * 100) / 100;
    const line: TabItem = { name: item.name, qty: data.qty, price: item.price, amount };

    const { data: tab } = await supabase
      .from("tabs")
      .select("*")
      .eq("member_id", data.memberId)
      .eq("settled", false)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const items = [...(((tab?.items as unknown) as TabItem[]) ?? []), line];
    const total = items.reduce((sum, i) => sum + i.amount, 0);

    if (tab) {
      const { error } = await supabase.from("tabs").update({ items: items as unknown as Json, total }).eq("id", tab.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabase
        .from("tabs")
        .insert({ member_id: data.memberId, items: items as unknown as Json, total });
      if (error) throw new Error(error.message);
    }

    await supabase.from("sales").insert({
      member_id: data.memberId,
      item_id: item.id,
      name: item.name,
      category: item.category,
      qty: data.qty,
      amount,
    });
    await supabase.from("activity_log").insert({
      action: `Sale · ${data.qty}× ${item.name}`,
      details: `${member.name} · ₱${amount.toLocaleString()} charged to tab`,
    });

    return { ok: true };
  });

export const restockItem = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ itemId: z.string().uuid(), qty: z.number().int().min(1).max(999) }).parse(input))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isAdmin) throw new Error("Forbidden");

    const { data: item } = await supabase.from("inventory").select("*").eq("id", data.itemId).maybeSingle();
    if (!item) throw new Error("Item not found.");
    if (item.stock == null) throw new Error("Service items don't track stock.");

    const newStock = item.stock + data.qty;
    const { error } = await supabase
      .from("inventory")
      .update({ stock: newStock, updated_at: new Date().toISOString() })
      .eq("id", item.id);
    if (error) throw new Error(error.message);

    await supabase.from("activity_log").insert({
      action: `Restock · ${data.qty}× ${item.name}`,
      details: `Now ${newStock} on hand (par ${item.par_level ?? "—"})`,
    });
    return { ok: true, stock: newStock };
  });

export const settleTab = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ tabId: z.string().uuid() }).parse(input))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isAdmin) throw new Error("Forbidden");

    const { data: tab } = await supabase.from("tabs").select("*").eq("id", data.tabId).maybeSingle();
    if (!tab) throw new Error("Tab not found.");
    const { data: member } = await supabase.from("members").select("name").eq("id", tab.member_id ?? "").maybeSingle();

    const { error } = await supabase.from("tabs").update({ settled: true }).eq("id", tab.id);
    if (error) throw new Error(error.message);

    await supabase.from("activity_log").insert({
      action: `Settled tab · ₱${Number(tab.total).toLocaleString()}`,
      details: member?.name ?? "Walk-in",
    });
    return { ok: true };
  });

export const voidTabItem = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ tabId: z.string().uuid(), index: z.number().int().min(0) }).parse(input))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isAdmin) throw new Error("Forbidden");

    const { data: tab } = await supabase.from("tabs").select("*").eq("id", data.tabId).maybeSingle();
    if (!tab) throw new Error("Tab not found.");

    const items = [...(((tab.items as unknown) as TabItem[]) ?? [])];
    const removed = items.splice(data.index, 1)[0];
    const total = items.reduce((sum, i) => sum + i.amount, 0);

    const { error } = await supabase.from("tabs").update({ items: items as unknown as Json, total }).eq("id", tab.id);
    if (error) throw new Error(error.message);

    if (removed) {
      await supabase.from("activity_log").insert({
        action: `Voided · ${removed.qty}× ${removed.name}`,
        details: `₱${removed.amount.toLocaleString()} removed from tab`,
      });
    }
    return { ok: true };
  });

export const addInventoryItem = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        name: z.string().trim().min(1).max(80),
        category: z.enum(["drinks", "food", "service"]),
        price: z.number().min(0).max(100000),
        stock: z.number().int().min(0).max(99999).nullable(),
        parLevel: z.number().int().min(0).max(99999).nullable(),
      })
      .parse(input),
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isAdmin) throw new Error("Forbidden");

    const prefix = data.category === "drinks" ? "DRK" : data.category === "food" ? "FOD" : "SVC";
    let created = false;
    for (let attempt = 0; attempt < 4 && !created; attempt++) {
      const sku = `${prefix}-${Math.floor(100 + Math.random() * 900)}`;
      const { error } = await supabase.from("inventory").insert({
        name: data.name,
        category: data.category,
        sku,
        price: data.price,
        stock: data.stock,
        par_level: data.parLevel,
      });
      if (error) {
        if (error.code === "23505") continue;
        throw new Error(error.message);
      }
      created = true;
    }
    if (!created) throw new Error("Could not allocate an SKU — try again.");

    await supabase.from("activity_log").insert({
      action: `New item · ${data.name}`,
      details: `${data.category} · ₱${data.price.toLocaleString()}`,
    });
    return { ok: true };
  });

export const addClient = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        name: z.string().trim().min(1).max(80),
        phone: z.string().trim().max(24).optional(),
        tier: z.enum(["non_member", "member"]),
        bandId: z.string().trim().max(24).optional(),
      })
      .parse(input),
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isAdmin) throw new Error("Forbidden");

    const slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "client";
    const email = `${slug}-${Math.floor(1000 + Math.random() * 9000)}@counter.faecourt.ph`;

    const { error } = await supabase.from("members").insert({
      name: data.name,
      email,
      phone: data.phone || null,
      tier: data.tier,
      band_id: data.bandId || "—",
      provider: "Counter",
    });
    if (error) throw new Error(error.message);

    await supabase.from("activity_log").insert({
      action: `New client · ${data.name}`,
      details: `${data.tier}${data.bandId ? ` · Band ${data.bandId}` : ""}`,
    });
    return { ok: true };
  });
