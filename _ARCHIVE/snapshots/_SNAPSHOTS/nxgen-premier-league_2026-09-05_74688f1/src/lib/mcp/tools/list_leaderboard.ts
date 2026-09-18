import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

function supabaseForUser(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

const STAT = z.enum(["ppg", "rpg", "apg", "spg", "bpg", "total_points"]);

export default defineTool({
  name: "list_leaderboard",
  title: "List division leaderboard",
  description: "Return the top players in a division ranked by a chosen stat.",
  inputSchema: {
    division: z.string().describe("Division name: Rising Stars, Legacy, 3x3, or King of the Court."),
    stat: STAT.optional().describe("Stat to rank by (default ppg)."),
    limit: z.number().int().min(1).max(50).optional().describe("How many players to return (default 10)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ division, stat, limit }, ctx) => {
    const orderBy = stat ?? "ppg";
    const { data, error } = await supabaseForUser(ctx)
      .from("leaderboard_totals")
      .select("player_id, full_name, jersey_number, division, games_played, ppg, rpg, apg, spg, bpg, total_points, total_rebounds, total_assists, total_steals, total_blocks")
      .eq("division", division)
      .order(orderBy, { ascending: false, nullsFirst: false })
      .limit(limit ?? 10);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { leaders: data ?? [], stat: orderBy },
    };
  },
});
