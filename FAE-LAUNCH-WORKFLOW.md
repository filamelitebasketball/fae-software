# 🏀 F.A.E. Launch Reference

**Quick status:** NXGEN Premier League is **LIVE** at [nxgen.faeph.com](https://nxgen.faeph.com) — off Lovable, running on Supabase + Vercel, with email + Google login working.

_Last updated: 2026-09-19 · Companion to the `fae-launch-status` memory._

---

## 🔗 Live links

| What | URL | Status |
|---|---|---|
| NXGEN Premier League | https://nxgen.faeph.com | 🟢 Live |
| FAE Hub (umbrella) | https://faeph.com | 🟡 Deployed, to finish |
| Marketing Playbook | [Artifact](https://claude.ai/artifact/CCswjC7szerWUVfhtjePeZ) | 🟢 Pinned |
| Management site | management.faeph.com | ⚪ To deploy |
| LinkMePH | linkme.faeph.com | ⚪ To deploy |

---

## 🔑 Accounts & references (no secrets here)

| Thing | Value |
|---|---|
| Umbrella domain | **faeph.com** (bought via Vercel) |
| NXGEN repo | github.com/filamelitebasketball/nxgenpremierleague (branch `main`) |
| NXGEN local folder | `06-SOFTWARE/SITES/nxgen` |
| NXGEN Supabase project | ref **`lyyvtzdtebsyuoxgakua`** (owner's own) |
| Hosting | Vercel (free Hobby), GitHub-synced auto-deploy |
| Software repo | github.com/filamelitebasketball/fae-software |

> ⚠️ The Supabase **service_role secret** lives only in Vercel env vars + local `.env.local` — never in git.

---

## 🔐 Login methods

| Method | Status | Notes |
|---|---|---|
| Email code + password | 🟢 Working | Supabase built-in (free) |
| Google | 🟢 Working | Publish the Google app for public users |
| Facebook | ⚪ Off | Needs a Meta app (free) — button hidden until set up |
| Apple | 🔴 Skipped | Needs paid Apple Developer acct ($99/yr) |
| Branded email templates | ⚪ Deferred | Needs custom SMTP (Resend free) to apply |

**Admins:** filamelitebasketball@gmail.com · jhoopin3@gmail.com

---

## 🚀 How to deploy NXGEN (free, no Lovable)

1. Edit code in `06-SOFTWARE/SITES/nxgen`.
2. `git push origin main` → Vercel auto-builds and deploys.
3. Vercel only goes live if the build succeeds, so a bad build won't take the site down.

> `vite.config.ts` **must keep the `nitro()` plugin** — without it Vercel 404s every page.

## 🗄️ How to run database SQL

Supabase → **SQL Editor** → New query → paste → Run.
Direct link: https://supabase.com/dashboard/project/lyyvtzdtebsyuoxgakua/sql/new

---

## ✅ Done

- [x] Drive reorganized + pushed to GitHub
- [x] Domain faeph.com bought & wired (nxgen → NXGEN, apex+www → hub)
- [x] NXGEN DB migrated to owner's own Supabase
- [x] NXGEN deployed to Vercel + env vars set
- [x] **Lovable fully removed** (pure Vite + TanStack + Supabase + Vercel)
- [x] Site assets self-hosted; site live
- [x] Email + Google login working
- [x] Admins granted

## 🔜 Next (code tasks)

- [x] **Admin dashboard: show each user's email** — for lead management
- [x] **Free Agent lead tier** — signups = view-only Free Agents (leads); rostered players = full Players
- [ ] Start social-media marketing (see the Playbook)

## 🧱 Build-after (other FAE sites)

- [ ] Deploy FAE Hub (faeph.com) + Management (fae-court-connect) + LinkMePH
- [ ] FAE Basketball / Volleyball / Events
- [ ] Swap monogram badges for real logo files
- [ ] Wire F.A.E. Command Center to update the sites

---

## 💡 Optional later

- Facebook login (free Meta app) → enable in Supabase, set `VITE_ENABLE_FACEBOOK=true`
- Branded emails → connect Resend (free) as Supabase SMTP, then paste templates from
  `SITES/nxgen/docs/email-templates/`
