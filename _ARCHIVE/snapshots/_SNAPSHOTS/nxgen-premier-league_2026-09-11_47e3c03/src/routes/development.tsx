import { SITE_URL } from "@/lib/site-url";
import { createFileRoute, Link } from "@tanstack/react-router";
import { BackButton } from "@/components/back-button";

const CANONICAL = `${SITE_URL}/development`;

export const Route = createFileRoute("/development")({
  head: () => ({
    meta: [
      { title: "High School Basketball Development: How to Level Up for NXGEN" },
      {
        name: "description",
        content:
          "A practical development guide for high school basketball players in the Philippines — skills, strength, IQ, and the path from high school hoops into NXGEN's Rising Stars and Legacy divisions.",
      },
      { property: "og:title", content: "High School Basketball Development — NXGEN Premier League" },
      {
        property: "og:description",
        content:
          "How high schoolers can level up their game and earn a spot in NXGEN's Rising Stars and Legacy divisions.",
      },
      { property: "og:type", content: "article" },
      { property: "og:url", content: CANONICAL },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: CANONICAL }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Article",
          headline: "High School Basketball Development: How to Level Up for NXGEN",
          description:
            "A practical development guide for high school basketball players transitioning into NXGEN's Rising Stars and Legacy divisions.",
          author: { "@type": "Organization", name: "NXGEN Premier League" },
          publisher: { "@type": "Organization", name: "NXGEN Premier League" },
          mainEntityOfPage: CANONICAL,
        }),
      },
    ],
  }),
  component: DevelopmentPage,
});

function DevelopmentPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-3xl px-6 py-12">
        <BackButton />
        <article className="prose prose-invert mt-6 max-w-none [&_h2]:mt-10 [&_h2]:text-xs [&_h2]:font-black [&_h2]:uppercase [&_h2]:tracking-[0.3em] [&_h2]:text-muted-foreground [&_h3]:mt-6 [&_h3]:text-lg [&_h3]:font-bold [&_p]:text-sm [&_p]:leading-relaxed [&_li]:text-sm [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
            Player Development
          </p>
          <h1 className="mt-2 text-4xl font-black uppercase tracking-tight">
            High School Basketball Development: How to Level Up for NXGEN
          </h1>
          <p className="mt-4 text-base text-muted-foreground">
            Every NXGEN roster starts with a player who took development seriously in high school.
            This guide breaks down the skills, habits, and mindset that get high schoolers noticed —
            and ready — for the Rising Stars and Legacy divisions.
          </p>

          <h2>Why high school is the launchpad</h2>
          <p>
            High school ball is where scoring instincts, defensive footwork, and basketball IQ get
            built. The players who make the jump into NXGEN's Rising Stars division aren't always
            the tallest or the flashiest — they're the ones who showed up every day, tracked their
            progress, and played the game the right way.
          </p>

          <h2>The five skill pillars</h2>
          <h3>1. Ball handling under pressure</h3>
          <p>
            Cones are fine, but live defenders are the real test. Work chase-down drills, full-court
            dribble series, and 1-on-1 with a defender pressing you the entire way. Both hands. Every
            session.
          </p>

          <h3>2. Shooting off the catch AND off the dribble</h3>
          <p>
            Aim for 250-500 game-speed reps per session. Track your make percentage from three spots:
            corner three, wing three, and mid-range pull-up. If you can shoot 38% from three off the
            catch, you're already a Rising Stars asset.
          </p>

          <h3>3. Finishing at the rim</h3>
          <p>
            Both hands. Off two feet AND one foot. Add a floater by junior year. Contact finishes
            with a defender bumping you separate high school scorers from the rest.
          </p>

          <h3>4. Defensive stance and rotations</h3>
          <p>
            Coaches at the NXGEN level notice defense first. Slide, don't cross your feet. Learn to
            close out short with high hands. Know the difference between a help rotation and a
            gamble.
          </p>

          <h3>5. Court vision</h3>
          <p>
            Reps of pick-and-roll reads, drift passes to shooters, and skip passes across the floor.
            Watch film of NBA and PBA point guards making the simple play.
          </p>

          <h2>Strength and conditioning for teenagers</h2>
          <ul>
            <li>Bodyweight fundamentals first — push-ups, pull-ups, squats, planks.</li>
            <li>Add resistance training 2-3x per week once form is locked in.</li>
            <li>Sprints and shuttle runs beat long-distance jogging for basketball conditioning.</li>
            <li>Sleep 8-10 hours. Hydrate. Eat real food. Skip the pre-workout hype.</li>
          </ul>

          <h2>Basketball IQ — the shortcut most players skip</h2>
          <p>
            Watch one full game per week and study one specific thing — a player's off-ball movement,
            a defense's rotations, a coach's late-game sets. IQ is the fastest way to close the gap
            when you're not the most athletic player on the floor.
          </p>

          <h2>The path from high school into NXGEN</h2>
          <p>
            <strong>Rising Stars</strong> is our development division for players still sharpening
            their game — perfect for a high schooler or recent grad who's ready to test themselves
            against strong competition. <strong>Legacy</strong> is where the veterans and top talent
            play; earn your way there through consistent Rising Stars performance.
          </p>
          <p>
            NXGEN tracks every stat, posts highlights, and builds public player profiles you can
            share with coaches and recruiters — your season with us is a portfolio.
          </p>

          <h2>Ready to level up?</h2>
          <p>
            Register for a division, complete your player profile, and start stacking games. The next
            NXGEN standout could be you.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/register"
              className="inline-flex items-center justify-center rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Register for a division
            </Link>
            <Link
              to="/leaders"
              className="inline-flex items-center justify-center rounded-md border border-input bg-background px-5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-accent"
            >
              See the current leaders
            </Link>
          </div>
        </article>
      </div>
    </div>
  );
}
