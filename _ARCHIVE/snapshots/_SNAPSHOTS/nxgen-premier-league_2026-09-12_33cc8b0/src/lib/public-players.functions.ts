import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const getPublicPlayer = createServerFn({ method: "GET" })
  .inputValidator((data) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin.rpc("get_public_player", { _id: data.id });
    if (error) throw new Error(error.message);
    return rows?.[0] ?? null;
  });

export const getProfileByBraceletUid = createServerFn({ method: "GET" })
  .inputValidator((data) => z.object({ uid: z.string().min(1).max(128) }).parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin.rpc("get_profile_by_bracelet_uid", { _uid: data.uid });
    if (error) throw new Error(error.message);
    return rows?.[0] ?? null;
  });

/** Public, SSR-safe card data used for shareable player links (OG/meta tags). */
export const getPlayerCard = createServerFn({ method: "GET" })
  .inputValidator((data) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: roster } = await supabaseAdmin
      .from("players")
      .select("id, name, division, jersey_number, position, team_id, season_pts, season_reb, season_ast, games_played")
      .eq("id", data.id)
      .maybeSingle();

    if (roster) {
      let team: string | null = null;
      if (roster.team_id) {
        const { data: t } = await supabaseAdmin.from("teams").select("name").eq("id", roster.team_id).maybeSingle();
        team = t?.name ?? null;
      }
      const g = roster.games_played || 0;
      return {
        id: roster.id,
        name: roster.name,
        division: roster.division ?? null,
        team,
        jersey: roster.jersey_number ?? null,
        position: roster.position ?? null,
        games: g,
        ppg: g ? roster.season_pts / g : 0,
        rpg: g ? roster.season_reb / g : 0,
        apg: g ? roster.season_ast / g : 0,
      };
    }

    const { data: rows } = await supabaseAdmin.rpc("get_public_player", { _id: data.id });
    const p = rows?.[0];
    if (!p) return null;

    const { data: stats } = await supabaseAdmin
      .from("player_stats")
      .select("points, rebounds, assists")
      .eq("player_id", data.id);
    const g = stats?.length ?? 0;
    const sum = (k: "points" | "rebounds" | "assists") => (stats ?? []).reduce((a, s) => a + (s[k] ?? 0), 0);

    return {
      id: p.id,
      name: p.full_name ?? "NXGEN Player",
      division: p.division ?? null,
      team: null as string | null,
      jersey: p.jersey_number ?? null,
      position: p.position ?? null,
      games: g,
      ppg: g ? sum("points") / g : 0,
      rpg: g ? sum("rebounds") / g : 0,
      apg: g ? sum("assists") / g : 0,
    };
  });
