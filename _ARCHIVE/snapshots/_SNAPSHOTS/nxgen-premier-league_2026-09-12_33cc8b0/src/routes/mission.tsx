import { SITE_URL } from "@/lib/site-url";
import { createFileRoute, Link } from "@tanstack/react-router";
import { NxPage } from "@/components/nx-shell";
import { useSiteSettings } from "@/lib/site-settings";

const CANONICAL = `${SITE_URL}/mission`;

export const Route = createFileRoute("/mission")({
  head: () => ({
    meta: [
      { title: "Mission & Vision — NXGEN Premier League" },
      {
        name: "description",
        content:
          "Why NXGEN exists: to find the next Filipino basketball player. Every game filmed, every stat tracked, every profile a scouting résumé — built at F.A.E. Court, Lipa City.",
      },
      { property: "og:title", content: "Find the NXGEN Player — Mission & Vision" },
      {
        property: "og:description",
        content:
          "Play. Film. Track. Improve. Get seen. The loop NXGEN is built around, and the league it is building.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: CANONICAL },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: CANONICAL }],
  }),
  component: MissionPage,
});

/**
 * The loop the whole league runs on. Deliberately five beats, not four: "get
 * seen" is the one players actually came for, and folding it into "improve" is
 * how a development programme starts sounding like homework.
 */
const LOOP = [
  {
    n: "01",
    t: "Play",
    body:
      "Four divisions, real officials, a real scoresheet. Rising Stars, Legacy, 3×3 and King of the Court — so a 13-year-old and a grown hooper are each measured against the right people.",
  },
  {
    n: "02",
    t: "Film",
    body:
      "Every game night streams from F.A.E. Court and the footage stays. Clips are the reference you argue with: what the play actually looked like, not what you remember it looking like.",
  },
  {
    n: "03",
    t: "Track",
    body:
      "Box scores go in courtside and your numbers move the moment they do. Standings, leaderboards and your own averages update live — nobody waits a week to find out how the season is going.",
  },
  {
    n: "04",
    t: "Improve",
    body:
      "The point of a number is to tell you where the work is. Your profile shows the gap between what you do a lot and what you do well, and that gap is the training plan.",
  },
  {
    n: "05",
    t: "Get seen",
    body:
      "Your profile is a basketball résumé with the receipts attached — stats, film, history, one link. Built so a scout can find you without knowing your name first.",
  },
] as const;

const FEATURES = [
  "Live box scores",
  "Season averages",
  "Division leaderboards",
  "Game film & replays",
  "Shareable player cards",
  "Round-robin fixtures",
  "RFID court check-in",
  "Scout-ready profiles",
] as const;

function MissionPage() {
  const s = useSiteSettings();

  return (
    <NxPage
      eyebrow="Why we exist"
      title="Find the NXGEN player"
      intro="Talent in this country gets found by accident — a cousin who knows a coach, a tryout someone happened to hear about. NXGEN is built so that being good is enough."
    >
      <style>{`
        .mv-stmt{border-left:2px solid var(--gold);padding:4px 0 4px 22px;margin:0 0 40px;text-align:left}
        .mv-stmt .eyebrow{margin-bottom:10px}
        .mv-stmt .mv-big{font-family:var(--fd);font-weight:800;color:var(--paint);
          font-size:clamp(1.35rem,3.6vw,2.1rem);line-height:1.22;letter-spacing:-.015em;
          margin:0;text-wrap:balance}
        .mv-stmt .mv-big em{font-style:normal;color:var(--gold-l)}
        .mv-sub{margin:14px 0 0;color:var(--silver-d);font-size:14.5px;line-height:1.65;max-width:56ch}

        .mv-loop{display:grid;gap:1px;background:var(--line);border:1px solid var(--line);
          border-radius:12px;overflow:hidden;margin:0 0 52px}
        @media(min-width:760px){
          .mv-loop{grid-template-columns:repeat(2,1fr)}
          .mv-step:first-child{grid-column:1 / -1}
        }
        .mv-step{background:var(--s0);padding:22px 22px 24px;text-align:left}
        .mv-step .n{font-family:var(--fm);font-size:9.5px;letter-spacing:.22em;color:var(--gold-d);
          display:block;margin-bottom:9px}
        .mv-step h3{font-family:var(--fd);font-weight:900;text-transform:uppercase;
          font-size:clamp(1.05rem,2.4vw,1.35rem);letter-spacing:.01em;color:var(--paint);margin:0 0 8px}
        .mv-step p{margin:0;color:var(--silver-d);font-size:14px;line-height:1.62}

        .mv-lede{color:var(--silver-d);font-size:14.5px;line-height:1.65;max-width:58ch;
          margin:0 0 18px;text-align:left}
        .mv-pills{margin-bottom:52px;text-align:left}
        .mv-pill{display:inline-block;font-family:var(--fm);font-size:10px;letter-spacing:.18em;
          text-transform:uppercase;color:var(--gold-l);border:1px solid var(--line-g);
          border-radius:999px;padding:5px 12px;margin:0 6px 8px 0}

        .mv-close{border:1px solid var(--line-g);border-radius:12px;padding:28px 24px;
          background:linear-gradient(150deg,rgba(201,162,39,.07),transparent);text-align:left}
        .mv-close h3{font-family:var(--fd);font-weight:900;text-transform:uppercase;letter-spacing:.02em;
          font-size:clamp(1.1rem,2.6vw,1.45rem);color:var(--paint);margin:0 0 10px}
        .mv-close p{color:var(--silver-d);font-size:14.5px;line-height:1.65;margin:0 0 18px;max-width:58ch}
        .mv-ctas{display:flex;gap:10px;flex-wrap:wrap}
      `}</style>

      <div className="mv-stmt">
        <p className="eyebrow">Our mission</p>
        <p className="mv-big">
          To find the next great Filipino player — and to give every player chasing them the{" "}
          <em>film, the numbers and the stage</em> to get there.
        </p>
        <p className="mv-sub">
          Not a tournament that hands out a trophy and forgets you. A season that leaves you with a record of what you
          actually did, and proof you can send to somebody who matters.
        </p>
      </div>

      <div className="mv-stmt">
        <p className="eyebrow">Our vision</p>
        <p className="mv-big">
          A Philippines where talent is discovered by <em>evidence, not by accident</em>.
        </p>
        <p className="mv-sub">
          Every court in this country has someone who could play at the next level and never will, because nobody with a
          clipboard walked past on the right night. We are building the version where the clipboard is the internet, the
          tape is already rolling, and the player does not have to be lucky.
        </p>
      </div>

      <p className="eyebrow" style={{ marginBottom: 18, textAlign: "left" }}>How it works</p>
      <div className="mv-loop">
        {LOOP.map((step) => (
          <div key={step.n} className="mv-step">
            <span className="n">{step.n}</span>
            <h3>{step.t}</h3>
            <p>{step.body}</p>
          </div>
        ))}
      </div>

      <p className="eyebrow" style={{ marginBottom: 14, textAlign: "left" }}>Basketball, wired up</p>
      <p className="mv-lede">
        The technology is not the point — the player is. But the tech is what turns a good game nobody recorded into
        something you can show, study and build on.
      </p>
      <div className="mv-pills">
        {FEATURES.map((f) => (
          <span key={f} className="mv-pill">{f}</span>
        ))}
      </div>

      <div className="mv-close">
        <h3>Come get measured</h3>
        <p>
          Registration is open at {s.venue_name || "F.A.E. Court"}
          {s.venue_location ? `, ${s.venue_location.split(",")[0]}` : ""}. Bring a team or come as a free agent — either
          way you leave with a season on the record.
        </p>
        <div className="mv-ctas">
          <Link to="/register" className="btn btn-gold">Register Your Team →</Link>
          <Link to="/faq" className="btn btn-ghost">Read the FAQ</Link>
        </div>
      </div>
    </NxPage>
  );
}
