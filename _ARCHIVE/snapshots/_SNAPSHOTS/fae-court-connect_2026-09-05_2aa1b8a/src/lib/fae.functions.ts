import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database, Json } from "@/integrations/supabase/types";
import { groupContiguous, priceHours } from "./booking-utils";
import { SPORTS, isMember, type SportKey } from "./constants";
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

    // An unpaid hold is never locked in: the member can drop it whenever, which
    // is what makes an accidental double-booking self-serviceable. Once a
    // deposit is verified the slot is genuinely theirs, so the 6-hour rule applies.
    const hasDeposit = Number(booking.deposit_paid ?? 0) > 0;
    if (hasDeposit) {
      const slotUtc = Date.parse(`${booking.date}T00:00:00+08:00`) + booking.start_hour * 3600_000;
      const hoursUntil = (slotUtc - Date.now()) / 3600_000;
      if (hoursUntil < 6) throw new Error("Free cancellation ends 6 hours before your slot.");
    }

    const { error } = await supabase.from("bookings").update({ status: "Cancelled" }).eq("id", booking.id);
    if (error) throw new Error(error.message);

    await supabase.from("activity_log").insert({
      action: `Booking cancelled by member · ${booking.ref ?? booking.id.slice(0, 8)}`,
      details: hasDeposit ? "Had a verified deposit" : "Unpaid hold released",
      booking_id: booking.id,
      actor_id: userId,
    });

    return { ok: true };
  });

/** Minutes an unpaid hold blocks a slot before someone who pays can take it. */
export const HOLD_GRACE_MINUTES = 120;

/** Milliseconds left on an unpaid hold; 0 once it has lapsed. */
export function holdRemainingMs(createdAt: string | null, depositPaid: number): number {
  if (depositPaid > 0 || !createdAt) return 0;
  return Math.max(0, Date.parse(createdAt) + HOLD_GRACE_MINUTES * 60_000 - Date.now());
}

/**
 * Release lapsed unpaid holds that collide with this slot, so a paying member
 * can claim it. Only touches bookings with no verified deposit whose grace
 * window has run out.
 */
export const claimLapsedHolds = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        courtId: z.string().min(1),
        date: z.string(),
        startHour: z.number().int().min(0).max(23),
        hours: z.number().int().min(1).max(18),
      })
      .parse(input),
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Members cannot read or update each other's bookings under RLS, so the
    // release runs through a SECURITY DEFINER function that is hard-limited to
    // rows already forfeit: no verified deposit, not cancelled, past the grace
    // window, and overlapping the requested slot.
    const { data: released, error } = await supabase.rpc("release_lapsed_holds", {
      _court_id: data.courtId,
      _date: data.date,
      _start_hour: data.startHour,
      _hours: data.hours,
      _grace_minutes: HOLD_GRACE_MINUTES,
    });
    if (error) throw new Error(error.message);

    const count = Number(released ?? 0);
    if (count > 0) {
      await supabase.from("activity_log").insert({
        action: `Unpaid holds released · ${count}`,
        details: `${data.courtId} · ${data.date} · no deposit within ${HOLD_GRACE_MINUTES} minutes`,
        actor_id: userId,
      });
    }

    return { released: count };
  });

/** Member drops their own WiFi order while it is still unpaid. */
export const cancelWifiOrder = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: member } = await supabase
      .from("members")
      .select("id, name")
      .eq("user_id", userId)
      .maybeSingle();
    if (!member) throw new Error("Member profile not found.");

    const { data: order } = await supabase
      .from("wifi_orders")
      .select("*")
      .eq("id", data.id)
      .eq("member_id", member.id)
      .maybeSingle();
    if (!order) throw new Error("Order not found.");
    if (order.status === "Cancelled") return { ok: true };
    // Once paid or switched on, only staff can reverse it.
    if (order.status !== "Pending") {
      throw new Error("This pass is already paid — ask the counter to void it.");
    }

    const { error } = await supabase
      .from("wifi_orders")
      .update({ status: "Cancelled", updated_at: new Date().toISOString(), updated_by: member.name })
      .eq("id", order.id);
    if (error) throw new Error(error.message);

    await supabase.from("activity_log").insert({
      action: `WiFi order cancelled · ${member.name}`,
      details: `${order.plan_name} · ${order.code}`,
      actor_id: userId,
      actor_name: member.name,
    });

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

    const [inventory, members, tabs, settledTabs, sales, activity, recentBookings] = await Promise.all([
      supabase.from("inventory").select("*").order("category").order("name"),
      supabase.from("members").select("*").order("joined_at", { ascending: false }),
      supabase.from("tabs").select("*").eq("settled", false).order("created_at", { ascending: false }),
      supabase.from("tabs").select("*").eq("settled", true).order("created_at", { ascending: false }).limit(40),
      supabase.from("sales").select("*").gte("created_at", dayStartIso).order("created_at", { ascending: false }),
      supabase.from("activity_log").select("*").order("created_at", { ascending: false }).limit(60),
      supabase.from("bookings").select("*").order("date", { ascending: false }).order("start_hour", { ascending: false }).limit(200),
    ]);

    for (const q of [inventory, members, tabs, settledTabs, sales, activity, recentBookings]) {
      if (q.error) throw new Error(q.error.message);
    }

    return {
      inventory: inventory.data ?? [],
      members: members.data ?? [],
      openTabs: tabs.data ?? [],
      settledTabs: settledTabs.data ?? [],
      todaySales: sales.data ?? [],
      activity: activity.data ?? [],
      recentBookings: recentBookings.data ?? [],
    };
  });

export const getWeekBookings = createServerFn({ method: "GET" })
  .inputValidator((input) =>
    z
      .object({
        start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        sport: z.enum(["basketball", "volleyball", "pickleball", "all"]).default("all"),
      })
      .parse(input),
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isAdmin) throw new Error("Forbidden");

    let query = supabase
      .from("bookings")
      .select("*")
      .gte("date", data.start)
      .lte("date", data.end)
      .order("date")
      .order("start_hour");
    if (data.sport !== "all") query = query.eq("sport", data.sport);
    const { data: bookings, error } = await query;
    if (error) throw new Error(error.message);
    return { bookings: bookings ?? [] };
  });

export const createAdminBooking = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        memberId: z.string().uuid(),
        sport: z.enum(["basketball", "volleyball", "pickleball"]),
        courtId: z.string().min(1),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        startHour: z.number().int().min(0).max(23),
        hours: z.number().int().min(1).max(8),
        status: z.enum(["Unpaid", "Paid"]).default("Unpaid"),
        channel: z.enum(["Counter", "Internal"]).default("Counter"),
      })
      .parse(input),
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isAdmin) throw new Error("Forbidden");

    const { data: member } = await supabase.from("members").select("*").eq("id", data.memberId).maybeSingle();
    if (!member) throw new Error("Client not found.");

    const hours = Array.from({ length: data.hours }, (_, i) => data.startHour + i);
    const { data: takenRows, error: takenError } = await supabase.rpc("taken_hours", {
      _court_id: data.courtId,
      _date: data.date,
    });
    if (takenError) throw new Error(takenError.message);
    const taken = new Set<number>();
    for (const row of takenRows ?? []) {
      for (let h = row.start_hour; h < row.start_hour + row.hours; h++) taken.add(h);
    }
    if (hours.some((h) => taken.has(h))) throw new Error("That slot overlaps an existing booking.");

    const amount = priceHours(data.sport as SportKey, data.courtId, hours, isMember(member.tier));

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
          start_hour: data.startHour,
          hours: data.hours,
          amount,
          status: data.status,
          channel: data.channel,
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

    await supabase.from("activity_log").insert({
      action: `Booking · ${member.name}`,
      details: `${data.sport} · ${data.date} ${data.startHour}:00 · ${data.hours}h · ₱${amount.toLocaleString()} (${data.channel})`,
    });

    return { booking: inserted };
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

/* ---------- Schedule board (staff/admin) ---------- */

/** Throws unless the caller has staff or admin access. Returns their display name for the audit log. */
async function requireStaff(supabase: SupabaseClient<Database>, userId: string): Promise<string> {
  const { data: ok } = await supabase.rpc("has_staff_access", { _user_id: userId });
  if (!ok) throw new Error("Forbidden");
  const { data: member } = await supabase.from("members").select("name").eq("user_id", userId).maybeSingle();
  return member?.name ?? "Staff";
}

const STATUSES = ["Confirmed", "Pending", "Cancelled", "Paid - Cash", "Paid - GCash", "Paid - Other", "Unpaid"] as const;

export const getSchedule = createServerFn({ method: "GET" })
  .inputValidator((input) =>
    z.object({ start: z.string(), days: z.number().int().min(1).max(31).default(7) }).parse(input),
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await requireStaff(supabase, userId);

    const startMs = Date.parse(`${data.start}T00:00:00+08:00`);
    const end = new Date(startMs + (data.days - 1) * 86_400_000).toISOString().slice(0, 10);

    const { data: rows, error } = await supabase
      .from("bookings")
      .select("*")
      .gte("date", data.start)
      .lte("date", end)
      .order("date")
      .order("start_hour");
    if (error) throw new Error(error.message);
    return { bookings: rows ?? [], start: data.start, end };
  });

export const saveBooking = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        id: z.string().uuid().optional(),
        sport: z.string().min(1),
        courtId: z.string().min(1),
        date: z.string(),
        startHour: z.number().int().min(0).max(23),
        hours: z.number().int().min(1).max(18),
        bookerName: z.string().trim().min(1, "Renter name is required."),
        contact: z.string().trim().optional(),
        purpose: z.string().trim().optional(),
        amount: z.number().min(0),
        status: z.enum(STATUSES).default("Confirmed"),
      })
      .parse(input),
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const actorName = await requireStaff(supabase, userId);

    // Overlap guard: same court + date, ignoring cancelled rows and the row being edited.
    const { data: sameDay, error: clashErr } = await supabase
      .from("bookings")
      .select("id, start_hour, hours, booker_name, status")
      .eq("court_id", data.courtId)
      .eq("date", data.date);
    if (clashErr) throw new Error(clashErr.message);

    const newEnd = data.startHour + data.hours;
    const clash = (sameDay ?? []).find(
      (b) =>
        b.id !== data.id &&
        b.status !== "Cancelled" &&
        data.startHour < b.start_hour + b.hours &&
        b.start_hour < newEnd,
    );
    if (clash) {
      const to12 = (h: number) => `${((h + 11) % 12) + 1}${h < 12 ? "AM" : "PM"}`;
      throw new Error(
        `That slot overlaps ${clash.booker_name ?? "an existing booking"} (${to12(clash.start_hour)}–${to12(clash.start_hour + clash.hours)}).`,
      );
    }

    const payload = {
      sport: data.sport,
      court_id: data.courtId,
      date: data.date,
      start_hour: data.startHour,
      hours: data.hours,
      booker_name: data.bookerName,
      contact: data.contact || null,
      purpose: data.purpose || null,
      amount: data.amount,
      status: data.status,
      channel: "Counter",
      updated_at: new Date().toISOString(),
      updated_by: userId,
    };

    let bookingId = data.id;
    let before: string | null = null;

    if (data.id) {
      const { data: prev } = await supabase.from("bookings").select("*").eq("id", data.id).maybeSingle();
      if (!prev) throw new Error("Booking not found.");
      before = `${prev.booker_name ?? "—"} · ${prev.date} ${prev.start_hour}:00 ×${prev.hours}h · ${prev.status ?? "—"} · ₱${prev.amount}`;
      const { error } = await supabase.from("bookings").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
    } else {
      const ref = `FAE-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
      const { data: inserted, error } = await supabase
        .from("bookings")
        .insert({ ...payload, ref })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      bookingId = inserted.id;
    }

    const after = `${data.bookerName} · ${data.date} ${data.startHour}:00 ×${data.hours}h · ${data.status} · ₱${data.amount}`;
    await supabase.from("activity_log").insert({
      action: data.id ? `Booking edited · ${data.bookerName}` : `Booking added · ${data.bookerName}`,
      details: `${data.courtId} · ${data.date}`,
      booking_id: bookingId ?? null,
      actor_id: userId,
      actor_name: actorName,
      before_after: before ? `${before}  →  ${after}` : after,
    });

    return { ok: true, id: bookingId };
  });

export const deleteBooking = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ id: z.string().uuid(), hard: z.boolean().default(false) }).parse(input))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const actorName = await requireStaff(supabase, userId);

    const { data: prev } = await supabase.from("bookings").select("*").eq("id", data.id).maybeSingle();
    if (!prev) throw new Error("Booking not found.");
    const before = `${prev.booker_name ?? "—"} · ${prev.date} ${prev.start_hour}:00 ×${prev.hours}h · ${prev.status ?? "—"}`;

    if (data.hard) {
      const { error } = await supabase.from("bookings").delete().eq("id", data.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabase
        .from("bookings")
        .update({ status: "Cancelled", updated_at: new Date().toISOString(), updated_by: userId })
        .eq("id", data.id);
      if (error) throw new Error(error.message);
    }

    await supabase.from("activity_log").insert({
      action: `${data.hard ? "Booking deleted" : "Booking cancelled"} · ${prev.booker_name ?? "—"}`,
      details: `${prev.court_id} · ${prev.date}`,
      booking_id: data.hard ? null : data.id,
      actor_id: userId,
      actor_name: actorName,
      before_after: `${before}  →  ${data.hard ? "deleted" : "Cancelled"}`,
    });

    return { ok: true };
  });

/* ---------- Booking payments: 50% deposit + proof of payment ---------- */

/** Reserving a slot takes half up front; the rest is due on arrival. */
export const DEPOSIT_RATE = 0.5;

const ELECTRONIC = ["GCash", "Maya", "Bank Transfer"] as const;
const ALL_METHODS = [...ELECTRONIC, "Cash", "Other"] as const;

export const depositDue = (amount: number) => Math.ceil(amount * DEPOSIT_RATE);

/** Member submits a payment they have already sent, with a reference and optional proof image. */
export const submitBookingPayment = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        bookingId: z.string().uuid(),
        kind: z.enum(["Deposit", "Balance"]),
        amount: z.number().positive(),
        method: z.enum(ALL_METHODS),
        reference: z.string().trim().max(120).optional(),
        proofPath: z.string().trim().max(400).optional(),
        note: z.string().trim().max(400).optional(),
      })
      .parse(input),
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // A deposit reserves the slot, so it must be traceable — cash can only settle the balance.
    if (data.kind === "Deposit" && !ELECTRONIC.includes(data.method as (typeof ELECTRONIC)[number])) {
      throw new Error("The reservation deposit must be sent by GCash, Maya or bank transfer.");
    }

    const { data: member } = await supabase
      .from("members")
      .select("id, name")
      .eq("user_id", userId)
      .maybeSingle();

    const { data: booking } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", data.bookingId)
      .maybeSingle();
    if (!booking) throw new Error("Booking not found.");

    const isStaff = await supabase
      .rpc("has_staff_access", { _user_id: userId })
      .then((r) => !!r.data);
    if (!isStaff && (!member || booking.member_id !== member.id)) throw new Error("Forbidden");

    const { error } = await supabase.from("booking_payments").insert({
      booking_id: data.bookingId,
      kind: data.kind,
      amount: data.amount,
      method: data.method,
      reference: data.reference || null,
      proof_path: data.proofPath || null,
      note: data.note || null,
      status: "Submitted",
      submitted_by: userId,
      submitted_by_name: member?.name ?? "Staff",
    });
    if (error) throw new Error(error.message);

    await supabase.from("activity_log").insert({
      action: `Payment submitted · ${member?.name ?? "Staff"}`,
      details: `${data.kind} ${data.method} ₱${data.amount}${data.reference ? ` · ref ${data.reference}` : ""}`,
      booking_id: data.bookingId,
      actor_id: userId,
      actor_name: member?.name ?? "Staff",
    });

    return { ok: true };
  });

export const getMyBookingPayments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: member } = await supabase.from("members").select("id").eq("user_id", userId).maybeSingle();
    if (!member) return { payments: [] };
    const { data: bookings } = await supabase.from("bookings").select("id").eq("member_id", member.id);
    const ids = (bookings ?? []).map((b) => b.id);
    if (!ids.length) return { payments: [] };
    const { data, error } = await supabase
      .from("booking_payments")
      .select("*")
      .in("booking_id", ids)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { payments: data ?? [] };
  });

/** Staff queue: everything submitted, newest first, with its booking attached. */
export const getPaymentQueue = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await requireStaff(supabase, userId);
    const { data, error } = await supabase
      .from("booking_payments")
      .select("*, bookings(*)")
      .order("created_at", { ascending: false })
      .limit(120);
    if (error) throw new Error(error.message);
    return { payments: data ?? [] };
  });

/** Staff verifies or rejects. Verifying rolls the amount into the booking's paid totals. */
export const reviewBookingPayment = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(["Verified", "Rejected"]),
        note: z.string().trim().max(400).optional(),
      })
      .parse(input),
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const actorName = await requireStaff(supabase, userId);

    const { data: pay } = await supabase.from("booking_payments").select("*").eq("id", data.id).maybeSingle();
    if (!pay) throw new Error("Payment not found.");
    if (pay.status === data.status) return { ok: true };

    const { error } = await supabase
      .from("booking_payments")
      .update({
        status: data.status,
        reviewed_by: actorName,
        reviewed_at: new Date().toISOString(),
        ...(data.note ? { note: data.note } : {}),
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);

    const { data: booking } = await supabase.from("bookings").select("*").eq("id", pay.booking_id).maybeSingle();
    if (booking) {
      // Recompute from verified rows so re-reviewing can never double-count.
      const { data: verified } = await supabase
        .from("booking_payments")
        .select("kind, amount")
        .eq("booking_id", pay.booking_id)
        .eq("status", "Verified");
      const sum = (kind: string) =>
        (verified ?? []).filter((v) => v.kind === kind).reduce((s, v) => s + Number(v.amount), 0);
      const deposit = sum("Deposit");
      const balance = sum("Balance");
      const total = Number(booking.amount);
      const settled = deposit + balance >= total;

      await supabase
        .from("bookings")
        .update({
          deposit_paid: deposit,
          balance_paid: balance,
          status: settled ? "Paid - Other" : deposit > 0 ? "Partial" : booking.status,
          updated_at: new Date().toISOString(),
          updated_by: userId,
        })
        .eq("id", pay.booking_id);
    }

    await supabase.from("activity_log").insert({
      action: `Payment ${data.status.toLowerCase()} · ${pay.submitted_by_name ?? "—"}`,
      details: `${pay.kind} ${pay.method} ₱${pay.amount}`,
      booking_id: pay.booking_id,
      actor_id: userId,
      actor_name: actorName,
      before_after: `${pay.status} → ${data.status}`,
    });

    return { ok: true };
  });

/** Staff-only: block out a slot for an event (clinic, league night, corporate booking). */
export const createEventBooking = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        eventName: z.string().trim().min(1, "Event name is required."),
        sport: z.string().min(1),
        courtId: z.string().min(1),
        date: z.string(),
        startHour: z.number().int().min(0).max(23),
        hours: z.number().int().min(1).max(18),
        amount: z.number().min(0),
        contact: z.string().trim().optional(),
        purpose: z.string().trim().optional(),
      })
      .parse(input),
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const actorName = await requireStaff(supabase, userId);

    const { data: sameDay } = await supabase
      .from("bookings")
      .select("id, start_hour, hours, booker_name, status")
      .eq("court_id", data.courtId)
      .eq("date", data.date);
    const end = data.startHour + data.hours;
    const clash = (sameDay ?? []).find(
      (b) => b.status !== "Cancelled" && data.startHour < b.start_hour + b.hours && b.start_hour < end,
    );
    if (clash) throw new Error(`That slot overlaps ${clash.booker_name ?? "an existing booking"}.`);

    const ref = `EVT-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
    const { data: inserted, error } = await supabase
      .from("bookings")
      .insert({
        sport: data.sport,
        court_id: data.courtId,
        date: data.date,
        start_hour: data.startHour,
        hours: data.hours,
        booker_name: data.eventName,
        event_name: data.eventName,
        is_event: true,
        contact: data.contact || null,
        purpose: data.purpose || "Event",
        amount: data.amount,
        status: "Confirmed",
        channel: "Event",
        ref,
        updated_at: new Date().toISOString(),
        updated_by: userId,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    await supabase.from("activity_log").insert({
      action: `Event booked · ${data.eventName}`,
      details: `${data.courtId} · ${data.date} · ${ref}`,
      booking_id: inserted.id,
      actor_id: userId,
      actor_name: actorName,
    });

    return { ok: true, ref };
  });

/* ---------- WiFi ordering (internet cafe) ---------- */

/** Human-friendly voucher code, e.g. FAE-7K2Q-91X. Ambiguous characters are left out on purpose. */
function wifiCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const pick = (n: number) =>
    Array.from({ length: n }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
  return `FAE-${pick(4)}-${pick(3)}`;
}

export const getWifiPlans = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("wifi_plans")
      .select("*")
      .eq("active", true)
      .order("sort_order");
    if (error) throw new Error(error.message);
    return { plans: data ?? [] };
  });

export const getMyWifiOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: member } = await supabase.from("members").select("id").eq("user_id", userId).maybeSingle();
    if (!member) return { orders: [] };
    const { data, error } = await supabase
      .from("wifi_orders")
      .select("*")
      .eq("member_id", member.id)
      .order("created_at", { ascending: false })
      .limit(40);
    if (error) throw new Error(error.message);
    return { orders: data ?? [] };
  });

export const orderWifi = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ planId: z.string().uuid() }).parse(input))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: member } = await supabase
      .from("members")
      .select("id, name")
      .eq("user_id", userId)
      .maybeSingle();
    if (!member) throw new Error("Member profile not found.");

    const { data: plan } = await supabase
      .from("wifi_plans")
      .select("*")
      .eq("id", data.planId)
      .eq("active", true)
      .maybeSingle();
    if (!plan) throw new Error("That WiFi plan is no longer available.");

    const code = wifiCode();
    const { data: order, error } = await supabase
      .from("wifi_orders")
      .insert({
        member_id: member.id,
        plan_id: plan.id,
        plan_name: plan.name,
        minutes: plan.minutes,
        devices: plan.devices,
        amount: plan.price,
        buyer_name: member.name,
        code,
        status: "Pending",
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);

    await supabase.from("activity_log").insert({
      action: `WiFi ordered · ${member.name}`,
      details: `${plan.name} · ${code}`,
      actor_id: userId,
      actor_name: member.name,
    });

    return { order };
  });

export const getWifiOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await requireStaff(supabase, userId);
    const [orders, plans] = await Promise.all([
      supabase.from("wifi_orders").select("*").order("created_at", { ascending: false }).limit(120),
      supabase.from("wifi_plans").select("*").order("sort_order"),
    ]);
    if (orders.error) throw new Error(orders.error.message);
    if (plans.error) throw new Error(plans.error.message);
    return { orders: orders.data ?? [], plans: plans.data ?? [] };
  });

export const updateWifiOrder = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(["Pending", "Paid", "Active", "Expired", "Cancelled"]),
        paymentMethod: z.string().trim().optional(),
      })
      .parse(input),
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const actorName = await requireStaff(supabase, userId);

    const { data: prev } = await supabase.from("wifi_orders").select("*").eq("id", data.id).maybeSingle();
    if (!prev) throw new Error("Order not found.");

    // Activating starts the clock: expiry is derived from the plan's minutes.
    const now = new Date();
    const activating = data.status === "Active" && prev.status !== "Active";
    const patch = {
      status: data.status,
      updated_at: now.toISOString(),
      updated_by: actorName,
      ...(data.paymentMethod ? { payment_method: data.paymentMethod } : {}),
      ...(activating
        ? {
            activated_at: now.toISOString(),
            expires_at: new Date(now.getTime() + prev.minutes * 60_000).toISOString(),
          }
        : {}),
    };

    const { error } = await supabase.from("wifi_orders").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);

    await supabase.from("activity_log").insert({
      action: `WiFi ${data.status.toLowerCase()} · ${prev.buyer_name ?? "Walk-in"}`,
      details: `${prev.plan_name} · ${prev.code}`,
      actor_id: userId,
      actor_name: actorName,
      before_after: `${prev.status} → ${data.status}`,
    });

    return { ok: true };
  });

/* ---------- Google Sheet import ---------- */

/** Minimal RFC-4180 CSV parser (handles quoted fields, embedded commas and doubled quotes). */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (c !== "\r") field += c;
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

/** "6:30 AM" -> 6.5. Returns null when unparseable. */
function parseSlot(label: string): number | null {
  const m = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(label.trim());
  if (!m) return null;
  let h = Number(m[1]) % 12;
  if (m[3]!.toUpperCase() === "PM") h += 12;
  return h + (Number(m[2]) >= 30 ? 0.5 : 0);
}

function parseMoney(v: string): number {
  const n = Number(v.replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

/** The sheet mixes both sports in one grid, so infer the sport from the renter text. */
function inferSport(name: string): SportKey {
  const n = name.toLowerCase();
  if (n.includes("volley")) return "volleyball";
  if (n.includes("pickle")) return "pickleball";
  return "basketball";
}

const SHEET_STATUSES = new Set(STATUSES as readonly string[]);

export type SheetBooking = {
  date: string;
  startHour: number;
  hours: number;
  bookerName: string;
  amount: number;
  status: string;
  sport: SportKey;
  courtId: string;
  duplicate: boolean;
};

export const importSheetWeek = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        sheetId: z.string().min(10),
        gid: z.string().default("0"),
        commit: z.boolean().default(false),
      })
      .parse(input),
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const actorName = await requireStaff(supabase, userId);

    const url = `https://docs.google.com/spreadsheets/d/${data.sheetId}/gviz/tq?tqx=out:csv&gid=${data.gid}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Could not read the sheet (HTTP ${res.status}). Make sure link sharing is on.`);
    const grid = parseCsv(await res.text());

    // Layout: a header row whose 3rd cell is "RENTER NAME"; the row two above it holds the week's start date.
    const headerIdx = grid.findIndex((r) => (r[2] ?? "").trim().toUpperCase() === "RENTER NAME");
    if (headerIdx < 1) throw new Error("This tab doesn't look like a weekly schedule (no RENTER NAME header).");

    const weekLabel = (grid[headerIdx - 3]?.[2] ?? "").trim();
    // Parsed as UTC on purpose: these become plain YYYY-MM-DD date strings, so any
    // offset would shift the whole week by a day.
    const weekMs = Date.parse(`${weekLabel} 00:00:00 GMT+0000`);
    if (!Number.isFinite(weekMs)) throw new Error(`Could not read the week date ("${weekLabel}").`);
    const dayIso = (d: number) => new Date(weekMs + d * 86_400_000).toISOString().slice(0, 10);

    // Walk each day column, grouping contiguous half-hour rows that carry the same renter name.
    const found: SheetBooking[] = [];
    let skippedLate = 0;

    for (let d = 0; d < 7; d++) {
      const nameCol = 2 + d * 3;
      let block: { name: string; start: number; slots: number; amount: number; status: string } | null = null;

      const flush = () => {
        if (!block) return;
        const startHour = Math.floor(block.start);
        const hours = Math.max(1, Math.ceil((block.start + block.slots * 0.5) - startHour));
        const sport = inferSport(block.name);
        found.push({
          date: dayIso(d),
          startHour,
          hours,
          bookerName: block.name,
          amount: block.amount,
          status: SHEET_STATUSES.has(block.status) ? block.status : "Confirmed",
          sport,
          courtId: SPORTS[sport].courts[0]!.id,
          duplicate: false,
        });
        block = null;
      };

      for (let r = headerIdx + 1; r < grid.length; r++) {
        const slot = parseSlot(grid[r]?.[1] ?? "");
        const name = (grid[r]?.[nameCol] ?? "").trim();
        if (slot === null) {
          flush();
          continue;
        }
        // Rows past 11:30 PM belong to the next calendar day; the board only renders 6 AM onward.
        if (slot < 6) {
          if (name) skippedLate++;
          flush();
          continue;
        }
        if (!name) {
          flush();
          continue;
        }
        const amount = parseMoney(grid[r]?.[nameCol + 1] ?? "");
        const status = (grid[r]?.[nameCol + 2] ?? "").trim();
        if (block && block.name.toLowerCase() === name.toLowerCase()) {
          block.slots++;
          block.amount += amount;
          if (!block.status && status) block.status = status;
        } else {
          flush();
          block = { name, start: slot, slots: 1, amount, status };
        }
      }
      flush();
    }

    // Flag rows already present so a re-import doesn't double up.
    if (found.length) {
      const dates = [...new Set(found.map((f) => f.date))];
      const { data: existing } = await supabase
        .from("bookings")
        .select("date, court_id, start_hour, booker_name")
        .in("date", dates);
      const seen = new Set(
        (existing ?? []).map((e) => `${e.date}|${e.court_id}|${e.start_hour}|${(e.booker_name ?? "").toLowerCase()}`),
      );
      for (const f of found) {
        f.duplicate = seen.has(`${f.date}|${f.courtId}|${f.startHour}|${f.bookerName.toLowerCase()}`);
      }
    }

    const fresh = found.filter((f) => !f.duplicate);

    if (!data.commit) {
      return { preview: true, weekLabel, bookings: found, newCount: fresh.length, skippedLate, imported: 0 };
    }

    if (fresh.length) {
      const { error } = await supabase.from("bookings").insert(
        fresh.map((f) => ({
          sport: f.sport,
          court_id: f.courtId,
          date: f.date,
          start_hour: f.startHour,
          hours: f.hours,
          booker_name: f.bookerName,
          amount: f.amount,
          status: f.status,
          channel: "Sheet import",
          ref: `SHT-${Math.random().toString(36).slice(2, 7).toUpperCase()}`,
          updated_at: new Date().toISOString(),
          updated_by: userId,
        })),
      );
      if (error) throw new Error(error.message);

      await supabase.from("activity_log").insert({
        action: `Sheet import · ${fresh.length} booking${fresh.length === 1 ? "" : "s"}`,
        details: `${weekLabel} · gid ${data.gid}`,
        actor_id: userId,
        actor_name: actorName,
        before_after: `imported ${fresh.length}, skipped ${found.length - fresh.length} duplicate(s)`,
      });
    }

    return { preview: false, weekLabel, bookings: found, newCount: fresh.length, skippedLate, imported: fresh.length };
  });

export const getBookingHistory = createServerFn({ method: "GET" })
  .inputValidator((input) => z.object({ bookingId: z.string().uuid().optional() }).parse(input ?? {}))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await requireStaff(supabase, userId);

    const base = () => supabase.from("activity_log").select("*").order("created_at", { ascending: false }).limit(80);
    const { data: rows, error } = data.bookingId
      ? await base().eq("booking_id", data.bookingId)
      : await base().not("booking_id", "is", null);
    if (error) throw new Error(error.message);
    return { history: rows ?? [] };
  });
