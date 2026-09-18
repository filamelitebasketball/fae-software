import { SITE_URL } from "@/lib/site-url";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useSiteSettings, peso } from "@/lib/site-settings";
import { useState } from "react";
import { NxPage } from "@/components/nx-shell";

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title: "FAQ — NXGEN Premier League" },
      { name: "description", content: "Answers to the most common questions about NXGEN registration, payments, game day, streaming, sponsorship and contact." },
      { property: "og:title", content: "NXGEN League FAQ" },
      { property: "og:description", content: "Everything you need to know about NXGEN Premier League — before and after you register." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/faq` }],
  }),
  component: FaqPage,
});

type QA = { q: string; a: React.ReactNode };
type Section = { title: string; items: QA[] };

const SECTIONS: Section[] = [
  {
    title: "Registration",
    items: [
      { q: "How do I register a team or as an individual?", a: "Coaches register their team and add their roster during signup. Individual players without a team can register as a free agent and will be placed on a team by league staff. For King of the Court, register directly as an individual entrant — no team needed." },
      { q: "Can I register for more than one division?", a: "Yes. Legacy, 3x3, and King of the Court are separate formats, so the same player can compete in more than one if they meet each division's age requirement." },
      { q: "What happens after I register?", a: "You'll receive full division details, schedule, requirements, and next steps by email." },
    ],
  },
  {
    title: "Payments & Refunds",
    items: [
      { q: "How much is the entry fee?", a: <FeeLine /> },
      { q: "How do I pay?", a: "Pay via GCash, Maya, or bank transfer, then upload proof of payment during registration. Your status will show as Pending until payment is verified." },
      { q: "What’s the refund policy?", a: <>Full refund if requested more than 14 days before opening night. 50% refund if requested 7–13 days before. No refund inside 7 days, except injury or exceptional circumstances, reviewed case by case. Full details are on the <Link to="/legal/refund-policy" style={{ color: "var(--gold-l)", textDecoration: "underline" }}>Refund Policy</Link> page.</> },
    ],
  },
  {
    title: "Game Day",
    items: [
      { q: "Where are games played?", a: "F.A.E. Court, Lipa City, Batangas." },
      { q: "What do I need to bring?", a: "Proper basketball attire and non-marking shoes, your own water bottle, valid ID for verification, and your team jersey if assigned one." },
      { q: "What if my team is late or short players?", a: "Teams have a 15-minute grace period from scheduled tip-off. A minimum of 4 players must be checked in to avoid forfeit." },
    ],
  },
  {
    title: "Streaming & Highlights",
    items: [
      { q: "Are games streamed live?", a: "Yes, every game." },
      { q: "Where can I find highlights and Player of the Game posts?", a: "On the NXGEN homepage, and posted to our Instagram, TikTok, YouTube, and Facebook." },
    ],
  },
  {
    title: "Sponsorship",
    items: [
      { q: "How can my brand sponsor NXGEN?", a: "Reach out at hello@nxgenleague.com. Packages include courtside signage, jersey placements, and digital shout-outs." },
      { q: "Do you support small local businesses?", a: "Yes — we offer flexible packages sized for small local sponsors, not just large brands." },
    ],
  },
  {
    title: "Contact",
    items: [
      { q: "How do I get in touch with the league?", a: "hello@nxgenleague.com or +63 917 501 8835." },
      { q: "Where can I find the rules and waivers?", a: "Linked in the footer of every page — Privacy, Terms, Waiver, Code of Conduct, and Refund Policy." },
    ],
  },
];

/** The one place the fees are written on this page — read from settings. */
function FeeLine() {
  const s = useSiteSettings();
  const f = s.division_fees;
  return (
    <>
      Rising Stars {peso(f["rising-stars"] ?? 0)}/team · Legacy {peso(f.legacy ?? 0)}/team ·{" "}
      3x3 {peso(f["3x3"] ?? 0)}/team · King of the Court {peso(f.kotc ?? 0)}/player.
    </>
  );
}

function FaqSectionBlock({ section }: { section: Section }) {
  const [open, setOpen] = useState<number>(-1);
  return (
    <section style={{ marginBottom: 40 }}>
      <p className="eyebrow" style={{ marginBottom: 16 }}>{section.title}</p>
      <div className="faq-list" style={{ margin: 0, maxWidth: "none" }}>
        {section.items.map((qa, i) => {
          const isOpen = open === i;
          return (
            <div className={`faq-item${isOpen ? " open" : ""}`} key={qa.q}>
              <button className="faq-trig" onClick={() => setOpen(isOpen ? -1 : i)}>
                {qa.q}
                <svg className="faq-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round"><path d="M6 9l6 6 6-6" /></svg>
              </button>
              <div className="faq-body" style={{ maxHeight: isOpen ? 600 : 0 }}>
                <div className="faq-inner">{qa.a}</div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function FaqPage() {
  const settings = useSiteSettings();
  const sections: Section[] = settings.faqs.length
    ? [{ title: "Frequently asked", items: settings.faqs.map((f) => ({ q: f.question, a: f.answer })) }]
    : SECTIONS;

  return (
    <NxPage
      eyebrow="Help & Answers"
      title="Frequently Asked Questions"
      intro="Everything you need to know about NXGEN — registration, payment, game day, streaming, sponsorship, and more."
    >
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        {/* Questions entered in Site Settings replace the built-in set rather
            than sitting alongside it, so there is only ever one answer to a
            question on this page. */}
        {sections.map((section) => (
          <FaqSectionBlock key={section.title} section={section} />
        ))}
      </div>
    </NxPage>
  );
}
