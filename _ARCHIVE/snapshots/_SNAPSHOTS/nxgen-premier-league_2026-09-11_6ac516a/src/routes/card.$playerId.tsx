import { SITE_URL as SITE } from "@/lib/site-url";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { getPlayerCard, getPublicPlayer } from "@/lib/public-players.functions";
import { BackButton } from "@/components/back-button";
import { NxShareCard } from "@/components/nx-share-card";
import type { CombineStats } from "@/components/nx-player-combine";
import nxgLogo from "@/assets/NXG-trim.png.asset.json";


export const Route = createFileRoute("/card/$playerId")({
  loader: ({ params }) => getPlayerCard({ data: { id: params.playerId } }).catch(() => null),
  head: ({ params, loaderData }) => {
    const name = loaderData?.name ?? "NXGEN Player";
    const title = `${name} — Share Card | NXGEN Premier League`;
    const description = `Save ${name}'s NXGEN player card as an image and post it.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:url", content: `${SITE}/card/${params.playerId}` },
      ],
      links: [{ rel: "canonical", href: `${SITE}/card/${params.playerId}` }],
    };
  },
  component: ShareCardPage,
});

type Row = {
  id: string;
  name: string;
  division: string | null;
  position: string | null;
  jersey_number: string | null;
  team_id: string | null;
  photo_url: string | null;
  games_played: number | null;
  season_pts: number | null;
  season_reb: number | null;
  season_ast: number | null;
  season_stl: number | null;
  season_blk: number | null;
};

function ShareCardPage() {
  const { playerId } = Route.useParams();
  const [row, setRow] = useState<Row | null>(null);
  const [team, setTeam] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const fetchPublicPlayer = useServerFn(getPublicPlayer);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Roster player first.
      const { data } = await supabase
        .from("players")
        .select("id, name, division, position, jersey_number, team_id, photo_url, games_played, season_pts, season_reb, season_ast, season_stl, season_blk")
        .eq("id", playerId)
        .maybeSingle();
      if (cancelled) return;

      if (data) {
        setRow(data as Row);
        if (data.team_id) {
          const { data: t } = await supabase.from("teams").select("name").eq("id", data.team_id).maybeSingle();
          if (cancelled) return;
          setTeam(t?.name ?? null);
        }
        setLoading(false);
        return;
      }

      // A parent-managed child (added from /account) lives in managed_players and
      // has no box scores yet — render their card with zeroed season stats.
      const { data: child } = await supabase
        .from("managed_players")
        .select("id, full_name, division, position, jersey_number, team_name, photo_url")
        .eq("id", playerId)
        .maybeSingle();
      if (cancelled) return;

      if (child) {
        setRow({
          id: child.id,
          name: child.full_name,
          division: child.division ?? null,
          position: child.position ?? null,
          jersey_number: child.jersey_number ?? null,
          team_id: null,
          photo_url: child.photo_url ?? null,
          games_played: 0,
          season_pts: 0,
          season_reb: 0,
          season_ast: 0,
          season_stl: 0,
          season_blk: 0,
        });
        setTeam(child.team_name ?? null);
        setLoading(false);
        return;
      }

      // Otherwise the player lives in profiles + player_stats, which is where
      // this league's players actually are. Aggregate their box scores.
      const [who, { data: rows }] = await Promise.all([
        fetchPublicPlayer({ data: { id: playerId } }).catch(() => null),
        supabase
          .from("player_stats")
          .select("points, rebounds, assists, steals, blocks")
          .eq("player_id", playerId),
      ]);
      if (cancelled) return;

      const p = who as {
        full_name?: string | null; division?: string | null; position?: string | null;
        jersey_number?: string | null; is_public?: boolean;
        photo_url?: string | null; avatar_url?: string | null;
      } | null;
      const list = (rows as Array<{
        points: number | null; rebounds: number | null; assists: number | null;
        steals: number | null; blocks: number | null;
      }>) ?? [];

      if (!p?.full_name || !p.is_public || list.length === 0) {
        setLoading(false);
        return;
      }

      const totals = list.reduce(
        (a, r) => ({
          g: a.g + 1,
          pts: a.pts + (r.points ?? 0),
          reb: a.reb + (r.rebounds ?? 0),
          ast: a.ast + (r.assists ?? 0),
          stl: a.stl + (r.steals ?? 0),
          blk: a.blk + (r.blocks ?? 0),
        }),
        { g: 0, pts: 0, reb: 0, ast: 0, stl: 0, blk: 0 },
      );

      setRow({
        id: playerId,
        name: p.full_name,
        division: p.division ?? null,
        position: p.position ?? null,
        jersey_number: p.jersey_number ?? null,
        team_id: null,
        photo_url: p.photo_url ?? p.avatar_url ?? null,
        games_played: totals.g,
        season_pts: totals.pts,
        season_reb: totals.reb,
        season_ast: totals.ast,
        season_stl: totals.stl,
        season_blk: totals.blk,
      });
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [playerId, fetchPublicPlayer]);

  if (loading) {
    return <div className="min-h-screen grid place-items-center text-muted-foreground">Loading…</div>;
  }

  if (!row) {
    return (
      <div className="min-h-screen grid place-items-center px-6 text-center">
        <div>
          <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
            No shareable card for this player yet
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            A card is generated once a player has at least one recorded game and a public profile.
          </p>
          <div className="mt-4"><BackButton fallback="/" /></div>
        </div>
      </div>
    );
  }

  const stats: CombineStats = {
    g: row.games_played ?? 0,
    pts: row.season_pts ?? 0,
    reb: row.season_reb ?? 0,
    ast: row.season_ast ?? 0,
    stl: row.season_stl ?? 0,
    blk: row.season_blk ?? 0,
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/60 bg-background/80 backdrop-blur sticky top-0 z-30">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-3">
          <BackButton fallback={`/players/${playerId}`} />
          <Link to="/" className="flex items-center gap-2">
            <img src={nxgLogo.url} alt="NXGEN" className="h-8 w-8 object-contain" />
            <span className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">Share Card</span>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-7 md:px-6">
        <h1 className="text-center text-xs font-bold uppercase tracking-[0.3em] text-muted-foreground">
          {row.name}
        </h1>
        <div className="mt-5">
          <NxShareCard
            name={row.name}
            stats={stats}
            jersey={row.jersey_number}
            team={team}
            division={row.division}
            position={row.position}
            photoPath={row.photo_url}
            url={`${SITE}/players/${playerId}`}
          />
        </div>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          The card is drawn from live season stats, so saving it again after the next game gives an updated image.
        </p>
        <div className="mt-5 text-center">
          <Link
            to="/players/$playerId"
            params={{ playerId }}
            className="text-xs font-bold uppercase tracking-widest text-muted-foreground underline"
          >
            Back to full player card
          </Link>
        </div>
      </main>
    </div>
  );
}
