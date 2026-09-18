import { supabase } from "@/integrations/supabase/client";

export type StatValues = {
  points: number;
  rebounds: number;
  assists: number;
  steals: number;
  blocks: number;
};

/**
 * Records a box-score correction so stat edits are never silent.
 * Best-effort: a failure here must not block the stat save itself.
 */
export async function logStatEdit(opts: {
  statId?: string | null;
  gameId: string;
  playerId: string;
  action: "created" | "updated" | "deleted";
  before?: Partial<StatValues> | null;
  after?: Partial<StatValues> | null;
}) {
  try {
    const { data } = await supabase.auth.getUser();
    const user = data.user;
    if (!user) return;
    const { data: prof } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .maybeSingle();
    await supabase.from("stat_edit_history").insert({
      stat_id: opts.statId ?? null,
      game_id: opts.gameId,
      player_id: opts.playerId,
      editor_user_id: user.id,
      editor_name: prof?.full_name ?? user.email ?? null,
      action: opts.action,
      before_values: opts.before ?? null,
      after_values: opts.after ?? null,
    });
  } catch {
    /* history logging is non-critical */
  }
}
