import { SITE_URL } from "@/lib/site-url";
import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Instagram, Youtube, Facebook, Mail, Phone, Users, CalendarDays, Radio, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { NxPage } from "@/components/nx-shell";
import sponsorFilamElite from "@/assets/sponsor-filam-elite.png.asset.json";
import sponsorPickle from "@/assets/sponsor-picklemania.png.asset.json";
import sponsorAguila from "@/assets/sponsor-aguila.png.asset.json";
import sponsorVA from "@/assets/sponsor-va.png.asset.json";
import sponsorFilamVB from "@/assets/sponsor-filam-volleyball.png.asset.json";
import linkmeLogo from "@/assets/linkme-logo.png.asset.json";

export const Route = createFileRoute("/sponsors")({
  head: () => ({
    meta: [
      { title: "Sponsor Kit — NXGEN Premier League" },
      { name: "description", content: "Partner with NXGEN Premier League: audience reach, courtside signage, jersey placements and digital shout-outs across four basketball divisions." },
      { property: "og:title", content: "Sponsor NXGEN Premier League" },
      { property: "og:description", content: "Courtside signage, jersey placement and digital shout-outs — reach players, families and fans every game night at F.A.E. Court." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/sponsors` }],
  }),
  component: SponsorsPage,
});

const SPONSORS = [
  { name: "Fil-Am Elite Management", url: sponsorFilamElite.url },
  { name: "Picklemania", url: sponsorPickle.url },
  { name: "Aguila Auto Glass", url: sponsorAguila.url },
  { name: "VA", url: sponsorVA.url },
  { name: "Fil-Am Elite Volleyball", url: sponsorFilamVB.url },
  { name: "LinkmePh", url: linkmeLogo.url },
];

const SOCIALS = [
  { Icon: Instagram, label: "Instagram", handle: "@NXGENPREMIERELEAGUE", href: "https://instagram.com/NXGENPREMIERELEAGUE" },
  { Icon: TikTokIcon, label: "TikTok", handle: "@NXGENPREMIERELEAGUE", href: "https://www.tiktok.com/@NXGENPREMIERELEAGUE" },
  { Icon: Youtube, label: "YouTube", handle: "@NXGENPREMIERELEAGUE", href: "https://www.youtube.com/@NXGENPREMIERELEAGUE" },
  { Icon: Facebook, label: "Facebook", handle: "NXGEN Premier League", href: "https://www.facebook.com/profile.php?id=61590655296483" },
];

const PLACEMENTS = [
  { title: "Courtside Signage", body: "Branded boards on the F.A.E. Court sidelines — in every livestream frame, photo and highlight clip all season long." },
  { title: "Jersey Placement", body: "Your logo on team jerseys across Rising Stars, Legacy, 3x3 or King of the Court — worn on court, in team photos and in Player of the Game posts." },
  { title: "Digital Shout-Outs", body: "Named mentions on the livestream, tagged posts on Instagram, TikTok, YouTube and Facebook, plus your logo in our homepage sponsor wall." },
];

const REACH = [
  { Icon: CalendarDays, value: "Up to 20", label: "Games played per week across four divisions" },
  { Icon: Users, value: "8–20", label: "Teams per division, 10–15 players each, plus families courtside" },
  { Icon: Radio, value: "Every game", label: "Livestreamed and archived on our channels" },
];

function SponsorsPage() {
  const [form, setForm] = useState({ name: "", company: "", email: "", message: "" });
  const [sending, setSending] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    const { error } = await supabase.from("sponsor_inquiries").insert({
      name: form.name.trim(),
      company: form.company.trim(),
      email: form.email.trim(),
      message: form.message.trim(),
    });
    setSending(false);
    if (error) {
      toast.error("Could not send your inquiry. Please email hello@nxgenleague.com.");
      return;
    }
    toast.success("Thanks! Our team will get back to you shortly.");
    setForm({ name: "", company: "", email: "", message: "" });
  };

  return (
    <NxPage
      eyebrow="Sponsor Kit"
      title="Put Your Brand Courtside"
      intro="NXGEN Premier League runs four basketball divisions out of F.A.E. Court — Rising Stars, Legacy, 3x3 and King of the Court. Every game is streamed, clipped and posted. Sponsors ride along with all of it."
    >
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 8 }}>
        <a href="#inquiry" className="btn btn-gold">Become a sponsor</a>
        <a href="mailto:hello@nxgenleague.com" className="btn btn-ghost">Email the league</a>
      </div>

      {/* Reach */}
      <section style={{ marginTop: 56 }}>
        <h2 className="display" style={{ fontSize: "clamp(1.6rem,3vw,2.4rem)" }}>Audience Reach</h2>
        <div className="div-grid" style={{ marginTop: 24 }}>
          {REACH.map(({ Icon, value, label }) => (
            <div key={label} className="card" style={{ padding: 24 }}>
              <Icon className="h-6 w-6" style={{ color: "var(--gold)" }} />
              <p className="display" style={{ fontSize: 26, marginTop: 20 }}>{value}</p>
              <p style={{ marginTop: 8, fontSize: 13, color: "var(--silver-d)" }}>{label}</p>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 14 }} className="sp-social-grid">
          {SOCIALS.map(({ Icon, label, handle, href }) => (
            <a key={label} href={href} target="_blank" rel="noreferrer" className="card" style={{ padding: 20, display: "flex", flexDirection: "column", justifyContent: "space-between", textDecoration: "none", transition: "border-color .2s" }}>
              <Icon className="h-6 w-6" style={{ color: "var(--paint)" }} />
              <div style={{ marginTop: 28 }}>
                <div style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".04em", color: "var(--paint)" }}>{label}</div>
                <div style={{ fontSize: 11, color: "var(--silver-d)" }}>{handle}</div>
              </div>
            </a>
          ))}
        </div>
        <p style={{ marginTop: 14, fontSize: 12, color: "var(--silver-d)" }}>
          Follower counts are growing weekly across all four channels — ask us for the latest numbers when you inquire.
        </p>
      </section>

      {/* Current sponsors */}
      <section style={{ marginTop: 56, borderTop: "1px solid var(--line)", paddingTop: 44 }}>
        <p className="eyebrow">In good company</p>
        <h2 className="display" style={{ fontSize: "clamp(1.6rem,3vw,2.4rem)", marginTop: 12 }}>Current Sponsors</h2>
        <div className="spon-grid" style={{ justifyContent: "flex-start" }}>
          {SPONSORS.map((s) => (
            <div key={s.name} className="spon-chip">
              <span className="spon-logo-wrap">
                <img src={s.url} alt={s.name} loading="lazy" />
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Placements */}
      <section style={{ marginTop: 56, borderTop: "1px solid var(--line)", paddingTop: 44 }}>
        <h2 className="display" style={{ fontSize: "clamp(1.6rem,3vw,2.4rem)" }}>Available Placements</h2>
        <div className="div-grid" style={{ marginTop: 24 }}>
          {PLACEMENTS.map((p, i) => (
            <article key={p.title} className="card" style={{ padding: 24 }}>
              <span className="mono" style={{ fontSize: 11, fontWeight: 700, color: "var(--gold)" }}>0{i + 1}</span>
              <h3 className="display" style={{ fontSize: 20, marginTop: 14 }}>{p.title}</h3>
              <p style={{ marginTop: 12, fontSize: 13, lineHeight: 1.7, color: "var(--silver-d)" }}>{p.body}</p>
            </article>
          ))}
        </div>
      </section>

      {/* Inquiry */}
      <section id="inquiry" style={{ marginTop: 56, borderTop: "1px solid var(--line)", paddingTop: 44, display: "grid", gap: 32 }} className="sp-inquiry-grid">
        <div>
          <h2 className="display" style={{ fontSize: "clamp(1.6rem,3vw,2.4rem)" }}>Sponsorship Inquiry</h2>
          <p style={{ marginTop: 14, maxWidth: 420, fontSize: 13, color: "var(--silver-d)", lineHeight: 1.7 }}>
            Tell us about your brand and what you'd like to reach. Our team replies with a package breakdown and rates.
          </p>
          <ul style={{ marginTop: 28, display: "grid", gap: 10, fontSize: 13, listStyle: "none" }}>
            <li className="card" style={{ display: "flex", alignItems: "center", gap: 12, padding: 16 }}>
              <Mail className="h-4 w-4" style={{ color: "var(--gold)" }} />
              <a href="mailto:hello@nxgenleague.com" style={{ color: "var(--paint)", fontWeight: 600, wordBreak: "break-all" }}>hello@nxgenleague.com</a>
            </li>
            <li className="card" style={{ display: "flex", alignItems: "center", gap: 12, padding: 16 }}>
              <Phone className="h-4 w-4" style={{ color: "var(--gold)" }} />
              <a href="tel:+639175018835" style={{ color: "var(--paint)", fontWeight: 600 }}>+63 917 501 8835</a>
            </li>
          </ul>
        </div>

        <form onSubmit={submit} className="card" style={{ padding: 24, display: "grid", gap: 16 }}>
          <div>
            <label htmlFor="sp-name" className="mono" style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", color: "var(--silver-d)" }}>Name</label>
            <Input id="sp-name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Your full name" className="mt-2" />
          </div>
          <div>
            <label htmlFor="sp-company" className="mono" style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", color: "var(--silver-d)" }}>Company</label>
            <Input id="sp-company" required value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} placeholder="Brand or business name" className="mt-2" />
          </div>
          <div>
            <label htmlFor="sp-email" className="mono" style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", color: "var(--silver-d)" }}>Email</label>
            <Input id="sp-email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@company.com" className="mt-2" />
          </div>
          <div>
            <label htmlFor="sp-message" className="mono" style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", color: "var(--silver-d)" }}>Message</label>
            <Textarea id="sp-message" required rows={5} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="What placements are you interested in?" className="mt-2" />
          </div>
          <Button type="submit" disabled={sending} className="btn btn-gold w-full">
            {sending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending…</> : "Send inquiry"}
          </Button>
        </form>
      </section>

      <div style={{ marginTop: 56, display: "flex", flexWrap: "wrap", gap: 16, borderTop: "1px solid var(--line)", paddingTop: 28 }}>
        <Link to="/" className="nav-link">Home</Link>
        <Link to="/schedule" className="nav-link">Schedule</Link>
        <Link to="/archive" className="nav-link">Season Archive</Link>
        <Link to="/faq" className="nav-link">FAQ</Link>
      </div>
    </NxPage>
  );
}

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M16.6 5.82A4.28 4.28 0 0 1 15.54 3h-3.09v12.4a2.59 2.59 0 1 1-1.78-2.46V9.8a5.68 5.68 0 1 0 4.87 5.62V9.01a7.35 7.35 0 0 0 4.29 1.38V7.3a4.29 4.29 0 0 1-3.23-1.48Z" />
    </svg>
  );
}
