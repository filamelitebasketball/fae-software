# NXGEN Premium Base — Reusable Website Template

Isolated, resellable snapshot of the NXGEN Premier League codebase, captured at the
**pre-upgrade "old" version** (commit `f815d1b`, before this session's glassy 6-digit OTP
redesign). Kept as a clean reference/product base for **selling premium sports-league
websites**, and as the safe baseline for the migration off Lovable.

## What this is
- React + Vite + TanStack Start, Supabase auth/data, gold/black brand.
- Full league site: divisions, schedules, live standings, player profiles, OTP email verify,
  admin ops, RFID hooks.
- Source only — `node_modules`, `.env`, and build output are intentionally excluded
  (nothing secret in here). Run `npm install` (or `bun install`) to build.

## How to reuse for a new client
1. Copy this folder to a new project.
2. Rebrand: colors/logo/fonts, site name, `VITE_SITE_URL`.
3. Point at the client's own Supabase project (set the env vars — see `.env.example`).
4. Deploy to Vercel (free) or the client's host.

## Version notes
- This base does **not** include the session's glassy 6-digit OTP UI or the motion-demo /
  launch-preview pages — it is the clean prior version by design.
- The live, upgraded NXGEN lives in `../SITES/nxgen` (repo `nxgenpremierleague`).
