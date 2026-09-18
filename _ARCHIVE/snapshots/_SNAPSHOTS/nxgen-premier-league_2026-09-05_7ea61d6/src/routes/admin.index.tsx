import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BackButton } from "@/components/back-button";
import { RequireStaff } from "@/components/require-staff";
import { AdminSearch } from "@/components/admin-search";
import { useAuthRole } from "@/lib/use-auth-role";
import {
  Trophy,
  Users,
  ClipboardList,
  Receipt,
  Shield,
  Settings2,
  Shuffle,
  HeartHandshake,
  BookOpen,
  UserCog,
  FileSpreadsheet,
  History,
  Smartphone,
  AlertTriangle,
  Image as ImageIcon,
  CalendarRange,
} from "lucide-react";

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [
      { title: "Admin Dashboard — NXGEN" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <RequireStaff>
      <AdminHub />
    </RequireStaff>
  ),
});

type Card = {
  to: string;
  title: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
};

type Section = {
  id: string;
  title: string;
  sub: string;
  icon: React.ComponentType<{ className?: string }>;
  cards: Card[];
};

const SECTIONS: Section[] = [
  {
    id: "adm-operations",
    title: "Season Operations",
    sub: "Scoring, teams and rosters",
    icon: Trophy,
    cards: [
      {
        to: "/admin/score",
        title: "Courtside Score Entry",
        desc: "Phone-friendly box scores with tap steppers and partial saves.",
        icon: Smartphone,
      },
      {
        to: "/admin/schedule",
        title: "Round Robin Scheduler",
        desc: "Draw a full everyone-plays-everyone season for 8–20 teams and publish it.",
        icon: CalendarRange,
      },
      {
        to: "/admin/league",
        title: "Season Management",
        desc: "Teams, fixtures, box scores and player of the game.",
        icon: Trophy,
      },
      {
        to: "/admin/roster",
        title: "Roster & Players",
        desc: "Create, edit and delete players; link them to user accounts.",
        icon: Users,
      },
      {
        to: "/admin/import",
        title: "Import Teams & Rosters",
        desc: "Bulk-load a whole season of teams and players from one CSV file.",
        icon: FileSpreadsheet,
      },
      {
        to: "/admin/draft",
        title: "Draft Board",
        desc: "Assign free agents to teams and reassign players (desktop/tablet).",
        icon: ClipboardList,
      },
      {
        to: "/admin/matchmaking",
        title: "Matchmaking",
        desc: "Drag and drop players between teams per division.",
        icon: Shuffle,
      },
      {
        to: "/admin/gallery",
        title: "Photo Gallery",
        desc: "Upload and manage game night photos shown on the public gallery.",
        icon: ImageIcon,
      },
    ],
  },
  {
    id: "adm-approvals",
    title: "Approvals & Players",
    sub: "Registrations and profiles awaiting review",
    icon: ClipboardList,
    cards: [
      {
        to: "/admin/approvals",
        title: "Approvals",
        desc: "Division requests, coach applications and team drafts.",
        icon: ClipboardList,
      },
      {
        to: "/admin/players",
        title: "Player Profiles",
        desc: "Review and manage registered user profiles.",
        icon: UserCog,
      },
    ],
  },
  {
    id: "adm-finance",
    title: "Finance",
    sub: "Payments, donations and refunds",
    icon: Receipt,
    cards: [
      {
        to: "/admin/payments",
        title: "Payment Verification",
        desc: "Approve or reject uploaded payment proofs.",
        icon: Receipt,
        adminOnly: true,
      },
      {
        to: "/admin/donations",
        title: "Donations & Shout-outs",
        desc: "Verify sponsorships and copy the OBS shout-out queue.",
        icon: HeartHandshake,
        adminOnly: true,
      },
      {
        to: "/admin/refunds",
        title: "Refund Requests",
        desc: "Review credit-transfer requests and record approved amounts.",
        icon: Receipt,
        adminOnly: true,
      },
      {
        to: "/admin/ledger",
        title: "Ledger & Café",
        desc: "Wallets, inventory, tabs and daily ledger totals.",
        icon: BookOpen,
        adminOnly: true,
      },
    ],
  },
  {
    id: "adm-administration",
    title: "Administration",
    sub: "Roles, audit trail and site settings",
    icon: Shield,
    cards: [
      {
        to: "/admin/audit",
        title: "Activity Log",
        desc: "Who changed which team, player, fixture, score or payment — and when.",
        icon: History,
        adminOnly: true,
      },
      {
        to: "/admin/users",
        title: "Users, Roles & Role Audit",
        desc: "Grant admin/manager roles and review role changes.",
        icon: Shield,
        adminOnly: true,
      },
      {
        to: "/admin/settings",
        title: "Site Settings",
        desc: "Registration toggle, announcements and livestream link.",
        icon: Settings2,
        adminOnly: true,
      },
    ],
  },
];

type GameNeedingScore = {
  id: string;
  division: string;
  home_team_name: string | null;
  away_team_name: string | null;
  scheduled_at: string;
};

type Today = {
  loading: boolean;
  games: GameNeedingScore[];
  pendingPayments: number;
  missingWaiver: number;
  teams: number;
  players: number;
  pendingRefunds: number;
};

function useToday(): Today {
  const [state, setState] = useState<Today>({
    loading: true,
    games: [],
    pendingPayments: 0,
    missingWaiver: 0,
    teams: 0,
    players: 0,
    pendingRefunds: 0,
  });

  useEffect(() => {
    let mounted = true;
    (async () => {
      const now = new Date();
      const from = new Date(now.getTime() - 7 * 864e5).toISOString();
      const to = new Date(now.getTime() + 7 * 864e5).toISOString();
      const minorCutoff = new Date(now.getFullYear() - 18, now.getMonth(), now.getDate())
        .toISOString()
        .slice(0, 10);

      const [games, payments, waivers, teams, players, refunds] = await Promise.all([
        supabase
          .from("games")
          .select("id,division,home_team_name,away_team_name,scheduled_at")
          .gte("scheduled_at", from)
          .lte("scheduled_at", to)
          .neq("status", "final")
          .order("scheduled_at"),
        supabase.from("payment_proofs").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase
          .from("registrations")
          .select("id", { count: "exact", head: true })
          .is("guardian_consent_at", null)
          .is("deleted_at", null)
          .gt("date_of_birth", minorCutoff),
        supabase.from("teams").select("id", { count: "exact", head: true }),
        supabase.from("players").select("id", { count: "exact", head: true }),
        supabase.from("refund_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
      ]);

      if (!mounted) return;
      setState({
        loading: false,
        games: (games.data as GameNeedingScore[]) ?? [],
        pendingPayments: payments.count ?? 0,
        missingWaiver: waivers.count ?? 0,
        teams: teams.count ?? 0,
        players: players.count ?? 0,
        pendingRefunds: refunds.count ?? 0,
      });
    })();
    return () => {
      mounted = false;
    };
  }, []);

  return state;
}

function ChevronIcon() {
  return (
    <svg className="acc-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function AccordionSection({
  section,
  open,
  onToggle,
  cards,
}: {
  section: Section;
  open: boolean;
  onToggle: () => void;
  cards: Card[];
}) {
  const Icon = section.icon;
  return (
    <div className={`acc${open ? " open" : ""}`}>
      <button className="acc-trig" onClick={onToggle} type="button">
        <div className="acc-trig-left">
          <div className="acc-trig-icon">
            <Icon className="h-4 w-4" />
          </div>
          <div className="acc-trig-label">
            <span className="acc-trig-title">{section.title}</span>
            <span className="acc-trig-sub">{section.sub}</span>
          </div>
        </div>
        <ChevronIcon />
      </button>
      <div className="acc-body">
        <div className="acc-inner" style={{ paddingTop: 8 }}>
          {cards.map((c) => (
            <div className="acct-row" key={c.to}>
              <span className="acct-label" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ color: "var(--gold)", flexShrink: 0, display: "inline-flex" }}><c.icon className="h-3.5 w-3.5" /></span>
                {c.title}
                {c.adminOnly && (
                  <span className="badge bb" style={{ marginLeft: 4 }}>
                    Admin
                  </span>
                )}
              </span>
              <Link to={c.to} className="btn btn-ghost btn-xs" style={{ marginLeft: 8 }}>
                Open
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AdminHub() {
  const { isAdmin } = useAuthRole();
  const t = useToday();
  const [openId, setOpenId] = useState<string>("adm-operations");

  const visibleSections = SECTIONS.map((s) => ({
    ...s,
    cards: s.cards.filter((c) => !c.adminOnly || isAdmin),
  })).filter((s) => s.cards.length > 0);

  return (
    <div className="adm-root">
      <div className="adm-wrap">
        <div style={{ marginBottom: 20 }}>
          <BackButton fallback="/" />
        </div>

        <div style={{ marginBottom: 20 }}>
          <p className="eyebrow" style={{ fontSize: 9 }}>
            {isAdmin ? "Admin" : "Staff"} · Control Room
          </p>
          <h2 className="display" style={{ fontSize: "clamp(1.6rem,4vw,2.2rem)", marginTop: 8 }}>
            Admin Dashboard
          </h2>
          <p style={{ fontSize: 12, color: "var(--silver-d)", marginTop: 4 }}>
            Everything in the league runs from here — no code editing required.
            {isAdmin
              ? " You have full admin access, including finance and role management."
              : " Finance, roles and audit tools are limited to admins."}
          </p>
        </div>

        <div style={{ marginBottom: 20, maxWidth: 480 }}>
          <AdminSearch />
        </div>

        {/* KPI STRIP */}
        <div className="kpi-strip">
          <div className="kpi kpi-gold">
            <div className="kpi-label">Teams</div>
            <div className="kpi-val mono">{t.loading ? "—" : t.teams}</div>
            <div className="kpi-sub">registered this season</div>
          </div>
          <div className="kpi">
            <div className="kpi-label">Players</div>
            <div className="kpi-val mono">{t.loading ? "—" : t.players}</div>
            <div className="kpi-sub">across all divisions</div>
          </div>
          <div className="kpi kpi-red">
            <div className="kpi-label">Pending Payments</div>
            <div className="kpi-val mono">{t.loading ? "—" : t.pendingPayments}</div>
            <div className="kpi-sub">awaiting verification</div>
          </div>
          <div className="kpi kpi-green">
            <div className="kpi-label">Pending Refunds</div>
            <div className="kpi-val mono">{t.loading ? "—" : t.pendingRefunds}</div>
            <div className="kpi-sub">credit / refund requests</div>
          </div>
        </div>

        {/* ALERT / NEEDS REVIEW */}
        <div className="alert-strip">
          <h4>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            Needs Review
          </h4>
          {t.loading ? (
            <div className="a-row">Loading…</div>
          ) : t.games.length === 0 ? (
            <div className="a-row">Everything in the last/next 7 days is final.</div>
          ) : (
            t.games.slice(0, 6).map((g) => (
              <div className="a-row" key={g.id}>
                <span className="a-name">
                  {g.home_team_name ?? "TBD"} vs {g.away_team_name ?? "TBD"}
                </span>
                <span className="a-div">{g.division}</span>
                <span className="a-amt">{new Date(g.scheduled_at).toLocaleDateString()}</span>
              </div>
            ))
          )}
          <Link to="/admin/score" className="btn btn-ghost btn-sm" style={{ marginTop: 12 }}>
            Review All →
          </Link>
          {!isAdmin && t.missingWaiver > 0 && (
            <div className="a-row" style={{ marginTop: 8 }}>
              <span className="a-name" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <AlertTriangle className="h-3.5 w-3.5" /> Registrations missing a signed waiver
              </span>
              <span className="a-amt">{t.missingWaiver}</span>
            </div>
          )}
        </div>

        {/* ACCORDION SECTIONS */}
        {visibleSections.map((s) => (
          <AccordionSection
            key={s.id}
            section={s}
            cards={s.cards}
            open={openId === s.id}
            onToggle={() => setOpenId((prev) => (prev === s.id ? "" : s.id))}
          />
        ))}
      </div>
    </div>
  );
}
