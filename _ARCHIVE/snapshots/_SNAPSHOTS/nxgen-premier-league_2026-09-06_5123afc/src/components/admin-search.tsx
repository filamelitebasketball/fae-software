import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";

type Hit = { kind: "Player" | "Team" | "Game"; id: string; label: string; sub: string; to: string };

/**
 * Admin-wide quick finder: type a player, team or game name instead of
 * scrolling four divisions of rosters.
 */
export function AdminSearch() {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  const term = useMemo(() => q.trim(), [q]);

  useEffect(() => {
    if (term.length < 2) {
      setHits([]);
      return;
    }
    let cancelled = false;
    const t = setTimeout(async () => {
      const like = `%${term}%`;
      const [players, teams, games] = await Promise.all([
        supabase.from("players").select("id,name,division,jersey_number").ilike("name", like).limit(6),
        supabase.from("teams").select("id,name,division").ilike("name", like).limit(6),
        supabase
          .from("games")
          .select("id,division,home_team_name,away_team_name,scheduled_at")
          .or(`home_team_name.ilike.${like},away_team_name.ilike.${like}`)
          .order("scheduled_at", { ascending: false })
          .limit(6),
      ]);
      if (cancelled) return;
      const out: Hit[] = [
        ...(players.data ?? []).map((p) => ({
          kind: "Player" as const,
          id: p.id,
          label: p.name,
          sub: [p.division, p.jersey_number ? `#${p.jersey_number}` : null].filter(Boolean).join(" · "),
          to: "/admin/roster",
        })),
        ...(teams.data ?? []).map((t) => ({
          kind: "Team" as const,
          id: t.id,
          label: t.name,
          sub: t.division,
          to: "/admin/league",
        })),
        ...(games.data ?? []).map((g) => ({
          kind: "Game" as const,
          id: g.id,
          label: `${g.home_team_name ?? "TBD"} vs ${g.away_team_name ?? "TBD"}`,
          sub: `${g.division} · ${new Date(g.scheduled_at).toLocaleDateString()}`,
          to: "/admin/league",
        })),
      ];
      setHits(out);
      setOpen(true);
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [term]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div ref={box} className="relative w-full">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => hits.length && setOpen(true)}
        placeholder="Search players, teams or games…"
        className="h-11 pl-9"
        aria-label="Search admin records"
      />
      {open && term.length >= 2 && (
        <div className="absolute z-50 mt-1 max-h-80 w-full overflow-auto border border-border bg-card shadow-lg">
          {hits.length === 0 ? (
            <p className="p-4 text-xs text-muted-foreground">No matches for “{term}”.</p>
          ) : (
            <ul className="divide-y divide-border">
              {hits.map((h) => (
                <li key={`${h.kind}-${h.id}`}>
                  <Link
                    to={h.to}
                    onClick={() => setOpen(false)}
                    className="flex items-center justify-between gap-3 p-3 hover:bg-muted"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold uppercase tracking-wide">{h.label}</span>
                      <span className="block truncate text-[11px] text-muted-foreground">{h.sub}</span>
                    </span>
                    <span className="shrink-0 border border-border px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
                      {h.kind}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
