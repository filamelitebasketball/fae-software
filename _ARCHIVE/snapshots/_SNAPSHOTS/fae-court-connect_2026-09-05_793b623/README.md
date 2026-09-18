# F.A.E. MANAGEMENT SERVICES

Build "FAE WEBSITE" — F.A.E. Corp membership and court management hub, Lipa City Batangas Philippines. NOT NXGEN Premier League. Separate brand entirely.

BRAND TOKENS:
- Background: #050507 (void black)
- Accent: #C9A227 (gold), light #E8C468, dark #9A7A1A
- Text: #F0F2F5 (paint white)
- Secondary: rgba(184,188,200,0.46)
- Surface levels: #0d0d10 / #111115 / #141418 / #1a1a20 / #222228
- Border default: rgba(255,255,255,0.06)
- Border gold: rgba(201,162,39,0.16)
- Sport accents: basketball #E8843C / volleyball #5B8FE8 / pickleball #2ECC71
- Fonts: Archivo 900 (display headings) + DM Sans 400/600 (body) + JetBrains Mono 400 (data/mono) — all from Google Fonts
- No Inter, no purple gradients, no excessive border-radius

STACK: TanStack Start + TypeScript + Tailwind CSS + Supabase

ROUTES:
1. / — Landing page
2. /book — Court booking flow
3. /teams — Filam Elite rosters
4. /location — Map + hours + rules
5. /auth — Register + Sign in
6. /account — Member dashboard (auth required)
7. /admin — Admin operations panel (admin role only)

--- LANDING PAGE / ---

Section 1 HERO: Full viewport, void black bg. Fixed top nav (transparent → dark blur on scroll). Gold 2px progress bar animates across top as user scrolls. Center content: badge "OPEN 4 AM – 12 AM · 24 HOURS SUNDAYS" with pulsing gold dot. Display heading "F.A.E. COURT" Archivo 900 huge (clamp 3rem to 9rem). Subheading "Three sports · one floor" gold uppercase tracked. Body copy: "The home floor of Filam Elite in Lipa City. Book basketball, volleyball or pickleball by the hour, join a team, and run your league season out of one account." Two CTAs: gold button "Book a court" → /book, ghost button "Join a team" → /teams. Stats row below divider: 3 Sports / 6 Playing surfaces / 20 hrs open daily / 5.0★ on Google. Scroll cue arrow at bottom fades on scroll. Scroll down cue disappears after 120px scroll.

Section 2 TICKER: Horizontal auto-scroll marquee, dark bg, JetBrains Mono 11px uppercase, pauses on hover. Items: "Basketball ₱900/hr full court · Volleyball ₱750/hr · Pickleball ₱400/hr · paddles included · Open 4AM to midnight · Sundays open 24 hours · Home of NXGEN Premier League · Lipa City Batangas · Free parking for booked players"

Section 3 SPORT CARDS: 3-column grid (1-col mobile). Each card: dark bg, 1px border (gold on hover), sport-specific accent color, small index label "01 / 2 SURFACES", sport SVG icon, uppercase heading, body copy, rate "₱400 /hr and up", arrow CTA button → /book with sport preselected.
- Basketball (accent #E8843C): "Full hardwood with league-standard rings, shot clock and scorer's table."
- Volleyball (accent #5B8FE8): "Regulation indoor court, net height adjustable for men's, women's and juniors."
- Pickleball (accent #2ECC71): "Two dedicated courts with permanent nets. Paddles and balls included."
Cards scroll-reveal staggered (d1/d2/d3).

Section 4 NETWORK PANEL: Single bordered panel, header row "Four programs · one login" + gold badge "F.A.E. network". Below: 4 equal columns in ONE ROW (2x2 on mobile). Each cell: small icon (34×34 rounded), bold name, mono tag label underneath. Tap → link.
- NXGEN League (trophy icon, gold #C9A227) → https://nxgenpremierleague.lovable.app
- Elite Basketball (basketball icon, #E8843C) → /teams
- Elite Volleyball (net icon, #5B8FE8) → /teams
- Elite Pickleball (paddle icon, #2ECC71) → /teams
Panel wipe-reveals left-to-right on scroll.

Section 5 PROGRAMS SHOWREEL: Eyebrow "The programs", heading "Train with Filam Elite". Two cards side-by-side (stack mobile). Each card: 16:10 dark hatched media area with "Training footage coming soon" placeholder + play button overlay (sport accent color). Below media: sport name (Archivo 800), mono schedule tag, description, two buttons: gold "Join a tryout" → /teams, ghost "Book this surface" → /book.
- Basketball card (accent #E8843C): tag "Men's and juniors · trains 4 nights a week", copy "Skills blocks, live five-on-five and conditioning on the home floor. The senior squad feeds straight into the NXGEN Premier League."
- Volleyball card (accent #5B8FE8): tag "Women's indoor · open gym Tuesdays", copy "Serve-receive, setting and blocking work, then match play. Built out of Lipa and Batangas club players."

Section 6 LOCATION: Two-column grid (stack mobile). Left: animated pin-map card — dark grid lines bg, radial gold glow center, 3 pulsing rings animate outward, gold circle pin icon center, caption "F.A.E. Court · 13.9352°N 121.1155°E · Lipa City, Batangas". Right: info card — heading "Visit the court", rows with gold SVG icons: address (F.A.E. Court, Lipa City, Batangas), hours (Mon–Sat 4:00 AM – 12:00 AM · Sunday open 24 hours), phone (+63 917 501 8835), rating (Rated 5.0 on Google · Sports club). Gold CTA "Get directions" → https://www.google.com/maps/search/?api=1&query=13.9352049,121.1154848. Ghost CTA "Book a court instead" → /book. Left card slides in from left, right from right on scroll.

Section 7 FOOTER: Dark bg, top border gold. Left: F.A.E. COURT wordmark + "Basketball, volleyball and pickleball in Lipa City, Batangas." 3 link columns: Court (Book a court/Teams/Location/My account), Programs (NXGEN Premier League external/Filam Elite Basketball/Filam Elite Volleyball/Lipa Elite Pickleball), Contact (+63 917 501 8835 / hello@faecourt.ph / Open in Google Maps). Bottom legal bar: © 2026 F.A.E. Corp · Lipa City, Batangas, Philippines · Prototype.

--- BOOKING PAGE /book ---

Page heading "Book a court", sub "F.A.E. Court · Lipa City · slots run on the hour".

Step 1 — Sport: Chip buttons. Basketball (orange), Volleyball (blue), Pickleball (green). Selected chip uses sport accent bg.

Step 2 — Surface: Chips show court name + rate. Changes based on sport selection:
- Basketball: "Full court · ₱900/hr", "Half court A · ₱500/hr", "Half court B · ₱500/hr"
- Volleyball: "Indoor court 1 · ₱750/hr", "Indoor court 2 · ₱750/hr"
- Pickleball: "Pickleball court 1 · ₱400/hr", "Pickleball court 2 · ₱400/hr"

Step 3 — Date: Horizontal scrollable 7-day strip. Each day: number (Archivo 800), weekday (mono). Today highlighted.

Step 4 — Time: Grid of hourly slots 6AM–11PM. Taken slots greyed/disabled. Selected slots use sport accent. Legend: Free / Selected / Taken / "Peak after 6PM +20%". When user changes sport/surface/date trigger availability refresh.

Sticky Summary card at bottom: shows sport, surface, date, selected hours list, peak surcharge if any, TOTAL. Disabled "Pick a time" CTA when nothing selected, active "Reserve N hour(s)" when slots chosen. On confirm: if not authenticated → redirect /auth with returnTo=/book, else show confirmation modal: "Court reserved · [surface] on [date] · [times] · Ref FAE-XXXXX · Show at counter." Fine print: "Pay at counter. Free cancellation up to 6 hours before your slot."

--- TEAMS PAGE /teams ---

Heading "Filam Elite teams", sub "Basketball · Volleyball · Pickleball", lede "Tryouts run monthly on the home floor. Roster spots open when a season closes."

Three team cards (auto-fit grid). Each card:
- 4px accent top band
- Sport icon crest (rounded square)
- Team name (Archivo 900 uppercase)
- League tag (JetBrains Mono, sport accent color)
- Team description
- Stats strip (3 stats with bold number + mono label)
- Roster section: rows of number / name / position
- Gold "Sign up for tryouts" CTA (auth-gated)
- Ghost "Book this surface" CTA → /book preselected

BASKETBALL card (accent #E8843C):
Name: Filam Elite Basketball
League: NXGEN Premier League · Legacy Division
Copy: "The senior men's program. Trains four nights a week on the home floor and carries the F.A.E. name into every NXGEN season."
Stats: 14 Roster / 22–4 Last season / 4x Titles
Roster: #4 Marco Villanueva Guard, #7 JR Delos Santos Wing, #11 Kenji Alvarez Forward, #23 Paulo Mendoza Center, #32 Rafa Lim Guard

VOLLEYBALL card (accent #5B8FE8):
Name: Filam Elite Volleyball
League: Batangas Indoor Circuit · Women's
Copy: "Women's indoor squad built out of Lipa and Batangas club players. Open gym Tuesdays, competitive tryouts every off-season."
Stats: 12 Roster / 18–6 Last season / 2x Titles
Roster: #1 Aliyah Santos Setter, #5 Nina Bautista Outside, #9 Trish Ocampo Middle, #14 Kim Herrera Libero, #17 Bea Ramos Opposite

PICKLEBALL card (accent #2ECC71):
Name: Lipa Elite Pickleball
League: Lipa Open Ladder · Mixed
Copy: "Ladder play Wednesday and Sunday nights, plus a beginner clinic every first Saturday — paddles provided."
Stats: 20 Members / 3.5–4.5 DUPR band / Wed/Sun Ladder
Roster: Coach Danilo Cruz Captain, Grace Ilagan Mixed doubles, Migs Torres Men's doubles, Ella Panganiban Women's doubles, Rey Malabanan Singles

--- AUTH PAGE /auth ---

Card centered, dark bg, gold border, box shadow.
Heading toggles: "Create your account" / "Welcome back"
Sub: register "One account books every court and carries into NXGEN, Filam Elite and the pickleball club." / signin "Sign in to book a court and see your reservations."
Google OAuth button (official colors), Facebook OAuth button (official blue).
Divider "or use email".
Register fields: First name + Last name (row), Mobile, Main sport (select: Basketball/Volleyball/Pickleball), Email, Password.
Sign in fields: Email, Password.
Gold "Create account" / "Sign in" CTA.
Toggle link at bottom.
Fine print: "By creating an account you accept the court rules and waiver."

--- ACCOUNT PAGE /account (auth required) ---

Member profile card:
- Pulsing green dot + "F.A.E. COURT · MEMBER" mono label
- Avatar (initials, gold gradient bg)
- Name (Archivo 900), tier + joined date
- Stats strip: Upcoming bookings / Total booked ₱ / Band ID
Gold "Book another court" CTA.

Accordions below (reusable Accordion component, same pattern — dark bg, gold border when open, icon + title + subtitle + badge + chevron, animated max-height body):
1. My Bookings — list of booking cards with sport icon, court name, date, hours, ref, amount, status badge, Cancel button. Empty state: "No bookings yet · Pick a sport, a surface and an hour — it takes about twenty seconds."
2. Profile — key-value rows: Name / Email / Mobile / Main sport / Signed in via / Member ID
3. Counter Tab — empty state: "Tab is clear · Anything you buy from the F.A.E. counter shows up here before you leave."
4. My Programs — rows: F.A.E. Court member since X / NXGEN Premier League link / Teams link
Sign out ghost button at bottom.

--- ADMIN PAGE /admin (role = admin only, redirect to / if not) ---

Heading "Admin panel", sub "F.A.E. Corp · Counter 01 · [live clock HH:MM]".
Top right buttons: ghost "Restock", gold "Log a sale".

KPI strip (4 cards, 2-col mobile / 4-col desktop):
- Logged today ₱ (gold value)
- Open tabs (count + running ₱ sub)
- Below par (count, red if >0 else green)
- Items tracked (count)

Low-stock alert bar (red left border, only shows when items below par): heading "N items below par" with alert icon. Rows: item name / SKU / "X left · par Y" / Restock button.

Toolbar: search input + "New item" button + "New client" button.

Accordions (same Accordion component):
1. Open Tabs — client tab cards. Each: avatar initials, name, tier/band, running total. Line items: name ×qty / ₱amount / Void button. Actions: "Settle ₱X" gold, "Add item" ghost, "Profile" ghost. Empty state: "No open tabs."
2. Drinks inventory — table columns: Item / SKU / Price / On hand / Level meter / Actions (Sell + Restock). Stock meter bar red if below par, green if healthy.
3. Food inventory — same table.
4. Services & court time — same table (stock shows "unlimited" badge for services with null stock).
5. Client directory — table: Client / Tier badge / Band / Visits / On tab ₱ / Open button.
6. Revenue today — "Today by category": Drinks / Food / Services / Settled total. "Moving fastest" horizontal bar chart (top 5 items).
7. Activity log — timestamped rows: time / bold action / details.

Log a sale modal: dropdown Client, dropdown Item (grouped by category showing stock), qty number input, "Charge to tab" CTA.
Restock modal: dropdown item, qty received, "Add to stock" CTA.
Settle tab: confirms total, clears tab, writes to log.
New item modal: name, category, price, opening stock, par level.
New client modal: full name, mobile, tier, RFID band.

INVENTORY SEED DATA:
Drinks: Bottled water 500ml DRK-001 ₱25 stock118 par60 / Gatorade blue 500ml DRK-002 ₱60 stock44 par40 / Cobra energy DRK-003 ₱35 stock28 par24 / Coke Zero 330ml DRK-004 ₱45 stock33 par24 / Iced coffee DRK-005 ₱85 stock16 par12 / Fresh buko DRK-006 ₱70 stock11 par10 / Protein shake DRK-007 ₱150 stock7 par12 / Isotonic 1L DRK-008 ₱110 stock5 par10
Food: Chicken sandwich FOD-001 ₱140 stock14 par10 / Beef tapa rice FOD-002 ₱180 stock9 par8 / Banana FOD-003 ₱15 stock56 par40 / Protein bar FOD-004 ₱120 stock21 par15 / Pancit canton FOD-005 ₱45 stock27 par20 / PB toast FOD-006 ₱65 stock6 par10 / Boiled egg FOD-007 ₱20 stock22 par20
Services: Court rental 1hr SVC-001 ₱900 unlimited / Half court 1hr SVC-002 ₱500 unlimited / Skills session SVC-003 ₱1200 unlimited / Guest pass SVC-004 ₱100 unlimited / Locker day SVC-005 ₱50 unlimited / RFID band SVC-006 ₱250 stock34 par20 / Towel rental SVC-007 ₱40 stock18 par15

CLIENT SEED: Marco Villanueva Elite FAE-0417 / Aliyah Santos Elite FAE-0288 / Coach Danilo Cruz Partner FAE-0011 / Team Aguila Corporate FAE-TEAM-03 / Jhaz Reyes Regular —

--- SUPABASE SCHEMA ---

```sql
create table members (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text unique not null,
  phone text,
  tier text default 'Regular' check (tier in ('Regular','Elite','Partner','Corporate')),
  band_id text default '—',
  sport text default 'basketball',
  provider text default 'Email',
  role text default 'member' check (role in ('member','admin','staff')),
  joined_at timestamptz default now()
);
create table bookings (
  id uuid primary key default gen_random_uuid(),
  member_id uuid references members(id),
  sport text not null,
  court_id text not null,
  date date not null,
  start_hour int not null,
  hours int not null default 1,
  amount numeric(10,2) not null,
  status text default 'Unpaid' check (status in ('Unpaid','Partial','Paid - Cash','Paid - GCash','Paid - Other','Cancelled')),
  channel text default 'Website',
  ref text unique,
  created_at timestamptz default now()
);
create table inventory (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null check (category in ('drinks','food','service')),
  sku text unique not null,
  price numeric(10,2) not null,
  stock int,
  par_level int,
  updated_at timestamptz default now()
);
create table tabs (
  id uuid primary key default gen_random_uuid(),
  member_id uuid references members(id),
  items jsonb default '[]',
  total numeric(10,2) default 0,
  settled boolean default false,
  created_at timestamptz default now()
);
alter table members enable row level security;
alter table bookings enable row level security;
alter table inventory enable row level security;
alter table tabs enable row level security;
```

--- SHARED COMPONENTS ---

NAV component: fixed, transparent → void black + backdrop-blur on scroll. Left: gold circle logo (court lines SVG) + "F.A.E. COURT" Archivo 800 + "LIPA CITY · BATANGAS" JetBrains Mono 8px subtitle. Center links (hidden mobile): Home / Book a Court / Teams / Location / My Account. Each link: JetBrains Mono 11px uppercase, underline animates from left on hover/active. Right: unauthenticated → "Sign in" ghost sm + "Register" gold sm. Authenticated → username ghost sm + "Book" gold sm. Mobile: hamburger opens sheet menu.

ACCORDION component: `<Accordion key trigger={<AccordionTrigger icon title subtitle badge />}>body</Accordion>`. Outer div: dark bg, 1px border (→ gold when open). Trigger: flex row, icon square (gold bg/border), label column (title + subtitle), right (badge + chevron rotates 180° when open). Body: max-height 0→scrollHeight animated 340ms cubic-bezier(0.4,0,0.2,1). Used in /account and /admin.

SCROLL REVEAL: useScrollReveal hook or IntersectionObserver. Classes: `.reveal` (opacity 0, translateY 46px) → `.reveal.visible` (opacity 1, translateY 0). Transition: 0.9s cubic-bezier(0.16,1,0.3,1). Stagger via delay prop (0ms/80ms/160ms/240ms). `prefers-reduced-motion` skips animation. Additional: `.reveal-left` (translateX -46px), `.reveal-right` (translateX 46px), `.reveal-wipe` (clip-path inset 0 100% → 0 0).

BUTTON variants: gold (gradient bg, shimmer on hover, lift on hover), ghost (dark bg, border, gold border on hover), danger (red tint), sizes: default/sm/xs. All: rounded-lg, font-semibold, flex items-center gap-2.

BADGE variants: gold / red / blue / green / grey. JetBrains Mono 10px.

TOAST: fixed bottom center, slides up/down, 3.4s auto-dismiss, gold border, green check icon.

MODAL overlay: backdrop-blur dark. Modal card: dark bg, gold border, rounded-2xl, max-h-90vh scroll. Heading Archivo 800.

--- CONSTANTS FILE src/lib/constants.ts ---

Export:
- SPORTS object with key, label, icon name, accent color, courts array (id/name/rate), description
- PEAK = { start: 18, uplift: 0.20 }
- HOURS = [6..23]
- FAE_CONTACT = { phone: '+63 917 501 8835', email: 'hello@faecourt.ph', address: 'F.A.E. Court, Lipa City, Batangas', lat: 13.9352049, lng: 121.1154848, mapsUrl: '...', hours: { weekday: '4:00 AM – 12:00 AM', sunday: 'Open 24 hours' } }
- NETWORK = [{ tag, name, icon, accent, url }] × 4
- TIERS = ['Regular','Elite','Partner','Corporate']
- TIER_DISCOUNTS = { Regular: 0, Elite: 0.10, Partner: 0.10, Corporate: 0.15 }

All components reference constants — no scattered hardcoded values.

--- WHAT NOT TO BUILD ---
- No NXGEN Premier League UI, routes, or branding
- No lorem ipsum anywhere — real F.A.E. Corp copy only
- No Inter font
- No purple gradients
- No placeholder "coming soon" pages — build every route fully

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://fae-court-connect.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/38968c5d-24a7-4370-876b-de82a8383a51).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
