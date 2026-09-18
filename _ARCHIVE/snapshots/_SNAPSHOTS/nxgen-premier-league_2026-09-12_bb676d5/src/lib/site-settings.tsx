/**
 * The site's editable settings, in one place.
 *
 * Before this, the admin Site Control Panel wrote twenty-seven keys into
 * `site_settings` and the site read four of them. Everything else — the season
 * badge, the announcement, contact details, social links, venue, hero copy,
 * FAQs, division fees, the registration switch — was hardcoded in the pages,
 * so an admin could change a value, see "Saved", and watch nothing happen. The
 * fees were hardcoded in five separate files, which is how the panel came to
 * claim Rising Stars was ₱35,000 while every page said ₱30,000.
 *
 * The defaults below ARE the current site copy, character for character, so
 * turning this on changes nothing visible. A row in `site_settings` overrides
 * its default; an empty or missing row falls back. There is no second copy of
 * any of these values anywhere else — if a page needs one, it reads it here.
 */

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Sponsor = { name: string; logo_url: string; website_url: string; active: boolean };
export type Faq = { question: string; answer: string };

export type SiteSettings = {
  maintenance_mode: boolean;
  gallery_visible: boolean;
  archive_visible: boolean;
  livestream_url: string;
  site_announcement: string;

  registration_open: boolean;
  division_open: Record<string, boolean>;
  /** Whole pesos, matching how they are written on the site. */
  division_fees: Record<string, number>;

  hero_badge_text: string;
  hero_headline: string;
  hero_subheadline: string;
  about_text: string;
  payment_note: string;
  court_data_packages: string;

  sponsors: Sponsor[];
  faqs: Faq[];

  social_instagram: string;
  social_facebook: string;
  social_youtube: string;
  social_tiktok: string;
  contact_email: string;
  contact_phone: string;
  venue_name: string;
  venue_location: string;

  sections: Record<string, boolean>;
};

export const DIVISION_KEYS = ["rising-stars", "legacy", "3x3", "kotc"] as const;
export const SECTION_KEYS = [
  "divisions", "games", "leaderboard", "sponsors", "contact", "livestream", "highlights",
] as const;

/** Exactly what the site shows today. Change these and the site changes. */
export const SITE_DEFAULTS: SiteSettings = {
  maintenance_mode: false,
  gallery_visible: true,
  archive_visible: true,
  livestream_url: "",
  site_announcement: "",

  registration_open: true,
  division_open: { "rising-stars": true, legacy: true, "3x3": true, kotc: true },
  division_fees: { "rising-stars": 30000, legacy: 35000, "3x3": 8000, kotc: 2000 },

  hero_badge_text: "🏀 Season 2026 · Registration Open",
  hero_headline: "Four Divisions. One Court. One Legacy.",
  hero_subheadline: "Rising Stars, Legacy, 3×3 & King of the Court",
  about_text:
    "NXGEN Premier League is Lipa City's premier basketball organization, running competitive leagues for all " +
    "ages across four divisions. Commissioner: Coach Jr. Year Founded: 2026. Official venue: F.A.E. Court, Lipa City, " +
    "Batangas.",
  payment_note: "Registration fees via GCash — details to be announced.",
  court_data_packages: [
    "1 Hour | Quick session | 20",
    "3 Hours | Half day | 50",
    "Day Pass | Open to close | 120",
    "Week Pass | 7 days, best value | 500 | best",
  ].join("\n"),

  sponsors: [],
  faqs: [],

  social_instagram: "https://instagram.com/NXGENPREMIERELEAGUE",
  social_facebook: "https://www.facebook.com/profile.php?id=61590655296483",
  social_youtube: "https://www.youtube.com/@NXGENPREMIERELEAGUE",
  social_tiktok: "https://www.tiktok.com/@NXGENPREMIERELEAGUE",
  contact_email: "hello@nxgenleague.com",
  contact_phone: "+63 917 501 8835",
  venue_name: "F.A.E. Court",
  venue_location: "Lipa City, Batangas",

  sections: {
    divisions: true, games: true, leaderboard: true, sponsors: true,
    contact: true, livestream: true, highlights: true,
  },
};

/** Digits only, for tel: and GCash. */
export const telHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, "")}`;

/** Peso amount as the site writes it. */
export const peso = (whole: number) => `₱${whole.toLocaleString("en-PH")}`;

const Ctx = createContext<SiteSettings>(SITE_DEFAULTS);

export function useSiteSettings(): SiteSettings {
  return useContext(Ctx);
}

const STR_KEYS = [
  "livestream_url", "site_announcement", "hero_badge_text", "hero_headline",
  "hero_subheadline", "about_text", "payment_note", "court_data_packages",
  "social_instagram", "social_facebook", "social_youtube", "social_tiktok",
  "contact_email", "contact_phone", "venue_name", "venue_location",
] as const;
const BOOL_KEYS = [
  "maintenance_mode", "gallery_visible", "archive_visible", "registration_open",
] as const;

const ARR_KEYS = ["sponsors", "faqs"] as const;

export function SiteSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SiteSettings>(SITE_DEFAULTS);

  useEffect(() => {
    let live = true;
    supabase
      .from("site_settings")
      .select("key,value")
      .then(({ data, error }) => {
        // A failed read leaves the site on its defaults, which is the same copy
        // it shipped with — the right thing to do rather than blanking the page.
        if (!live || error || !data) return;
        const m = new Map(data.map((r) => [r.key, r.value as unknown]));
        const next: SiteSettings = { ...SITE_DEFAULTS };

        for (const k of STR_KEYS) {
          const v = m.get(k);
          // An empty string means "not set", not "show nothing".
          if (typeof v === "string" && v.trim()) next[k] = v;
        }
        for (const k of BOOL_KEYS) {
          const v = m.get(k);
          if (typeof v === "boolean") next[k] = v;
        }
        // Written out rather than looped: these three hold different value
        // types, and a shared loop cannot narrow them without casting away the
        // very thing that keeps fees numeric and switches boolean.
        const merge = <T,>(key: string, current: Record<string, T>): Record<string, T> => {
          const v = m.get(key);
          return v && typeof v === "object" && !Array.isArray(v)
            ? { ...current, ...(v as Record<string, T>) }
            : current;
        };
        next.division_open = merge<boolean>("division_open", next.division_open);
        next.division_fees = merge<number>("division_fees", next.division_fees);
        next.sections = merge<boolean>("sections", next.sections);
        for (const k of ARR_KEYS) {
          const v = m.get(k);
          if (Array.isArray(v)) next[k] = v as never;
        }
        setSettings(next);
      });
    return () => { live = false; };
  }, []);

  return <Ctx.Provider value={settings}>{children}</Ctx.Provider>;
}
