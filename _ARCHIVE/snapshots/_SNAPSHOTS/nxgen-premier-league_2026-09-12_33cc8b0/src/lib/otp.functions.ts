import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Email OTP verification for the membership tier system.
 * The 6-digit code is delivered by the platform's built-in auth mailer and
 * every request/verification is tracked in `otp_codes`.
 */

export const requestOtp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { createClient } = await import("@supabase/supabase-js");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: userRes, error: userErr } = await supabaseAdmin.auth.admin.getUserById(context.userId);
    const email = userRes?.user?.email;
    if (userErr || !email) throw new Error("No email address on file for this account.");

    // Throttle: max 1 code per 60s
    const { data: recent } = await supabaseAdmin
      .from("otp_codes")
      .select("created_at")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(1);
    const last = recent?.[0]?.created_at ? new Date(recent[0].created_at).getTime() : 0;
    if (Date.now() - last < 60_000) throw new Error("Please wait a minute before requesting another code.");

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
    const mailer = createClient(process.env["SUPABASE_URL"]!, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input, init) => {
          const h = new Headers(init?.headers);
          if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
          h.set("apikey", key);
          return fetch(input, { ...init, headers: h });
        },
      },
    });

    const { error: sendErr } = await mailer.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    });
    if (sendErr) throw new Error("Could not send the verification code. Try again shortly.");

    await supabaseAdmin.from("otp_codes").insert({
      user_id: context.userId,
      code,
      expires_at: expiresAt,
    });

    return { ok: true, sentTo: email.replace(/^(.).*(@.*)$/, "$1•••$2") };
  });

export const verifyOtp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ code: z.string().trim().regex(/^\d{6}$/) }).parse(data))
  .handler(async ({ data, context }) => {
    const { createClient } = await import("@supabase/supabase-js");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: userRes } = await supabaseAdmin.auth.admin.getUserById(context.userId);
    const email = userRes?.user?.email;
    if (!email) throw new Error("No email address on file for this account.");

    const { data: pending } = await supabaseAdmin
      .from("otp_codes")
      .select("id, expires_at, used")
      .eq("user_id", context.userId)
      .eq("used", false)
      .order("created_at", { ascending: false })
      .limit(1);
    const row = pending?.[0];
    if (!row) throw new Error("No verification code was requested. Send a new one.");
    if (new Date(row.expires_at).getTime() < Date.now()) throw new Error("That code has expired. Send a new one.");

    const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
    const verifier = createClient(process.env["SUPABASE_URL"]!, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input, init) => {
          const h = new Headers(init?.headers);
          if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
          h.set("apikey", key);
          return fetch(input, { ...init, headers: h });
        },
      },
    });

    const { error: vErr } = await verifier.auth.verifyOtp({ email, token: data.code, type: "email" });
    if (vErr) throw new Error("That code is incorrect. Please check your email and try again.");

    await supabaseAdmin
      .from("otp_codes")
      .update({ used: true, used_at: new Date().toISOString() })
      .eq("id", row.id);

    const { data: prof } = await supabaseAdmin
      .from("profiles")
      .select("membership_tier")
      .eq("id", context.userId)
      .maybeSingle();

    if (prof?.membership_tier !== "rfid_linked") {
      await supabaseAdmin
        .from("profiles")
        .update({ membership_tier: "otp_verified" })
        .eq("id", context.userId);
    }

    return { ok: true, tier: prof?.membership_tier === "rfid_linked" ? "rfid_linked" : "otp_verified" };
  });
