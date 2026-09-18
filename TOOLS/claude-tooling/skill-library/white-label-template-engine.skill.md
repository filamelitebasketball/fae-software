---
name: white-label-template-engine
description: >
  Converts the NXGEN Premier League codebase into a white-label sports league template
  with clear placeholder markers for all brand parameters. Use this skill whenever
  Coach Jr wants to replicate the NXGEN site for a new league brand (e.g. LinkMe,
  a new basketball league, a volleyball league, etc.), or when selling the template
  to a client. Also use it when someone says "new brand", "white-label", "template",
  "clone the site", "rebrand", or "sell the code".
---

# White-Label Template Engine

This skill turns the NXGEN Premier League codebase into a reusable, sellable template.
Every brand-specific value is mapped to a placeholder so a new league can be spun up
by filling in one config file.

## How It Works

The NXGEN site is built on **TanStack Start + TypeScript + Supabase** via **Lovable**.
All brand-specific values live in predictable places across 6 key files. This skill
tells you exactly what to find-and-replace to rebrand the entire site.

---

## Brand Config File

When creating a new brand, start by filling out this config object. Every placeholder
below maps to a key here:

```typescript
// src/config/brand.ts — THE SINGLE SOURCE OF TRUTH

export const BRAND = {
  // ─── Identity ───
  name:            "NXGEN Premier League",        // {{LEAGUE_NAME}}
  shortName:       "NXGEN",                       // {{SHORT_NAME}}
  tagline:         "Four Divisions. One Court. One Legacy.",  // {{TAGLINE}}
  subtitle:        "Premier League",              // {{SUBTITLE}}
  commissioner:    "Coach Jr",                    // {{COMMISSIONER}}
  yearFounded:     2026,                          // {{YEAR_FOUNDED}}
  sport:           "Basketball",                  // {{SPORT}}

  // ─── Location ───
  venue:           "F.A.E. Court",                // {{VENUE_NAME}}
  city:            "Lipa City",                   // {{CITY}}
  region:          "Batangas",                    // {{REGION}}
  country:         "PH",                          // {{COUNTRY_CODE}}
  countryFull:     "Philippines",                 // {{COUNTRY_FULL}}
  mapsUrl:         "https://maps.app.goo.gl/WznXDuxSoboN2vkT9",  // {{MAPS_URL}}

  // ─── Contact ───
  email:           "hello@nxgenleague.com",       // {{CONTACT_EMAIL}}
  emailResponse:   "(Response within 24-48 hours)", // {{EMAIL_RESPONSE_NOTE}}
  phone:           "+63 917 501 8835",            // {{PHONE}}
  phoneTel:        "+639175018835",               // {{PHONE_TEL}}

  // ─── Payment ───
  paymentMethod:   "GCash",                       // {{PAYMENT_METHOD}}
  paymentNumber:   "09XX-XXX-XXXX",               // {{PAYMENT_NUMBER}}
  paymentAccount:  "NXGEN Premier League",        // {{PAYMENT_ACCOUNT_NAME}}
  paymentNote:     "Registration fees via GCash — details to be announced.", // {{PAYMENT_NOTE}}

  // ─── URLs ───
  domain:          "nxgenpremierleague.lovable.app", // {{DOMAIN}}
  canonicalBase:   "https://nxgenpremierleague.lovable.app", // {{CANONICAL_BASE}}

  // ─── Social ───
  socials: {
    instagram:     { handle: "@NXGENPREMIERELEAGUE", url: "https://instagram.com/NXGENPREMIERELEAGUE" },
    tiktok:        { handle: "@NXGENPREMIERELEAGUE", url: "https://www.tiktok.com/@NXGENPREMIERELEAGUE" },
    youtube:       { handle: "@NXGENPREMIERELEAGUE", url: "https://www.youtube.com/@NXGENPREMIERELEAGUE" },
    facebook:      { handle: "NXGEN Premier League", url: "https://www.facebook.com/profile.php?id=61590655296483" },
  },                                              // {{SOCIALS}}

  // ─── Divisions (the product) ───
  divisions: [
    {
      number: "01",
      slug: "rising-stars",
      title: "Rising Stars",
      format: "5v5 · 10-MIN QUARTERS",
      ageGroup: "AGES 9U–21U",
      fee: "₱30,000",
      feeUnit: "/ team",
      slots: "TBA",
    },
    {
      number: "02",
      slug: "legacy",
      title: "Legacy",
      format: "5v5 · 12-MIN QUARTERS",
      ageGroup: "AGES 21+",
      fee: "₱35,000",
      feeUnit: "/ team",
      slots: "TBA",
    },
    {
      number: "03",
      slug: "3x3",
      title: "3×3",
      format: "FIBA RULES · HALF COURT",
      ageGroup: "KIDS · TEENS · ADULTS",
      fee: "₱8,000",
      feeUnit: "/ team",
      slots: "TBA",
    },
    {
      number: "04",
      slug: "king-of-the-court",
      title: "King of the Court",
      format: "1v1 · SINGLE ELIMINATION",
      ageGroup: "KIDS · TEENS · ADULTS",
      fee: "₱2,000",
      feeUnit: "/ player",
      slots: "TBA",
    },
  ],                                              // {{DIVISIONS}}

  // ─── Sponsors ───
  sponsors: [
    { name: "Fil-Am Elite Management", asset: "sponsor-filam-elite.png" },
    { name: "Picklemania",             asset: "sponsor-picklemania.png" },
    { name: "Aguila Auto Glass",       asset: "sponsor-aguila.png" },
    { name: "VA",                      asset: "sponsor-va.png" },
    { name: "Fil-Am Elite Volleyball", asset: "sponsor-filam-volleyball.png" },
    { name: "LinkmePh",               asset: "linkme-logo.png" },
  ],                                              // {{SPONSORS}}

  // ─── Sponsor Placements ───
  sponsorPlacements: [
    { title: "Courtside Signage", body: "Branded boards on the sidelines — in every livestream frame all season." },
    { title: "Jersey Placement",  body: "Your logo on team jerseys — worn on court, in team photos and highlights." },
    { title: "Digital Shout-Outs", body: "Named mentions on livestream, tagged posts on social, plus homepage sponsor wall." },
  ],                                              // {{SPONSOR_PLACEMENTS}}

  // ─── Theme Colors (CSS custom properties) ───
  colors: {
    gold:     "#C9A227",    // primary accent
    goldL:    "#E8CC6B",    // light gold
    void:     "#0A0A0A",    // darkest background
    s0:       "#111111",    // section bg 0
    s1:       "#161616",    // section bg 1
    paint:    "#EDEDED",    // primary text
    silverD:  "#8A8A8A",    // muted text
    line:     "#222222",    // borders
    lineG:    "rgba(201,162,39,.15)", // gold-tinted borders
  },                                              // {{COLORS}}

  // ─── Assets ───
  logo:            "nxgen-main.png",              // {{LOGO}}
};
```

---

## File-by-File Replacement Map

### 1. `src/routes/index.tsx` (Homepage)

| What to replace | Placeholder | Location in code |
|---|---|---|
| `"NXGEN Premier League"` (all instances) | `{{LEAGUE_NAME}}` | head meta, JSON-LD, OpeningNightBanner, hero, about section, sponsors |
| `"NXGEN"` (hero title) | `{{SHORT_NAME}}` | hero-title |
| `"Premier League"` (hero sub) | `{{SUBTITLE}}` | hero-sub |
| `"Four Divisions. One Court. One Legacy."` | `{{TAGLINE}}` | hero-copy |
| `"Rising Stars, Legacy, 3×3 & King of the Court"` | Generated from `{{DIVISIONS}}` | hero description |
| `"F.A.E. Court, Lipa City"` | `{{VENUE_NAME}}, {{CITY}}` | hero, Contact section |
| `DIVISION_CARDS` array | Generated from `{{DIVISIONS}}` | Divisions section |
| `sponsors` array | Generated from `{{SPONSORS}}` | Sponsors section |
| `"hello@nxgenleague.com"` | `{{CONTACT_EMAIL}}` | Contact section |
| `"+63 917 501 8835"` / `"+639175018835"` | `{{PHONE}}` / `{{PHONE_TEL}}` | Contact section |
| `"09XX-XXX-XXXX"` | `{{PAYMENT_NUMBER}}` | Payment card |
| `"GCash"` | `{{PAYMENT_METHOD}}` | Payment card |
| All social URLs/handles | `{{SOCIALS}}` | Contact > Follow |
| Facebook page URL | `{{SOCIALS.facebook.url}}` | Livestream, social links |
| `"Coach Jr"` | `{{COMMISSIONER}}` | About section |
| `"2026"` | `{{YEAR_FOUNDED}}` | About section, season badge |
| `"Season 2026"` | `"Season {{YEAR_FOUNDED}}"` | Leaderboard badge |
| `"Basketball"` | `{{SPORT}}` | JSON-LD |
| `nxgenpremierleague.lovable.app` | `{{DOMAIN}}` | head meta, canonical, og:url |
| `nxgen-main.png.asset.json` | `{{LOGO}}` | logo import |

### 2. `src/routes/auth.tsx` (Authentication)

| What to replace | Placeholder |
|---|---|
| `"NXGEN Premier League"` in page title | `{{LEAGUE_NAME}}` |
| Logo import | `{{LOGO}}` |
| Country codes array (`COUNTRY_CODES`) | Keep as-is (reusable) |
| OAuth redirect URL | Derived from `{{CANONICAL_BASE}}` |

### 3. `src/routes/register.tsx` (Registration)

| What to replace | Placeholder |
|---|---|
| Division names and fees in form options | Generated from `{{DIVISIONS}}` |
| `"09XX-XXX-XXXX"` GCash in success state | `{{PAYMENT_NUMBER}}` |
| `"NXGEN Premier League"` in page title | `{{LEAGUE_NAME}}` |
| Age validation range (8-70) | `{{AGE_MIN}}` / `{{AGE_MAX}}` (optional, usually keep default) |

### 4. `src/components/nx-shell.tsx` (Navigation & Footer)

| What to replace | Placeholder |
|---|---|
| Logo import and display | `{{LOGO}}` |
| `"NXGEN Premier League"` in nav/footer | `{{LEAGUE_NAME}}` |
| Legal link text | Keep as-is (reusable) |

### 5. `src/routes/sponsors.tsx` (Sponsor Kit Page)

| What to replace | Placeholder |
|---|---|
| `SPONSORS` array | `{{SPONSORS}}` |
| `SOCIALS` array | `{{SOCIALS}}` |
| `PLACEMENTS` array | `{{SPONSOR_PLACEMENTS}}` |
| `"NXGEN Premier League"` in all meta tags | `{{LEAGUE_NAME}}` |
| `"F.A.E. Court"` references | `{{VENUE_NAME}}` |
| Division names in placement descriptions | Generated from `{{DIVISIONS}}` |
| `"hello@nxgenleague.com"` | `{{CONTACT_EMAIL}}` |
| `"+63 917 501 8835"` | `{{PHONE}}` |
| Canonical URL | `{{CANONICAL_BASE}}/sponsors` |
| `"nxgenpremierleague.lovable.app"` | `{{DOMAIN}}` |

### 6. `src/integrations/supabase/types.ts` (Database Schema)

This file is auto-generated by Supabase. The schema is sport-agnostic and fully reusable.
Key tables that carry over to any league: `profiles`, `teams`, `games`, `registrations`,
`sponsor_inquiries`, `payment_proofs`, `leaderboard_totals`.

No placeholders needed — the schema is universal.

---

## How to Use This Template

### For Coach Jr (selling to a client):

1. **Copy the Lovable project** — use Lovable's "Remix" feature or clone the repo
2. **Create `src/config/brand.ts`** — fill in all values from the config above
3. **Find-and-replace** every hardcoded brand value in the 5 key files using the map above
4. **Upload new logo** — replace `nxgen-main.png` in `/src/assets/`
5. **Update Supabase** — create a new Supabase project, connect it, run the same schema
6. **Update sponsor assets** — replace sponsor logo PNGs in `/src/assets/`
7. **Deploy** — publish via Lovable

### For Claude (automated):

When asked to "create a new brand from the template" or "white-label this for [Client Name]":

1. Read the client's brand details (name, venue, divisions, fees, contact, socials, colors)
2. Generate a filled `brand.ts` config file
3. Produce Lovable prompts that do the find-and-replace across all 6 files
4. Deploy via the `website-revise-check` skill's Phase 5 auto-deploy

---

## Example: Rebranding for "LinkMe League"

```typescript
export const BRAND = {
  name: "LinkMe Basketball League",
  shortName: "LINKME",
  tagline: "Connect. Compete. Conquer.",
  subtitle: "Basketball League",
  commissioner: "Coach Jr",
  yearFounded: 2026,
  sport: "Basketball",
  venue: "LinkMe Arena",
  city: "Manila",
  region: "Metro Manila",
  country: "PH",
  // ... fill in rest
};
```

This would generate prompts like:
> In `src/routes/index.tsx`, replace all instances of "NXGEN Premier League" with "LinkMe Basketball League".
> Replace "NXGEN" in the hero title with "LINKME". Replace "F.A.E. Court" with "LinkMe Arena"...

---

## CSS Theme Variables

The site's visual identity lives in CSS custom properties. To rebrand colors,
update these in the global stylesheet:

```css
:root {
  --gold:     #C9A227;    /* Primary accent — change to client's brand color */
  --gold-l:   #E8CC6B;    /* Light accent */
  --void:     #0A0A0A;    /* Darkest bg */
  --s0:       #111;       /* Section bg */
  --s1:       #161616;    /* Alt section bg */
  --paint:    #EDEDED;    /* Primary text */
  --silver-d: #8A8A8A;    /* Muted text */
  --line:     #222;       /* Borders */
}
```

---

## Supabase Schema (Reusable As-Is)

The database schema is sport-agnostic. Key tables:

| Table | Purpose | Brand-specific? |
|---|---|---|
| `profiles` | Player profiles with membership_tier | No |
| `teams` | Team roster and metadata | No |
| `games` | Schedule, scores, status | No |
| `registrations` | Team/individual sign-ups | No |
| `payment_proofs` | GCash/payment screenshot uploads | No |
| `sponsor_inquiries` | Sponsor contact form submissions | No |
| `leaderboard_totals` | Aggregated player stats (view) | No |
| `admin_activity_log` | Admin audit trail | No |

All tables use RLS (Row Level Security) and are ready to go for any new project.
