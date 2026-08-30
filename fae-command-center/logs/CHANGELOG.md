# F.A.E. Command Center — Change Log

Every change made to this folder gets recorded here, newest first.

---

## 2026-08-28 (session 3) — Admin sign-in, activity log, contacts & sync

**dashboard.html — "who did what" audit trail**
- Added a sign-in gate: on open, pick who you are (Owner / Front Desk / Co-Owner /
  custom). Your name is remembered on that device and shown in a chip (bottom-left).
- Every action that shows a confirmation is now recorded to an activity log,
  attributed to the signed-in user, and persisted. View it via the terminal (🖥️)
  icon in the chip — a green-on-black console, newest first, with Export .txt.
- "Switch" lets a different person take over; the log records the handover.

**index.html — hub additions**
- New "Manage · Syncs Home ↔ Court" section: a Members & Admin card that opens the
  LIVE site's admin (fae-court-connect.lovable.app/admin), which is the real
  cross-device store, plus a Rates & House Rules card (₱900/₱750/₱400, hours).
- New "Quick Contacts" row: editable Co-Owner / Maintenance / Security / Clinic
  cards with tap-to-call. Saved on the device.

**Answered: cross-device (home + court)**
- The local folder saves to one browser only. Confirmed the live FAE site's Supabase
  already has the shared tables — members (6), bookings, activity_log, user_roles,
  sales, inventory — so multi-device management belongs on the live site's /admin.
- Members page in the local dashboard is fully functional (Add Member / Import
  Renters / search); it was only showing 3 sample members.

---

## 2026-08-28 (later) — Live wiring, agent review & fixes

**Switched schedule source.** Now using the shared Google Sheet
`1lKtBgv9zrIEZz75U_c74inPZRFbXWIIp` (the link you provided). The Drive `.xlsx`
found earlier is NOT used.

**Live wiring**
- `schedule.html` — new page that embeds the live Google Sheet (always current),
  with a "TODAY is …" banner, gold-glow frame, loading shimmer, and Open-to-edit.
- `index.html` — rebuilt on the real FAE brand (void black #050507 + gold #C9A227,
  Archivo / DM Sans / JetBrains Mono). Added glassmorphism, scroll-reveal motion,
  rotating gold/red borders on the two priority actions (all respect
  prefers-reduced-motion). Live-site cards now hardcode the real Lovable URLs with
  preview thumbnails: fae-court-connect.lovable.app and nxgenpremierleague.lovable.app.

**Reviewed by two agents; fixes applied**
- dashboard.html — FIXED critical data loss: filed incidents (and invoices, sales,
  station sessions, employees, work log, NFC logs) were saved to storage but never
  reloaded, so incidents vanished on refresh. `loadSavedData()` now restores them and
  the incident ID counter. Storage-full failures now show a visible warning instead
  of failing silently.
- dashboard.html — incidents can now be logged for walk-ins / renters (type a name;
  member is optional) instead of requiring a registered member.
- dashboard.html — Schedule page now embeds the same live Google Sheet at the top;
  the old grid/logs are labelled "planning / sample only" so they can't be mistaken
  for the real calendar.
- dashboard.html — home "Log an Incident" now opens the filing form directly
  (`#file-incident`) instead of just the list.
- nxgen-stats.html — localStorage wrapped so a blocked file:// origin can't blank the
  app; Excel export now warns instead of throwing when offline.
- READ ME FIRST.txt — corrected (removed the non-existent "Set link" step; documented
  the live schedule page and walk-in incident logging).

---

## 2026-08-28 — Initial build

**Created the FAE Command Center folder** so everything for the building lives in one place.

- `index.html` — new home page ("Command Center"). Live clock + today's date (so there's
  never confusion about which day's schedule you're looking at), a golden-rule reminder to
  log incidents immediately, a self-resetting 5-step daily front-desk checklist, and big
  buttons to every tool.
- `dashboard.html` — copied from `fae-dashboard_2_1.html`. Added deep-link support so the
  home page can jump straight to the Schedule or Incidents page.
- `nxgen-stats.html` — copied from `NXGENStatCenter.html` (NXGEN league stat center).
- `assets/` — FAE and NXGEN logos used by the home page.
- `READ ME FIRST.txt` — plain-English instructions for the front desk.
- `logs/` — this change log.

**Connected data source located:** Google Drive file
"FAE COURT RENTER CALENDAR SCHEDULE" (Excel .xlsx, owner filamelitebasketball@gmail.com,
Drive ID 1aBfsyhUq6sjvdCVtgUDlbhu8UtsYZgTR). Read access confirmed. No changes written yet.

---

<!-- Add new entries above this line, newest first. Format:
## YYYY-MM-DD — Short title
- what changed and why
-->
