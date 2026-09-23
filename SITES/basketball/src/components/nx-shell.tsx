import { useEffect, useState } from "react";
import { Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { site } from "@/site";

// NXGEN's shell, cut down to a one-page site: in-page anchors instead of routes,
// no auth. Same classes, so it looks and moves exactly like nxgen.faeph.com.
const LINKS = [
  ["Programs", "#programs"],
  ["Inclusions", "#training"],
  ["Schedule", "#schedule"],
  ["Coaches", "#coaches"],
  ["Tournaments", "#tournaments"],
  ["Contact", "#contact"],
] as const;

export function NxNav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 20);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  return (
    <nav className={`nx-nav${scrolled ? " scrolled" : ""}`} aria-label="Main navigation">
      <a href="#top" className="nav-logo">
        <div className="nav-mark" aria-hidden="true"><img src={site.logo} alt="" /></div>
        <span className="nav-brand">{site.name}</span>
      </a>
      <div className="nav-links">
        {LINKS.map(([label, href]) => <a key={href} className="nav-link" href={href}>{label}</a>)}
      </div>
      <div className="nav-ctas">
        <a href="https://faeph.com" className="btn btn-ghost btn-sm nav-hub">FAE Hub</a>
        <a href={site.enroll.href} target="_blank" rel="noopener noreferrer" className="btn btn-gold btn-sm">Enroll →</a>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <button className="btn btn-ghost btn-sm lg:hidden" aria-label="Open menu"><Menu className="h-4 w-4" /></button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[280px] overflow-y-auto">
            <SheetTitle className="sec-label mt-6">{site.name}</SheetTitle>
            <nav className="mt-4 flex flex-col">
              {LINKS.map(([label, href]) => (
                <a key={href} href={href} className="block py-2 text-base font-medium" onClick={() => setOpen(false)}>{label}</a>
              ))}
              <p className="sec-label mt-6">FAE network</p>
              {site.network.map((n) => (
                <a key={n.href} href={n.href} className="block py-2 text-base font-medium">{n.name}</a>
              ))}
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}

export function NxFooter() {
  return (
    <footer className="site-footer">
      <div className="fi">
        <div className="fbrand">
          <div className="flr">
            <div className="flm"><img src={site.logo} alt="" /></div>
            <span>{site.name.toUpperCase()}</span>
          </div>
          <p className="fcopy">{site.tagline} {site.place}. Earned Not Given.</p>
        </div>
        <div className="flinks">
          <div className="flink-group">
            <span className="flink-title">Explore</span>
            {LINKS.map(([label, href]) => <a key={href} href={href}>{label}</a>)}
          </div>
        </div>
        <div className="flinks">
          <div className="flink-group">
            <span className="flink-title">FAE Network</span>
            {site.network.map((n) => <a key={n.href} href={n.href}>{n.name}</a>)}
          </div>
        </div>
        <div className="flinks">
          <div className="flink-group">
            <span className="flink-title">Social</span>
            {site.socials.map((s) => <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer">{s.label}</a>)}
          </div>
        </div>
      </div>
      <div className="flegal">
        <span>© 2026 {site.name}, part of FilAmElite Management. All rights reserved.</span>
        <a href="https://faeph.com">faeph.com</a>
      </div>
    </footer>
  );
}
