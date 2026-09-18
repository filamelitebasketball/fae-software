# F.A.E. Launch Workflow

Goal: one umbrella domain (**faehq.com**) fronting all services, everything off
Lovable and onto free hosting (Vercel), NXGEN email + phone OTP working, data
saved locally and online.

Legend:  🟢 free / no payment · 💳 needs payment · 🧑 you do · 🤖 Claude does

---

## Phase 0 — Do now, no payment needed

- [ ] 🟢🤖 Commit the drive reorg (SITES/ TOOLS/ _ARCHIVE/) to GitHub — saves it online
- [ ] 🟢🤖 Make NXGEN OTP config env-driven so email + phone OTP survive the move
- [ ] 🟢🤖 Keep the faehq hub landing ready to deploy (built: SITES/faehq/index.html)
- [ ] 🟢🧑 Create a free Vercel account with GitHub — https://vercel.com/signup
- [ ] 🟢🧑 Confirm you can log in to your Supabase account (database/auth lives there)
- [ ] 🟢🧑 Email Kualo support: request a data/database export of the suspended
        LinkMePH (WordPress) site before the grace period ends — support@kualo.com
- [ ] 🟢🤖 Recover LinkMePH public pages/content from the Wayback Machine

## Phase 1 — When you can pay (~$11.25 total)

- [ ] 💳🧑 Buy **faehq.com** — https://vercel.com/domains/search?q=faehq.com
- [ ] 💳🧑 (Optional) Settle or negotiate Kualo to export the LinkMePH customer/order
        data (only place that private data exists)

## Phase 2 — Deploy (Claude, after faehq.com is bought)

- [ ] 🤖 Import each GitHub repo into Vercel and deploy:
        nxgenpremierleague, fae-court-connect, faehq hub, linkmeph
- [ ] 🤖 Set env vars on each: VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY,
        VITE_SITE_URL (its own subdomain)
- [ ] 🤖 Point domain + subdomains:
        faehq.com → hub · nxgen.faehq.com → NXGEN · basketball / volleyball /
        events / linkme .faehq.com → their sites

## Phase 3 — Make OTP + auth work on the new domain

- [ ] 🤖 Supabase → Auth → URL config: add faehq.com + all subdomains to redirect URLs
- [ ] 🧑 Sign up Resend (free 3k emails/mo) — https://resend.com — give Claude the API key
- [ ] 🤖 Wire Resend as Supabase SMTP so email OTP sends reliably
- [ ] 🧑 (For phone OTP) Create Twilio account, buy a number, get SID + token
        — https://twilio.com   (SMS costs per message)
- [ ] 🤖 Connect Twilio in Supabase → Auth → Phone, so phone OTP sends
- [ ] 🤖 Test email OTP + phone OTP end-to-end on the live site

## Phase 4 — Go live and clean up

- [ ] 🤖 Verify every subdomain loads and all functions work
- [ ] 🧑 Cancel Lovable subscription once Vercel is confirmed working
- [ ] 🤖 Final backup: commit + push all repos, save a local snapshot

---

## Costs summary
- faehq.com: ~$11.25/yr (only required purchase)
- Hosting (Vercel), database/auth (Supabase), email (Resend): free tiers
- Phone OTP (Twilio SMS): pay per text (~$0.008/SMS + ~$1-2/mo number) — only if
  you want phone OTP; email OTP alone is free
- LinkMePH data: free if Kualo support exports it; otherwise cost of settling Kualo

## Blocked-on-you right now
1. Vercel + Supabase login (free)
2. Email Kualo for the LinkMePH data export (time-sensitive)
Everything in Phase 0 marked 🤖 I can start immediately — just say go.
