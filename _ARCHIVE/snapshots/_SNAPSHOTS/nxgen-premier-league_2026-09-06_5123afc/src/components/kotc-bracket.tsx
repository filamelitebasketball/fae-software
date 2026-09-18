import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type BracketMatch = {
  id: string;
  round: number;
  slot: number;
  player_a_name: string | null;
  player_b_name: string | null;
  winner: string | null;
};

const ROUND_LABELS: Record<number, string> = {
  1: "Round of 16",
  2: "Quarterfinals",
  3: "Semifinals",
  4: "Final",
};

function roundLabel(round: number, maxRound: number) {
  if (round === maxRound) return "Final";
  if (round === maxRound - 1) return "Semifinals";
  if (round === maxRound - 2) return "Quarterfinals";
  return ROUND_LABELS[round] ?? `Round ${round}`;
}

function Slot({ name, isWinner }: { name: string | null; isWinner: boolean }) {
  return (
    <div
      className={`flex items-center justify-between gap-2 px-3 py-2 text-xs font-bold uppercase tracking-wider ${
        isWinner ? "bg-foreground text-background" : "text-muted-foreground"
      }`}
    >
      <span className="truncate">{name || "TBD"}</span>
      {isWinner && <span className="text-[10px] tracking-[0.2em]">W</span>}
    </div>
  );
}

export function KotcBracket({ compact = false }: { compact?: boolean }) {
  const [matches, setMatches] = useState<BracketMatch[]>([]);
  const [pool, setPool] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [{ data: m }, { data: regs }] = await Promise.all([
        supabase
          .from("kotc_bracket_matches")
          .select("id, round, slot, player_a_name, player_b_name, winner")
          .order("round")
          .order("slot"),
        supabase
          .from("registrations")
          .select("full_name")
          .eq("division", "King of the Court")
          .is("deleted_at", null),
      ]);
      setMatches((m as BracketMatch[]) ?? []);
      setPool(((regs as { full_name: string }[]) ?? []).map((r) => r.full_name));
      setLoading(false);
    })();
  }, []);

  const rounds = Array.from(new Set(matches.map((m) => m.round))).sort((a, b) => a - b);
  const maxRound = rounds.length ? rounds[rounds.length - 1] : 0;

  return (
    <section className="border border-border bg-card p-6 md:p-8">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
        King of the Court · Single Elimination
      </p>
      <h2 className="mt-2 text-2xl font-black uppercase md:text-3xl">Bracket</h2>

      {loading ? (
        <p className="mt-6 text-sm text-muted-foreground">Loading bracket…</p>
      ) : matches.length === 0 ? (
        <div className="mt-6">
          <p className="text-sm text-muted-foreground">
            The bracket hasn’t been drawn yet. Registered challengers enter the pool and are seeded once entries close.
          </p>
          <div className="mt-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-muted-foreground">
              Bracket pool ({pool.length})
            </p>
            {pool.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">No challengers entered yet.</p>
            ) : (
              <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {pool.map((name, i) => (
                  <li
                    key={`${name}-${i}`}
                    className="flex items-center gap-3 border border-border bg-background px-3 py-2 text-xs font-bold uppercase tracking-wider"
                  >
                    <span className="font-mono text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
                    <span className="truncate">{name}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : (
        <div className={`mt-6 flex gap-4 overflow-x-auto pb-2 ${compact ? "" : "md:gap-8"}`}>
          {rounds.map((round) => (
            <div key={round} className="min-w-[210px] flex-1">
              <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.25em] text-muted-foreground">
                {roundLabel(round, maxRound)}
              </p>
              <div className="flex h-full flex-col justify-around gap-4">
                {matches
                  .filter((m) => m.round === round)
                  .map((m) => (
                    <div key={m.id} className="divide-y divide-border border border-border bg-background">
                      <Slot name={m.player_a_name} isWinner={!!m.winner && m.winner === m.player_a_name} />
                      <Slot name={m.player_b_name} isWinner={!!m.winner && m.winner === m.player_b_name} />
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
