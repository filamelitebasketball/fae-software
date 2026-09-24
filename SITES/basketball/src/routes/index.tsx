import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check, Dumbbell, ExternalLink, Mail, MapPin, MessageCircle, Phone, ShieldCheck, Star, ThumbsUp, Trophy, Users, Warehouse, Zap } from "lucide-react";
import { NxNav, NxFooter } from "@/components/nx-shell";
import { Roster } from "@/components/roster";
import { ScrollBasketball } from "@/components/scroll-basketball";
import { NxReveal } from "@/components/nx-reveal";
import { Scroll3DSections } from "@/components/scroll-3d-sections";
import { ScrollAnimate } from "@/components/scroll-animate";
import { TiltCards } from "@/components/tilt-cards";
import { site } from "@/site";

const OG = `${site.url}/og.jpg`;
const TITLE = `${site.name} — ${site.sport} Training in ${site.place}`;
const DESC = `${site.name}: ${site.tagline} ${site.meta}. ${site.place}. Earned Not Given.`;

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:url", content: `${site.url}/` },
      { property: "og:image", content: OG },
      { name: "twitter:image", content: OG },
    ],
    links: [{ rel: "canonical", href: `${site.url}/` }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "SportsOrganization",
          name: site.name,
          url: `${site.url}/`,
          logo: `${site.url}${site.logo}`,
          sport: site.sport,
          telephone: site.contact.phone,
          email: site.contact.email,
          address: { "@type": "PostalAddress", addressLocality: "Lipa City", addressRegion: "Batangas", addressCountry: "PH" },
          sameAs: site.socials.map((s) => s.href),
          parentOrganization: { "@type": "Organization", name: "FilAmElite Management", url: "https://faeph.com" },
        }),
      },
    ],
  }),
  component: Index,
});

/** Opens off-site links in a new tab; in-page anchors stay put. */
const ext = (href: string) => (href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {});

const ICONS = { whistle: Dumbbell, trophy: Trophy, user: Users, bolt: Zap, court: Warehouse };

/* Hero parallax + scroll progress — lifted from NXGEN's homepage. Each backdrop layer
   moves at its own depth; transforms go straight onto the layers so scrolling never
   restyles the hero subtree. The spotlight follows the pointer the same way. */
function useHeroParallax() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const hero = document.querySelector<HTMLElement>(".hero");
    const bg = document.querySelector<HTMLElement>(".hero-bg");
    const floor = document.querySelector<HTMLElement>(".hero-floor");
    const ambient = document.querySelector<HTMLElement>(".hero-ambient");
    const spot = document.querySelector<HTMLElement>(".hero-spot");
    let raf = 0;
    const apply = () => {
      raf = 0;
      const y = window.scrollY;
      const vh = window.innerHeight || 1;
      const content = document.querySelector<HTMLElement>(".hero-content");
      const cue = document.querySelector<HTMLElement>(".hero-cue");
      const bar = document.querySelector<HTMLElement>(".scroll-prog > i");
      if (y < vh * 1.3) {
        if (bg) bg.style.transform = `translate3d(0, ${y * 0.38}px, 0)`;
        if (floor) floor.style.transform = `translate3d(0, ${y * 0.14}px, 0) perspective(900px) rotateX(62deg)`;
        if (ambient) ambient.style.translate = `0 ${y * 0.22}px`;
      }
      const p = Math.min(y / (vh * 0.75), 1);
      if (content) {
        content.style.transform = `translate3d(0, ${p * -70}px, 0)`;
        content.style.opacity = String(1 - p * 0.95);
      }
      if (cue) cue.style.opacity = String(Math.max(0, 1 - y / 220));
      if (bar) {
        const max = document.documentElement.scrollHeight - vh;
        bar.style.transform = `scaleX(${max > 0 ? Math.min(y / max, 1) : 0})`;
      }
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(apply); };
    const onPointer = (e: PointerEvent) => {
      if (!hero || !spot) return;
      const r = hero.getBoundingClientRect();
      spot.style.transform = `translate3d(${e.clientX - r.left - r.width * 0.5}px, ${e.clientY - r.top - r.height * 0.32}px, 0)`;
    };
    apply();
    // If the reveal animation never runs (throttled tab, battery saver) the copy must still show.
    const shown = window.setTimeout(() => document.querySelector(".hero-content")?.classList.add("hero-shown"), 2600);
    window.addEventListener("scroll", onScroll, { passive: true });
    hero?.addEventListener("pointermove", onPointer, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      hero?.removeEventListener("pointermove", onPointer);
      if (raf) cancelAnimationFrame(raf);
      window.clearTimeout(shown);
    };
  }, []);
}

function Head({ eyebrow, title, intro, center }: { eyebrow: string; title: string; intro?: string; center?: boolean }) {
  return (
    <div className={center ? "tc sec-head" : "sec-head"}>
      <p className="eyebrow r3">{eyebrow}</p>
      <h2 className="display r3 d1">{title}</h2>
      {intro && <p className="sec-intro r3 d2">{intro}</p>}
    </div>
  );
}

/** Steps once through the hero's closing words and rests on the last, so the headline stops
 *  moving within about 5 seconds. All words share one grid cell, so the line never reflows. */
function Rotator({ words }: { words: string[] }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (words.length < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let n = 0;
    const t = window.setInterval(() => {
      setI(++n);
      if (n >= words.length - 1) window.clearInterval(t);
    }, 1500);
    return () => window.clearInterval(t);
  }, [words.length]);
  return (
    <span className="hero-rot" aria-hidden="true">
      {words.map((w, n) => <span key={w} className={n === i ? "on" : undefined}>{w}</span>)}
    </span>
  );
}

function Hero() {
  const word = site.wordmark.split("");
  return (
    <section className="hero" id="top">
      <div className="hero-bg" aria-hidden="true" />
      <div className="hero-floor" aria-hidden="true" />
      <div className="hero-spot" aria-hidden="true" />
      <div className="hero-ambient" aria-hidden="true" />
      <div className="hero-content">
        <div className="hero-badge-wrap"><div className="hero-badge"><span className="dot" />{site.badge}</div></div>
        <h1 className="sr-only">{site.name} — {site.tagline}</h1>
        <p className={`hero-title${word.length > 6 ? " long" : ""}`} aria-hidden="true">
          {word.map((c, i) => (
            <span className="ht-m" key={i}><span className="ht-c" style={{ animationDelay: `${0.22 + i * 0.06}s` }}>{c}</span></span>
          ))}
        </p>
        <p className="hero-sub"><span className="ht-m"><span className="ht-c" style={{ animationDelay: "0.8s" }}>{site.sport}</span></span></p>
        <p className="hero-copy hero-line" style={{ animationDelay: "0.95s" }}>
          Train to become a <Rotator words={site.rotate} /><span className="sr-only">{site.rotate.join(", ")}</span>
        </p>
        <p className="hero-meta hero-line" style={{ animationDelay: "1.02s" }}>{site.tagline}</p>
        <p className="hero-place hero-line" style={{ animationDelay: "1.08s" }}><span><MapPin aria-hidden="true" />{site.place}</span></p>
        <div className="hero-ctas hero-line" style={{ animationDelay: "1.16s" }}>
          <a className="btn btn-gold" href="#roster">Explore Player Roster <ArrowRight aria-hidden="true" size={16} /></a>
          <a className="btn btn-ghost" href="#enroll">Join Training Programs</a>
        </div>
        <p className="hero-coach hero-line" style={{ animationDelay: "1.24s" }}>
          {site.heroLink.lead} <a href={site.heroLink.href} {...ext(site.heroLink.href)}>{site.heroLink.label} &#8594;</a>
        </p>
      </div>
      <a href="#programs" className="hero-cue" aria-label="Scroll to programs"><span>Scroll</span><i aria-hidden="true" /></a>
    </section>
  );
}

function Programs() {
  return (
    <section id="programs" className="section" style={{ background: "var(--sec-a)" }}>
      <div className="container">
        <div className="stat-band r3">
          {site.stats.map((s) => (
            <div className="hstat" key={s.label}><b>{s.value}</b><span>{s.label}</span></div>
          ))}
        </div>
        <Head eyebrow="Programs & batches" title="Pick your path" center />
        <div className="div-grid">
          {site.programs.map((p) => {
            const Icon = p.icon ? ICONS[p.icon] : null;
            return (
              <a key={p.title} href={p.href} {...ext(p.href)} className="div-card">
                <div className="d-logo-wrap">
                  {p.logo ? <img className="d-logo" src={p.logo} alt="" loading="lazy" /> : Icon && <span className="d-ico prog-ico"><Icon aria-hidden="true" /></span>}
                </div>
                <h3>{p.title}</h3>
                <p className="d-meta">{p.meta[0]}<br />{p.meta[1]}</p>
                <div className="d-fee">{p.fee}{p.per && <span className="d-per"> {p.per}</span>}</div>
                <div className="d-arr"><ArrowRight aria-hidden="true" /></div>
              </a>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function Training() {
  const t = site.training;
  return (
    <section id="training" className="section" style={{ background: "var(--sec-b)" }}>
      <div className="container">
        <Head eyebrow="Inclusions" title="Inside every batch" intro={`${t.price} per batch of ${t.per}. Tournament entry is a separate fee.`} />
        <div className="two-col">
          <div className="lb-card r3 d2">
            <div className="lb-head"><h3>TRAINING · {t.per.toUpperCase()}</h3><span className="badge bg">{t.price}</span></div>
            {t.groups.map((g) => (
              <div key={g.label}>
                <div className="lb-row list-label">{g.label}</div>
                {g.items.map((it) => (
                  <div className="lb-row" key={it}><Check className="tick" aria-hidden="true" /><span className="lb-name">{it}</span></div>
                ))}
              </div>
            ))}
            <div className="lb-row list-label">Awards</div>
            {t.awards.map((it) => (
              <div className="lb-row" key={it}><Trophy className="tick" aria-hidden="true" /><span className="lb-name">{it}</span></div>
            ))}
          </div>
          <div className="stack">
            <div className="lb-card r3 d3">
              <div className="lb-head"><h3>TOURNAMENT PACKAGE</h3><span className="badge bg">{site.tournament.fee}</span></div>
              {site.tournament.items.map((it) => (
                <div className="lb-row" key={it}><Check className="tick" aria-hidden="true" /><span className="lb-name">{it}</span></div>
              ))}
            </div>
            {t.benefits && (
              <div className="lb-card r3 d3">
                <div className="lb-head"><h3>BENEFITS</h3></div>
                {t.benefits.map((it) => (
                  <div className="lb-row" key={it}><Zap className="tick" aria-hidden="true" /><span className="lb-name">{it}</span></div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function Schedule() {
  return (
    <section id="schedule" className="section" style={{ background: "var(--sec-a)" }}>
      <div className="container narrow">
        <Head eyebrow="Schedule" title="Weekend training" intro="Every Saturday and Sunday, all year round." />
        <div className="games-list r3 d2">
          {site.schedule.map((s) => (
            <div className="game-row" key={s.day + s.time}>
              <div className="gdate">{s.day}</div>
              <div className="gdiv">{s.group}</div>
              <div className="gteams">{s.time}</div>
              <span className="badge g-up">Weekly</span>
            </div>
          ))}
        </div>
        <div className="tc" style={{ marginTop: 28 }}>
          <a className="btn btn-gold" href="#enroll">Reserve a slot <ArrowRight aria-hidden="true" size={16} /></a>
        </div>
      </div>
    </section>
  );
}

function Coaches() {
  return (
    <section id="coaches" className="section" style={{ background: "var(--sec-b)" }}>
      <div className="container two-col align-center">
        <figure className="frame r3">
          <img src={site.coaches.image} alt={site.coaches.alt} loading="lazy" decoding="async" />
        </figure>
        <div>
          <Head eyebrow="Coaches" title="Trained by the best" />
          <ul className="people r3 d2">
            {site.coaches.people.map((p) => (
              <li key={p.name}>
                <strong>{p.name}</strong>
                <span>{p.role}</span>
                {p.note && <em>{p.note}</em>}
              </li>
            ))}
          </ul>
          <dl className="vm r3 d3">
            <div><dt>Vision</dt><dd>{site.vision}</dd></div>
            <div><dt>Mission</dt><dd>{site.mission}</dd></div>
          </dl>
          <img className="slogan r3 d3" src={site.slogan} alt="Earned Not Given" loading="lazy" />
        </div>
      </div>
    </section>
  );
}

function Record() {
  return (
    <section id="tournaments" className="section" style={{ background: "var(--sec-a)" }}>
      <div className="container">
        <Head eyebrow="Hall of fame" title={site.record.title} center />
        <div className="chips r3 d2">
          {site.record.series.map((s) => <span className="chip" key={s}>{s}</span>)}
        </div>
        <div className="two-col">
          {site.record.images.map((im) => (
            <figure className="frame r3 d3" key={im.src}>
              <img src={im.src} alt={im.alt} loading="lazy" decoding="async" />
              <figcaption>{im.caption}</figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

function Kit() {
  return (
    <section id="kit" className="section" style={{ background: "var(--sec-b)" }}>
      <div className="container">
        <Head eyebrow="2026 Kit" title="Wear the name" center />
        <div className="kit-grid">
          {site.kit.map((k) => (
            <figure className="kit nx3d" key={k.src}>
              <img src={k.src} alt={k.alt} loading="lazy" decoding="async" />
              <figcaption>{k.alt}</figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

function Film() {
  return (
    <section id="film" className="section" style={{ background: "var(--sec-a)" }}>
      <div className="container two-col align-center">
        <div>
          <Head eyebrow="Watch" title="The program in one film" intro={site.film.blurb} />
          <div className="r3 d3" style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <a className="btn btn-gold" href="#enroll">{site.enroll.label} <ArrowRight aria-hidden="true" size={16} /></a>
            {site.facebook && <a className="btn btn-ghost" href={site.facebook} target="_blank" rel="noopener noreferrer">More on Facebook</a>}
          </div>
        </div>
        <div className="film r3 d2">
          <video src={site.film.src} poster={site.film.poster} controls preload="none" playsInline aria-label={`${site.name} program film`} />
        </div>
      </div>
    </section>
  );
}

function FacebookFeed({ href }: { href: string }) {
  // Facebook's page plugin: live posts straight from the page. Falls back to a plain
  // link if the embed is blocked (tracker blockers, strict browsers) — NXGEN pattern.
  const [failed, setFailed] = useState(false);
  const loaded = useRef(false);
  useEffect(() => {
    const t = window.setTimeout(() => { if (!loaded.current) setFailed(true); }, 7000);
    return () => window.clearTimeout(t);
  }, []);
  if (failed) {
    return (
      <div className="fb-fallback">
        <p>See our latest sessions and results on Facebook.</p>
        <a className="btn btn-gold btn-sm" href={href} target="_blank" rel="noopener noreferrer">Open Facebook page</a>
      </div>
    );
  }
  return (
    <iframe
      title={`${site.name} on Facebook`}
      src={`https://www.facebook.com/plugins/page.php?href=${encodeURIComponent(href)}&tabs=timeline&width=500&height=620&small_header=true&adapt_container_width=true`}
      loading="lazy"
      allow="encrypted-media; picture-in-picture; web-share"
      onLoad={() => { loaded.current = true; }}
    />
  );
}

function Reviews() {
  const r = site.reviews;
  if (!r.length && !site.facebook) return null;
  // A marquee of one or two cards just repeats itself; below three they sit still.
  const loop = r.length >= 3;
  const card = (v: (typeof r)[number], i: number, dup = false) => (
    <figure className="rev-card" key={(dup ? "d" : "") + i} aria-hidden={dup || undefined}>
      <span className="rev-badge"><ThumbsUp aria-hidden="true" />Recommends</span>
      <blockquote>{v.quote}</blockquote>
      <figcaption><strong>{v.by}</strong> · {v.meta}</figcaption>
    </figure>
  );
  return (
    <section id="community" className="section" style={{ background: "var(--sec-b)" }}>
      <div className="container two-col">
        <div>
          <Head eyebrow="Parent & player reviews" title="What families say" />
          {site.reviewSummary && (
            <a className="rev-sum r3 d1" href={site.reviewSummary.href} target="_blank" rel="noopener noreferrer">
              <Star aria-hidden="true" />{site.reviewSummary.label} on Facebook
            </a>
          )}
          {r.length > 0 && (loop ? (
            <div className="rev-marquee r3 d2" tabIndex={0} aria-label="Reviews, scrolling. Focus or hold to pause."><div className="rev-track">{r.map((v, i) => card(v, i))}{r.map((v, i) => card(v, i, true))}</div></div>
          ) : (
            <div className="rev-row r3 d2">{r.map((v, i) => card(v, i))}</div>
          ))}
        </div>
        {site.facebook && <div className="fb-card r3 d3"><FacebookFeed href={site.facebook} /></div>}
      </div>
    </section>
  );
}

function Network() {
  return (
    <section id="network" className="section" style={{ background: "var(--sec-a)" }}>
      <div className="container">
        <Head eyebrow="FilAmElite Management" title="One FAE network" intro="Train here. Play in the league. Book the court. It all connects at faeph.com." center />
        <div className="net-grid">
          {site.network.map((n) => (
            <a className="net-card nx3d" key={n.name} href={n.href} target="_blank" rel="noopener noreferrer">
              <img src={n.logo} alt="" loading="lazy" />
              <span><strong>{n.name}</strong><small>{n.caption}</small></span>
              <ArrowRight aria-hidden="true" />
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

function Enroll() {
  const c = site.contact;
  const form = site.enroll.form;
  return (
    <section id="enroll" className="section" style={{ background: "var(--sec-b)" }}>
      <div className="container">
        <Head
          eyebrow="Enrollment"
          title="Claim your spot"
          intro={form
            ? "Register with the official FilAmElite form below. Our team sends the terms and confirms your slot by Messenger or email."
            : "Message us to reserve a slot. Our team sends the terms and confirms your spot."}
          center
        />
        {form ? (
          <div className="form-card r3 d2">
            <div className="form-bar">
              <span><ShieldCheck aria-hidden="true" />Submitted through Google Forms to the FilAmElite registration team. Nothing you enter appears on this website.</span>
              <a href={form} target="_blank" rel="noopener noreferrer">Open in a new tab <ExternalLink aria-hidden="true" /></a>
            </div>
            <iframe title={`${site.name} registration form`} src={`${form}?embedded=true`} loading="lazy" />
          </div>
        ) : (
          <div className="tc r3 d2" style={{ marginBottom: 28 }}>
            <a className="btn btn-gold" href={site.enroll.href} {...ext(site.enroll.href)}>{site.enroll.label} <ArrowRight aria-hidden="true" size={16} /></a>
          </div>
        )}
        <div className="cg r3 d2" id="contact">
          <div className="cc">
            <h3><MapPin aria-hidden="true" />Where</h3>
            <p className="cc-text">{c.address}</p>
            {c.note && <p className="cc-note">{c.note}</p>}
            {c.mapUrl && <a href={c.mapUrl} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm">Get directions &#8594;</a>}
          </div>
          <div className="cc">
            <h3><Phone aria-hidden="true" />Contact</h3>
            <a className="clink" href={`tel:${c.phone}`}><Phone aria-hidden="true" />{c.phoneLabel}</a>
            <a className="clink" href={`mailto:${c.email}`}><Mail aria-hidden="true" />{c.email}</a>
            <a className="clink" href={site.enroll.href} target="_blank" rel="noopener noreferrer"><MessageCircle aria-hidden="true" />Message us</a>
          </div>
          <div className="cc">
            <h3><Users aria-hidden="true" />Follow</h3>
            {site.socials.map((s) => (
              <a key={s.label} className="socl" href={s.href} target="_blank" rel="noopener noreferrer"><span className="sn">{s.label}</span><ArrowRight aria-hidden="true" /></a>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Sponsors() {
  return (
    <section className="section" style={{ padding: "72px 0", borderTop: "1px solid var(--line)", background: "var(--sec-a)" }}>
      <div className="container tc">
        <p className="eyebrow r3">Partners</p>
        <div className="spon-grid r3 d2">
          {site.sponsors.map((s) => (
            <div className="spon-chip nx3d" key={s.name}>
              <span className="spon-logo-wrap"><img src={s.logo} alt={s.name} loading="lazy" /></span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Index() {
  useHeroParallax();
  return (
    <>
      <div className="site-bg" aria-hidden="true" />
      <div className="scroll-prog" aria-hidden="true"><i /></div>
      <NxNav />
      <main>
        <Hero />
        <div className="ticker-strip" aria-hidden="true">
          <div className="ticker-track">
            {[...site.ticker, ...site.ticker].map((t, i) => <span className="ttag" key={i}>{t}</span>)}
          </div>
        </div>
        <Programs />
        <Training />
        <Schedule />
        <Roster />
        <Record />
        <Coaches />
        <Kit />
        <Film />
        <Reviews />
        <Enroll />
        <Network />
        <Sponsors />
      </main>
      <NxFooter />
      {/* NXGEN motion system. Mounted inside the page (not the root) so it only
          touches the DOM after this route has hydrated — no class mismatch. */}
      <NxReveal />
      <ScrollBasketball />
      <Scroll3DSections />
      <ScrollAnimate />
      <TiltCards />
    </>
  );
}
