---
name: skill-engine
description: >
  Extracts and saves reusable code patterns from the NXGEN codebase as distinct,
  composable skills. Use this whenever Coach Jr says "save this pattern", "make this
  reusable", "skill engine", "code pattern", "save the logic", or wants to refine
  how a specific feature works across projects. Also triggers when building any new
  Lovable project that could reuse existing patterns.
---

# Skill Engine — Reusable Code Patterns

This skill catalogs every reusable pattern extracted from the NXGEN Premier League
codebase. Each pattern is a self-contained recipe that can be dropped into any new
Lovable project.

---

## Pattern Library

### 1. Auth Flow (Complete)

**What it does:** Full authentication with email/password, OTP verification, Google/Apple
OAuth, password reset, and open-redirect protection.

**Source:** `src/routes/auth.tsx`

**Key pieces:**
- Sign-in form with password + email OTP toggle
- Sign-up with full name, email, international phone selector (30+ country codes), password
- OTP 6-digit verification component with auto-focus between digits
- OAuth buttons (Google, Apple) with redirect callback
- Password reset via `supabase.auth.resetPasswordForEmail`
- Open redirect guard: `startsWith("/")` check on `postAuthDestination`
- Session listener in `useEffect` that auto-redirects on auth state change

**Reuse recipe:**
```
In src/routes/auth.tsx:
1. Copy the full file as-is
2. Replace {{LEAGUE_NAME}} in the page title meta
3. Replace logo import with your brand logo
4. The COUNTRY_CODES array is universal — keep it
5. Update OAuth redirect URL to your domain
```

**Security checklist:**
- Open redirect guard (`startsWith("/")`) — never remove
- Rate limiting on OTP — handled by Supabase
- Password minimum length — enforced in form validation

---

### 2. Registration Flow (Multi-Tab Form)

**What it does:** Team and individual registration with division selection, fee display,
payment proof upload, draft persistence, and OAuth round-trip recovery.

**Source:** `src/routes/register.tsx`

**Key pieces:**
- Tab toggle: Team Registration / Individual Registration
- Division select dropdown with fee display
- Player info: full name, age (8-70), jersey number (0-99), position
- Team info: team name, captain, roster
- Draft persistence via `localStorage` (non-sensitive fields only via `DRAFT_KEY`)
- OAuth round-trip: saves draft before redirect, restores after
- Session-gated DB insert (must be authenticated to write)
- Success state with payment instructions card

**Reuse recipe:**
```
1. Copy src/routes/register.tsx
2. Update division options from {{DIVISIONS}} config
3. Update fee display values
4. Update payment method and number in success state
5. Age/jersey validation ranges are universal — keep them
```

---

### 3. Live Data Hooks

**What it does:** Real-time game scores, leaderboard stats, and team counts from Supabase
with automatic polling.

**Source:** `src/routes/index.tsx` — `useLiveLeague()` hook

**Key pieces:**
- `useLiveLeague()` — fetches games, leaderboard_totals, and team counts
- 20-second polling interval for live scores
- Division-based stat grouping (PPG, RPG, APG, SPG, BPG)
- Graceful loading states (null = loading, empty array = no data)
- Cleanup on unmount (cancelled flag + clearInterval)

**Reuse recipe:**
```
1. Copy the useLiveLeague() function
2. Update DIVISION_NAMES array from {{DIVISIONS}} config
3. The stat keys (PTS, REBS, ASTS, STLS, BLKS) are basketball-universal
4. For other sports, modify StatKey type and STAT_KEYS array
5. Polling interval (20000ms) can be adjusted per sport
```

---

### 4. Scroll-Reveal Animation System

**What it does:** Elements animate in as they scroll into view using IntersectionObserver.

**Source:** `src/routes/index.tsx` — `useReveal()` hook

**Key pieces:**
- `useReveal()` hook with IntersectionObserver (threshold 0.12)
- CSS classes: `.r3` (reveal target), `.v` (visible), `.cv` (card visible)
- Delay variants: `.d1`, `.d2`, `.d3`, `.d4` for staggered entry
- Fallback for browsers without IntersectionObserver

**Reuse recipe:**
```
1. Copy useReveal() hook
2. Add CSS transitions for .r3 → .v and .div-card → .cv
3. Add .r3 class to any element you want to animate on scroll
4. Use .d1-.d4 for staggered timing
```

---

### 5. Navigation Shell (Auth-Gated)

**What it does:** Responsive nav with auth-gated links, mobile drawer, and footer.

**Source:** `src/components/nx-shell.tsx`

**Key pieces:**
- `NxNav` — desktop/mobile nav with logo, links, auth buttons
- `MobileMenu` — slide-out drawer with full menu
- Auth gating: `{userId && <Link to="/profile">My Profile</Link>}`
- Admin gating: `{isStaff && <Link to="/admin">Admin</Link>}`
- `NxFooter` — clean footer with legal links
- `NxPage` — reusable page shell (eyebrow, title, intro, children)

**Reuse recipe:**
```
1. Copy nx-shell.tsx
2. Replace logo import
3. Replace {{LEAGUE_NAME}} in aria labels and footer
4. Adjust nav links to match your site structure
5. Auth hooks (useAuthRole) are universal — keep them
```

---

### 6. Sponsor Kit Page

**What it does:** Full sponsor acquisition page with audience reach stats, current
sponsor logos, placement tiers, and inquiry form that writes to Supabase.

**Source:** `src/routes/sponsors.tsx`

**Key pieces:**
- `SPONSORS` array with name + logo URL
- `SOCIALS` array with icon, label, handle, href
- `PLACEMENTS` array with title + description
- `REACH` stats with icons
- Inquiry form → `supabase.from("sponsor_inquiries").insert()`
- Toast notifications on success/error

**Reuse recipe:**
```
1. Copy sponsors.tsx
2. Replace SPONSORS array from {{SPONSORS}} config
3. Replace SOCIALS array from {{SOCIALS}} config
4. Update PLACEMENTS to match your sponsorship tiers
5. Update REACH stats for your league's scale
6. Ensure sponsor_inquiries table exists in Supabase
```

---

### 7. Membership Tier System

**What it does:** Three-tier membership progression with gated features.

**Source:** `profiles` table + `useMembershipTier()` hook

**Tiers:**
- `default` — just signed up
- `otp_verified` — verified phone/email via OTP
- `rfid_linked` — physical RFID bracelet linked to account

**Key pieces:**
- `useMembershipTier()` returns `{ tier, isOtpVerified }`
- `computeCompletion()` calculates profile percentage
- `COMPLETION_UNLOCK` threshold for badge unlock
- Gold basketball verified badge (SVG) — renders when `rfid_linked` AND fields complete

**Reuse recipe:**
```
1. Keep the membership_tier column on profiles table
2. Rename tiers if needed (e.g., "basic" → "verified" → "premium")
3. Copy useMembershipTier() hook
4. Replace badge SVG with your brand's verification icon
5. Adjust COMPLETION_UNLOCK threshold (default: 80%)
```

---

### 8. Facebook Livestream Embed

**What it does:** Embedded Facebook page/timeline with graceful fallback.

**Source:** `src/routes/index.tsx` — `Livestream()` component

**Key pieces:**
- Facebook Page Plugin iframe embed
- 6-second timeout → fallback to direct link
- `onLoad` / `onError` handlers
- Fallback card with "Watch Live" button

**Reuse recipe:**
```
1. Copy Livestream() component
2. Replace FB_URL with your Facebook page URL
3. Adjust timeout (6000ms) if needed
4. The fallback pattern works for any embed (YouTube, Twitch, etc.)
```

---

### 9. Payment Integration Pattern

**What it does:** Displays payment info (GCash) and handles payment proof uploads.

**Source:** `src/routes/index.tsx` (Contact section) + `src/routes/register.tsx` (success state)

**Key pieces:**
- Payment card with method name, number, account name
- Payment proof upload via `payment_proofs` table
- Status tracking: `pending` → `verified` → `rejected`
- `payment_proof_method` enum: `gcash`, `bank_transfer`, `cash`

**Reuse recipe:**
```
1. Replace payment method/number/account from {{PAYMENT_*}} config
2. The payment_proofs table schema is universal
3. Add more payment methods by extending the enum
```

---

## Adding New Patterns

When you discover a new reusable pattern during development:

1. Identify the self-contained piece of code
2. List what's brand-specific vs. universal
3. Write the "Reuse recipe" — step-by-step to drop it into a new project
4. Add it to this skill under a new numbered section
5. Note which Supabase tables/views it depends on
