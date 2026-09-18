import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";

function supabaseForUser(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "my_wallet",
  title: "Get my wallet balance",
  description: "Return the signed-in user's NXGEN wallet balance, tab balance, and credit limit (in pesos).",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_args, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const { data, error } = await supabaseForUser(ctx)
      .from("player_wallets")
      .select("balance_cents, tab_balance_cents, credit_limit_cents, loyal_tab_enabled")
      .eq("user_id", ctx.getUserId())
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    const wallet = data
      ? {
          balance_php: data.balance_cents / 100,
          tab_balance_php: data.tab_balance_cents / 100,
          credit_limit_php: data.credit_limit_cents / 100,
          loyal_tab_enabled: data.loyal_tab_enabled,
        }
      : null;
    return {
      content: [{ type: "text", text: JSON.stringify(wallet, null, 2) }],
      structuredContent: { wallet },
    };
  },
});
