# F.A.E. Launch Checklist (saved reference)

Last updated 2026-09-19. Companion to the `fae-launch-status` memory.

## NXGEN Premier League — LAUNCHED ✅
- [x] Drive reorganized (SITES/ + TOOLS/), pushed to GitHub
- [x] FAE Hub landing built (SITES/faehq/index.html) — professional-modern theme
- [x] Domain **faeph.com** bought and wired: nxgen.faeph.com → NXGEN, apex+www → fae-hub
- [x] NXGEN DB migrated to owner's own Supabase (ref lyyvtzdtebsyuoxgakua)
- [x] NXGEN deployed to Vercel; env vars set (service_role secret only in Vercel + .env.local)
- [x] **Lovable fully removed** — pure Vite + TanStack Start + Supabase + Vercel (nitro() plugin
      required for Vercel; deploy = git push)
- [x] Site assets self-hosted (public/__l5e); site live at nxgen.faeph.com
- [x] Email login (OTP + password) working; verified end-to-end
- [x] Google login set up + enabled (publish the Google app for public use)
- [x] Admins granted: filamelitebasketball@gmail.com, jhoopin3@gmail.com
- [~] Apple / Facebook login — deferred (Apple needs paid dev acct; both env-gated off)
- [~] Branded email templates — built but need custom SMTP (Resend free) to apply; DEFERRED
      (decision: don't email after login; show user email in admin instead)

## Next build tasks (in progress / queued)
- [ ] Admin dashboard: show each user's **email** for lead management
- [ ] **Free Agent** lead tier: signups = view-only Free Agents (lead capture); rostered
      division players = full Players
- [ ] Start social-media marketing (see the NXGEN Marketing Playbook artifact)

## Build-after (other FAE sites)
- [ ] Deploy FAE Hub (faeph.com) + Management (fae-court-connect) + LinkMePH
- [ ] FAE Basketball / Volleyball / Events sites
- [ ] Swap monogram badges for real logo files
- [ ] Wire F.A.E. Command Center to update the sites

## Key facts to remember
- Deploy NXGEN: `git push origin main` → Vercel auto-builds (see nxgen-lovable-deploy memory).
- NXGEN Supabase project ref: lyyvtzdtebsyuoxgakua (owner's own).
- Run NXGEN SQL in the Supabase SQL editor (owner pastes).
