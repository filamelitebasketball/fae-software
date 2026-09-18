import { SITE_URL } from "@/lib/site-url";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSiteSettings, peso } from "@/lib/site-settings";
import { KotcBracket } from "@/components/kotc-bracket";
import { ArrowRight } from "lucide-react";
import { NxPage } from "@/components/nx-shell";
import risingStarLogo from "@/assets/RISING_STAR-trim.png.asset.json";
import legacyLogo from "@/assets/LEGACY-trim.png.asset.json";
import threeXThreeLogo from "@/assets/3X3-trim.png.asset.json";
import kotcLogo from "@/assets/KOTC-trim.png.asset.json";

const DIVISION_LOGOS: Record<string, string> = {
  "rising-stars": risingStarLogo.url,
  "legacy": legacyLogo.url,
  "3x3": threeXThreeLogo.url,
  "king-of-the-court": kotcLogo.url,
};

type DivisionRules = {
  slug: string;
  name: string;
  tagline: string;
  format: string;
  gameLength?: string;
  rosterSize?: string;
  ageTiers?: string;
  eligibility?: string;
  feeKey: string;
  feeUnit: string;
  feeNote: string;
  playoffs?: string;
  teamCount?: string;
};

const LEAGUE_TEAM_COUNT = "Minimum 8 teams, maximum 20 teams required to run a division.";

const DIVISIONS: Record<string, DivisionRules> = {
  "rising-stars": {
    slug: "rising-stars",
    name: "Rising Stars",
    tagline: "The proving ground — fast, raw, high-tempo 5v5.",
    format: "Single round robin, 5v5.",
    gameLength: "10-minute quarters.",
    rosterSize: "Minimum 10, maximum 15 players.",
    eligibility: "9U – 21U.",
    feeKey: "rising-stars", feeUnit: "per team", feeNote: "due 10 days before opening night.",
    playoffs:
      "Teams entered minus 4 advance to the playoffs (8→4, 10→6, 12→8, 14→10, 16→12, 18→14, 20→16).",
    teamCount: LEAGUE_TEAM_COUNT,
  },
  "legacy": {
    slug: "legacy",
    name: "Legacy",
    tagline: "The elite tier — champions, veterans and dynasties.",
    format: "Single round robin, 5v5.",
    gameLength: "12-minute quarters.",
    rosterSize: "Minimum 10, maximum 15 players.",
    eligibility: "21 and above.",
    feeKey: "legacy", feeUnit: "per team", feeNote: "due 10 days before opening night.",
    playoffs:
      "Same formula as Rising Stars — teams entered minus 4 advance (8→4, 10→6, 12→8, 14→10, 16→12, 18→14, 20→16).",
    teamCount: LEAGUE_TEAM_COUNT,
  },
  "3x3": {
    slug: "3x3",
    name: "3x3",
    tagline: "Three players. One basket. Pure half-court warfare.",
    format: "Played under the official FIBA 3x3 rules, covering game rules and roster composition.",
    rosterSize: "4 players per FIBA 3x3 standard — 3 on court plus 1 substitute.",
    ageTiers:
      "Kids (12U), Teens (13U–17U) and Adults (18+). Each tier runs its own standings and bracket within the division.",
    feeKey: "3x3", feeUnit: "per team", feeNote: "due 10 days before opening night — same across all three age tiers.",
    playoffs: "Teams entered minus 4 advance, applied per age tier.",
    teamCount: LEAGUE_TEAM_COUNT,
  },
  "king-of-the-court": {
    slug: "king-of-the-court",
    name: "King of the Court",
    tagline: "1v1. Winners stay. Losers walk. Take the crown.",
    format: "1v1 single-elimination bracket.",
    rosterSize: "Individual entry.",
    ageTiers:
      "Kids (12U), Teens (13U–17U) and Adults (18+). Each tier runs its own bracket.",
    feeKey: "kotc", feeUnit: "per player", feeNote: "due 10 days before opening night — same across all three age tiers.",
    teamCount: "Minimum 8, maximum 20 entrants.",
  },
};


export const Route = createFileRoute("/divisions/$slug")({
  loader: ({ params }) => {
    const d = DIVISIONS[params.slug];
    if (!d) throw notFound();
    return d;
  },
  head: ({ loaderData }) => {
    if (!loaderData) return { meta: [{ title: "Division · NXGEN" }, { name: "robots", content: "noindex" }] };
    const d = loaderData;
    const title = `${d.name} — Rules & Format · NXGEN Premier League`;
    const desc = `${d.name} rules, format, roster size, eligibility, entry fee and playoff structure.`;
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "article" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
      links: [{ rel: "canonical", href: `${SITE_URL}/divisions/${d.slug}` }],
    };
  },
  component: DivisionRulesPage,
  notFoundComponent: () => (
    <NxPage eyebrow="Not Found" title="Division Not Found">
      <p style={{ color: "var(--silver-d)" }}>This division doesn't exist. <Link to="/" className="nav-link" style={{ display: "inline" }}>Go home</Link></p>
    </NxPage>
  ),
  errorComponent: () => (
    <NxPage eyebrow="Error" title="Something Went Wrong">
      <p style={{ color: "var(--silver-d)" }}>Couldn’t load this division.</p>
    </NxPage>
  ),
});

function DivisionRulesPage() {
  const settings = useSiteSettings();
  const d = Route.useLoaderData();

  const rows = (
    [
      ["Format", d.format],
      ["Game Length", d.gameLength],
      ["Roster Size", d.rosterSize],
      ["Age Tiers", d.ageTiers],
      ["Age / Eligibility", d.eligibility],
      ["Entry Fee", `${peso(settings.division_fees[d.feeKey] ?? 0)} ${d.feeUnit}, ${d.feeNote}`],
      ["Playoff Structure", d.playoffs],
      ["Teams per Division", d.teamCount],
    ] as Array<[string, string | undefined]>
  ).filter((r): r is [string, string] => Boolean(r[1]));

  return (
    <NxPage eyebrow="Division Rules" title={d.name} intro={d.tagline}>
      <img
        src={DIVISION_LOGOS[d.slug]}
        alt={`${d.name} division logo`}
        style={{ width: "min(200px,50vw)", height: "auto", display: "block", marginBottom: 28, filter: "drop-shadow(0 10px 26px rgba(201,162,39,.25))" }}
      />
      <dl className="card" style={{ margin: 0 }}>
        {rows.map(([label, value]) => (
          <div key={label} className="card-section" style={{ display: "grid", gap: 8 }}>
            <dt className="mono" style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".18em", color: "var(--silver-d)" }}>{label}</dt>
            <dd style={{ fontSize: 13, lineHeight: 1.7, color: "var(--paint)" }}>{value}</dd>
          </div>
        ))}
      </dl>

      {d.slug === "king-of-the-court" && (
        <div style={{ marginTop: 32 }}>
          <KotcBracket />
        </div>
      )}

      <div style={{ marginTop: 32, display: "flex", flexWrap: "wrap", gap: 12 }}>
        <Link to="/register" className="btn btn-gold">
          Register for {d.name} <ArrowRight className="h-4 w-4" />
        </Link>
        <Link to="/faq" className="btn btn-ghost">League FAQ</Link>
        <Link to="/legal/waiver" className="btn btn-ghost">Waiver & Liability</Link>
      </div>
    </NxPage>
  );
}
