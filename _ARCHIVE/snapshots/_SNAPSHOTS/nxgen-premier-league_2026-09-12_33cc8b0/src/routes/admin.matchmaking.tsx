import { createFileRoute, Navigate } from "@tanstack/react-router";
import { RequireStaff } from "@/components/require-staff";

/**
 * Retired — the draft board is the one place teams get built.
 *
 * This screen was a near-copy of /admin/draft that wrote the same
 * `players.team_id` column, but with no roster minimum or maximum, no search,
 * and no mobile guard. Whether a 16th player could join a 15-max Legacy team
 * depended on which of two near-identical screens an admin happened to open.
 *
 * Kept as a redirect rather than deleted so the admin tile, any bookmark, and
 * the old in-app link all land somewhere useful instead of 404ing.
 */
export const Route = createFileRoute("/admin/matchmaking")({
  head: () => ({
    meta: [
      { title: "Matchmaking — Admin — NXGEN" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <RequireStaff>
      <Navigate to="/admin/draft" replace />
    </RequireStaff>
  ),
});
