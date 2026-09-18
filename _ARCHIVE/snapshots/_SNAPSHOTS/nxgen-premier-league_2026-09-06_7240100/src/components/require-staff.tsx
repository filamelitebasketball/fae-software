import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { useAuthRole } from "@/lib/use-auth-role";

/**
 * Wrap admin-only page bodies. Redirects:
 *  - unauthenticated → /auth
 *  - authenticated non-staff (or non-admin when adminOnly) → /profile
 * Renders `fallback` while resolving the session/role so protected UI never
 * flashes.
 */
export function RequireStaff({
  children,
  adminOnly = false,
  allowCoach = false,
  fallback = null,
}: {
  children: React.ReactNode;
  adminOnly?: boolean;
  /**
   * Let coaches in as well. Only for pages that are useful read-only, since
   * every league write policy is staff-only — the page itself must withhold
   * the save controls.
   */
  allowCoach?: boolean;
  fallback?: React.ReactNode;
}) {
  const navigate = useNavigate();
  const { loading, userId, isAdmin, isStaff, isCoach } = useAuthRole();
  const allowed = adminOnly ? isAdmin : isStaff || (allowCoach && isCoach);

  useEffect(() => {
    if (loading) return;
    if (!userId) {
      navigate({ to: "/auth" });
      return;
    }
    if (!allowed) {
      toast.error(adminOnly ? "Admin access required" : "Staff access required");
      navigate({ to: "/profile" });
    }
  }, [loading, userId, allowed, adminOnly, navigate]);

  if (loading || !userId || !allowed) {
    return (
      <>
        {fallback ?? (
          <div className="min-h-screen grid place-items-center text-muted-foreground text-sm">
            Checking access…
          </div>
        )}
      </>
    );
  }
  return <>{children}</>;
}
