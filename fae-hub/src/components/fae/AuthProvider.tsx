import type { QueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import type { User } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

interface AuthState {
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthState>({ user: null, loading: true });

export function useAuth() {
  return useContext(AuthContext);
}

/**
 * Single owner of the auth session and the onAuthStateChange subscription.
 * Handles router/query invalidation on identity transitions and the
 * post-OAuth returnTo handoff.
 */
export function AuthProvider({ children, queryClient }: { children: ReactNode; queryClient: QueryClient }) {
  const router = useRouter();
  const [state, setState] = useState<AuthState>({ user: null, loading: true });

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setState({ user: data.user ?? null, loading: false });
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      setState({ user: session?.user ?? null, loading: false });
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      router.invalidate();
      if (event !== "SIGNED_OUT") queryClient.invalidateQueries();
      if (event === "SIGNED_IN" && typeof window !== "undefined") {
        const returnTo = window.sessionStorage.getItem("fae.returnTo");
        if (returnTo && returnTo.startsWith("/")) {
          window.sessionStorage.removeItem("fae.returnTo");
          router.navigate({ to: returnTo });
        }
      }
    });

    return () => sub.subscription.unsubscribe();
  }, [router, queryClient]);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}
