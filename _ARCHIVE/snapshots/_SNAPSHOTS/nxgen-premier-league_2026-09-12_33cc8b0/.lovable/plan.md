## Goals

Three fixes based on live testing on mobile:

1. Make sign-in/registration less confusing, with a clear post-auth redirect.
2. On mobile, replace the top nav tabs with a slide-out side menu.
3. Make sure users can share a public profile (with social links) with anyone.

---

## 1. Simpler auth + smart redirect

Current `/auth` page shows three tabs (Sign In / Register / OTP Code) plus Google + Apple buttons — too many choices at once, and after login everyone lands on `/profile` even if they haven't picked a division yet.

Changes to `src/routes/auth.tsx`:
- Collapse to **two** tabs: **Sign In** and **Create Account**. Move the passwordless OTP flow behind a small "Email me a code instead" link inside the Sign In tab.
- Keep Google as the primary social button at the top; drop Apple for now (not configured, and it clutters the choice).
- Add short helper copy under the H1: "New here? Create an account, then pick your division."
- After successful sign-in / sign-up / OTP verify, redirect using this rule:
  - If user has **zero approved or pending registrations** → `/register`
  - Else → `/profile`
  - Honor a `?redirect=` search param if present (used by route guards).
- Same rule on `/register` page load: if already registered in ≥1 division, send to `/profile` instead of showing the form blank.

Toasts get plainer wording ("You're signed in — let's pick your division" / "Welcome back").

## 2. Mobile side menu

Current homepage header uses a horizontal nav that overflows on 430px width so the tabs disappear. There's already a `Sheet` hamburger in `src/routes/index.tsx` from earlier work — the issue is it's only on the homepage and the item list is stale.

Changes:
- Extract the header into a shared `SiteHeader` component (`src/components/site-header.tsx`) so every page uses the same nav.
- On mobile (`<md`), show only: logo (left) + hamburger (right). Hamburger opens a right-side `Sheet` containing:
  - Home, Divisions, Schedule, Standings, Leaders, Livestream, Contact
  - Divider
  - When signed out: Sign In, Register
  - When signed in: My Profile, Sign Out, plus an Admin link if staff
- On desktop (`≥md`), keep the existing inline nav.
- Add the same header to `/schedule`, `/standings`, `/leaders`, `/profile`, `/register`, `/auth`, and the legal pages so mobile users always have the side menu.

No changes to routes, data, or styling tokens — just layout composition.

## 3. Public shareable profile

Public profiles already exist at `/players/{id}` and resolve via the `get_public_player` RPC, which returns social handles when `profiles.is_public = true`. What's missing is discoverability:

- On `/profile`, add a **"Public profile" card** at the top of the Overview tab showing:
  - The `is_public` toggle (already in DB) with clear copy: "Let anyone view my player page and social links."
  - When on: show the shareable URL (`https://…/players/{id}`), a **Copy link** button, and a **Share** button (uses `navigator.share` when available, falls back to copy).
  - A small preview line: "People will see your name, photo, division, position, jersey #, bio, and any social handles you've added."
- Make sure the social handle inputs (IG / FB / X / TikTok) in the Info tab render as clickable links on the public `/players/{id}` page — verify the current render and add missing anchors if any handle isn't linked.
- No schema changes; `is_public`, social columns, and the RPC already exist.

---

## Technical notes

- Auth redirect logic: after `signIn` / `signUp` / `verifyOtp`, run a single `supabase.from('registrations').select('id').eq('user_id', user.id).limit(1)` to decide `/register` vs `/profile`. Server function not needed — RLS already scopes to the user.
- Google OAuth `redirect_uri` stays `${window.location.origin}/profile`; the post-hydration redirect logic in `/profile` handles the "no registrations yet → /register" bounce so the OAuth flow stays same-origin.
- Side menu uses the existing `@/components/ui/sheet`; no new deps.
- Share button: feature-detect `navigator.share`; otherwise `navigator.clipboard.writeText` + toast.

## Out of scope

- No changes to admin dashboards, approvals flow, payments, or database schema.
- Apple sign-in stays removed until it's configured; can be re-added later.
