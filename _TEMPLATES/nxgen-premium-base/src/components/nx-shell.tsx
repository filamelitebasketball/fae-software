import { Link } from "@tanstack/react-router";
import { useSiteSettings } from "@/lib/site-settings";
import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthRole } from "@/lib/use-auth-role";
import nxgMark from "@/assets/NXG-trim.png.asset.json";

export const NavMark = () => (
  <div className="nav-mark" aria-hidden="true">
    <img src={nxgMark.url} alt="" />
  </div>
);

export function MobileMenu() {
  const { userId, isStaff, loading: roleLoading } = useAuthRole();
  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }
  const linkCls = "block py-2 text-base font-medium";
  const sectionCls = "sec-label mt-6";
  return (
    <nav className="mt-8 flex flex-col">
      <p className={sectionCls}>Explore</p>
      <a href="/#divisions" className={linkCls}>Divisions</a>
      <a href="/#games" className={linkCls}>Games</a>
      <Link to="/teams" className={linkCls}>Teams</Link>
      <Link to="/leaders" className={linkCls}>Leaderboards</Link>
      <Link to="/schedule" className={linkCls}>Full Schedule</Link>
      <Link to="/standings" className={linkCls}>Standings</Link>
      <Link to="/rankings" className={linkCls}>Player Rankings</Link>
      <Link to="/gallery" className={linkCls}>Gallery</Link>
      <Link to="/sponsors" className={linkCls}>Sponsors</Link>
      <Link to="/archive" className={linkCls}>Archive</Link>
      <Link to="/faq" className={linkCls}>FAQ</Link>
      <a href="/#contact" className={linkCls}>Contact</a>

      <p className={sectionCls}>Account</p>
      {!userId ? (
        <>
          <Link to="/auth" className={linkCls}>Sign In</Link>
          <Link to="/register" className={linkCls}>Register a Division</Link>
        </>
      ) : (
        <>
          <Link to="/account" className={linkCls}>My Account</Link>
          <Link to="/profile" className={linkCls}>My Profile</Link>
          <Link to="/settings" className={linkCls}>Settings</Link>
          {!roleLoading && isStaff && <Link to="/admin" className={linkCls}>Admin Dashboard</Link>}
          <button onClick={signOut} className={linkCls + " text-left"}>Sign Out</button>
        </>
      )}

      <p className={sectionCls}>Legal</p>
      <Link to="/legal/privacy" className={linkCls}>Privacy</Link>
      <Link to="/legal/terms" className={linkCls}>Terms</Link>
      <Link to="/legal/waiver" className={linkCls}>Waiver</Link>
      <Link to="/legal/code-of-conduct" className={linkCls}>Code of Conduct</Link>
      <Link to="/legal/refund-policy" className={linkCls}>Refund Policy</Link>
    </nav>
  );
}

export function NxNav() {
  const [scrolled, setScrolled] = useState(false);
  const { userId, isStaff, loading: roleLoading } = useAuthRole();
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 20);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  return (
    <nav className={`nx-nav${scrolled ? " scrolled" : ""}`} aria-label="Main navigation">
      <Link to="/" className="nav-logo"><NavMark /><span className="nav-brand">NXGEN</span></Link>
      <div className="nav-links">
        <Link className="nav-link" to="/mission">Mission</Link>
        <a className="nav-link" href="/#divisions">Divisions</a>
        <a className="nav-link" href="/#livestream">Live</a>
        <Link className="nav-link" to="/schedule">Schedule</Link>
        <Link className="nav-link" to="/standings">Standings</Link>
        <Link className="nav-link" to="/leaders">Leaderboards</Link>
        <Link className="nav-link" to="/teams">Teams</Link>
        {userId && <Link className="nav-link" to="/profile">My Profile</Link>}
        {!roleLoading && isStaff && <Link className="nav-link" to="/admin">Admin</Link>}
        <Link className="nav-link" to="/faq">FAQ</Link>
      </div>
      <div className="nav-ctas">
        {!userId ? (
          <Link to="/auth" className="btn btn-ghost btn-sm">Sign In</Link>
        ) : (
          <Link to="/account" className="btn btn-ghost btn-sm">Account</Link>
        )}
        <Link to="/register" className="btn btn-gold btn-sm">Register →</Link>
        <Sheet>
          <SheetTrigger asChild>
            <button className="btn btn-ghost btn-sm lg:hidden" aria-label="Open menu"><Menu className="h-4 w-4" /></button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[280px] overflow-y-auto">
            <MobileMenu />
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}

export function NxFooter() {
  const s = useSiteSettings();
  return (
    <footer className="site-footer">
      <div className="fi">
        <div className="fbrand">
          <div className="flr">
            <div className="flm"><img src={nxgMark.url} alt="" /></div>
            <span>NXGEN</span>
          </div>
          <p className="fcopy">{s.hero_headline} {s.venue_name}, {s.venue_location}.</p>
        </div>

        <div className="flinks">
          <div className="flink-group">
            <span className="flink-title">Quick Links</span>
            <Link to="/schedule">Schedule</Link>
            <Link to="/standings">Standings</Link>
            <Link to="/leaders">Leaderboards</Link>
            <Link to="/teams">Teams</Link>
            <Link to="/rankings">Player Rankings</Link>
          </div>
        </div>

        <div className="flinks">
          <div className="flink-group">
            <span className="flink-title">More</span>
            <Link to="/register">Register</Link>
            <Link to="/gallery">Gallery</Link>
            <Link to="/sponsors">Sponsors</Link>
            <Link to="/faq">FAQ</Link>
            <a href="/#contact">Contact</a>
          </div>
        </div>

        <div className="flinks">
          <div className="flink-group">
            <span className="flink-title">Social</span>
            {([
              ["Instagram", s.social_instagram],
              ["Facebook", s.social_facebook],
              ["YouTube", s.social_youtube],
              ["TikTok", s.social_tiktok],
            ] as const).map(([label, href]) =>
              // A cleared link should drop out of the footer, not sit there
              // pointing at nothing.
              href ? (
                <a key={label} href={href} target="_blank" rel="noopener noreferrer">{label}</a>
              ) : null,
            )}
          </div>
        </div>
      </div>
      <div className="flegal">
        <span>© 2026 NXGEN Premier League, operated by FAE Sports Management Services. All rights reserved.</span>
        <Link to="/legal/waiver">Waiver</Link>
        <Link to="/legal/terms">Terms</Link>
        <Link to="/legal/refund-policy">Refunds</Link>
      </div>
    </footer>
  );
}

/** Standard v3 page shell: sticky nav, gold page header, content container, footer. */
export function NxPage({
  eyebrow,
  title,
  intro,
  children,
}: {
  eyebrow: string;
  title: string;
  intro?: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <NxNav />
      <main style={{ paddingTop: 96, minHeight: "70vh", background: "var(--void)" }}>
        <section className="section" style={{ paddingTop: 24, paddingBottom: 40 }}>
          <div className="container">
            <p className="eyebrow r3">{eyebrow}</p>
            <h1 className="display r3" style={{ fontSize: "clamp(2rem,4.5vw,3.2rem)", marginTop: 12 }}>{title}</h1>
            {intro && <p className="r3" style={{ color: "var(--silver-d)", maxWidth: 620, marginTop: 14, lineHeight: 1.7, fontSize: 14 }}>{intro}</p>}
          </div>
        </section>
        <section className="section" style={{ paddingTop: 0, paddingBottom: 90 }}>
          <div className="container r3">{children}</div>
        </section>
      </main>
      <NxFooter />
    </>
  );
}
