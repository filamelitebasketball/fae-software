import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type MembershipTier = "default" | "otp_verified" | "rfid_linked";

export const TIER_LABEL: Record<MembershipTier, string> = {
  default: "Unverified",
  otp_verified: "Verified Player",
  rfid_linked: "Full Member",
};

export function useMembershipTier() {
  const [tier, setTier] = useState<MembershipTier>("default");
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const { data: sess } = await supabase.auth.getSession();
    const uid = sess.session?.user.id ?? null;
    setUserId(uid);
    if (!uid) {
      setTier("default");
      setLoading(false);
      return;
    }
    const { data } = await supabase.from("profiles").select("membership_tier").eq("id", uid).maybeSingle();
    setTier(((data?.membership_tier as MembershipTier) ?? "default"));
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const isOtpVerified = tier === "otp_verified" || tier === "rfid_linked";
  const isFullMember = tier === "rfid_linked";

  return { tier, loading, userId, refresh, isOtpVerified, isFullMember };
}
