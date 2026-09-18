import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type AuthRole = {
  loading: boolean;
  userId: string | null;
  isAdmin: boolean;
  isManager: boolean;
  /**
   * Coaches are not staff. They can read league data and draw up a schedule,
   * but every write policy on games, teams and stats is staff-only, so the UI
   * must not offer them a save the database will refuse.
   */
  isCoach: boolean;
  /** admin OR manager */
  isStaff: boolean;
};

/**
 * Reactive session + role reader. Uses onAuthStateChange so headers/gates
 * update immediately on sign-in / sign-out without a page reload.
 */
export function useAuthRole(): AuthRole {
  const [state, setState] = useState<AuthRole>({
    loading: true,
    userId: null,
    isAdmin: false,
    isManager: false,
    isCoach: false,
    isStaff: false,
  });

  useEffect(() => {
    let mounted = true;

    async function resolve(uid: string | null) {
      if (!uid) {
        if (mounted)
          setState({
            loading: false,
            userId: null,
            isAdmin: false,
            isManager: false,
            isCoach: false,
            isStaff: false,
          });
        return;
      }
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", uid);
      const roles = new Set((data ?? []).map((r: { role: string }) => r.role));
      const isAdmin = roles.has("admin");
      const isManager = roles.has("manager");
      const isCoach = roles.has("coach");
      if (mounted)
        setState({
          loading: false,
          userId: uid,
          isAdmin,
          isManager,
          isCoach,
          isStaff: isAdmin || isManager,
        });
    }

    supabase.auth.getSession().then(({ data }) => resolve(data.session?.user.id ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) =>
      resolve(session?.user.id ?? null),
    );
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return state;
}
