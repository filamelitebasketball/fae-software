import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

function supabaseForUser(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "list_upcoming_games",
  title: "List upcoming games",
  description: "Return the next NXGEN Premier League games, optionally filtered by division.",
  inputSchema: {
    division: z.string().optional().describe("Optional division filter: Rising Stars, Legacy, 3x3, or King of the Court."),
    limit: z.number().int().min(1).max(50).optional().describe("Maximum games to return (default 10)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ division, limit }, ctx) => {
    let q = supabaseForUser(ctx)
      .from("games")
      .select("id, division, scheduled_at, home_team_name, away_team_name, home_score, away_score, status, venue, livestream_url")
      .gte("scheduled_at", new Date().toISOString())
      .order("scheduled_at", { ascending: true })
      .limit(limit ?? 10);
    if (division) q = q.eq("division", division);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { games: data ?? [] },
    };
  },
});
