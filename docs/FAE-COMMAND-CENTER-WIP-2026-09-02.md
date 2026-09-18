# FAE Command Center — office rebuild, work in progress

**Paused 2026-09-02.** Nothing in `fae-command-center/` has been modified. This file is the
handoff so the work can resume without re-deriving anything.

---

## Decisions already made (do not re-ask)

**Interface direction: C + B blend.**
- **C · Operator Console** decides *what the home screen says*: it becomes a status report,
  not a menu. Status strip (courts live / next booking / open incidents / expected cash),
  today's schedule table, on-shift table, type-to-jump bar.
- **B · Shift Board** decides *how big the targets are*: the two priority actions
  (Today's Schedule, Log an Incident) plus Staff Hub and Take Payment stay oversized.
- Rejected: A (Command Deck — safe refinement only), D (Front of House — light/editorial;
  ruled out because the screen faces staff, not renters).

The four rendered directions were reviewed in a comparison page generated during the session.
It lived in the session scratchpad and is gone; regenerate if the decision needs revisiting.

**Hardware:** regular PC/laptop, mouse and keyboard. Screen faces staff only — no
customer-facing compromise needed, full information density is fine.

**Devices: several staff devices.** This is the constraint that drives the architecture.
The current hub saves to one browser on one PC, so any number it displays is wrong on every
other machine.

## Agreed data truth model (3 tiers, labelled on screen)

| Tier | What | Lives where |
|---|---|---|
| SHARED · LIVE SITE | Members, bookings, payments, roles, sales, inventory | Supabase behind `fae-court-connect.lovable.app/admin` |
| SHARED · SHEET | Court schedule | Google Sheet `1lKtBgv9zrIEZz75U_c74inPZRFbXWIIp` |
| THIS DEVICE | Checklist ticks, drinks count, task submissions, incident drafts | `localStorage` on that one PC |

House rule to print in the doc and show on screen:
**if it must match on every device, it does not live in this folder.**
Plus one-click JSON export/import so a device's local data can be pulled to the master PC.

## Remaining scope (designed, not yet approved, not yet built)

1. `index.html` rebuilt as Operator Console with oversized priority actions.
2. Source badges on every number, per the tier table above.
3. `playbook.html` rebuilt as the staff training doc: 8-step booking flow, opening/during/
   closing sequences, money flow (quote → booking → payment → OR → logged), incident flow,
   escalation ladder, who-owns-what, paper fallback, printable one-page wall card.
4. `logs/CHANGELOG.md` entry; **new** `logs/AUDIT.md` (standing audit sheet with daily/weekly/
   monthly checks and sign-off columns); **new** `logs/INSTALL-LOG.md`.
5. `READ ME FIRST.txt` rewritten for multi-device reality.
6. Version stamp in every page footer, so a stale copy on another PC is visible at a glance.
7. `INSTALL-OFFICE.md` — install steps, shortcut, browser choice, backup routine, rollback.

Explicitly out of scope unless asked: splitting `dashboard.html` (347 KB, single file).
Only change planned there is adding source badges to its schedule page.

---

## Debugging pass — findings so far

Ran a functional check before the rebuild. Phase 1 (evidence) partly complete.

### Confirmed NOT bugs (ruled out, do not re-investigate)

- **Duplicate element IDs in `dashboard.html`** (`inc-*`, `m-bf-*`, `nfc-*`, `scrollTopBtn`).
  A static grep flags these, but they sit inside separate `modalTemplates` strings.
  `openModal()` replaces `modal-content.innerHTML` on every open, so only one template is ever
  in the DOM. Runtime check confirmed: **zero duplicate IDs live on the page.**
- **`MISSING: dashboard.html -> ${m.data}`** from a link-checker pass — template literals in
  constructed `src` attributes, not real missing files.
- **`index.html`** — loads clean, no console errors, clock runs, `localStorage` writable,
  7 local page links resolve.
- **`dashboard.html`** — loads clean, no console errors. `loadSavedData`, `fileIncident`,
  `openModal` all defined.
- **`staff.html`** — loads clean, no console errors.

### Resolved — payroll/staff roster contract is CORRECT (closed 2026-09-03)

The suspected key mismatch was not real.

- `payroll.html:395` sets `var KEY='fae-payroll-v1'` and `save()` at line 426 writes to exactly
  that key. The other `fae-payroll-*` strings in the file are **download filenames** passed to
  `dl(...)` for CSV and JSON export — not storage keys.
- Shapes agree too: payroll persists `DB.emps` as `{id, name, pos, active}`; `staff.html`
  `roster()` reads `d.emps` and uses those same fields.
- **End-to-end test passed.** Seeded `fae-payroll-v1` with three employees (two active, one
  `active:false`) and reloaded `staff.html`. `roster()` returned exactly the two active
  employees tagged `src:'payroll'`, the inactive one was correctly excluded, the names rendered
  on the page and the "No staff" message was gone.

The original "No staff" reading was a clean-slate artifact — the test origin simply had no
payroll data yet. No fix needed, no code changed.

### Full page sweep — all clean (2026-09-03)

Served over HTTP and loaded every page. **Zero console errors on all seven.**

| Page | Result |
|---|---|
| `index.html` | Clean. Clock and weekday both match the system exactly (verified 10:16 AM Thursday against system 10:16 Thursday) — the "which day is it" promise holds. |
| `dashboard.html` | Clean. `loadSavedData`, `fileIncident`, `openModal` all defined. Zero duplicate IDs at runtime. |
| `staff.html` | Clean. Roster contract verified end-to-end above. |
| `schedule.html` | Clean. Banner reads the correct weekday; iframe points at the right Sheet `1lKtBgv9zrIEZz75…`. |
| `payroll.html` | Clean. |
| `playbook.html` | Clean. |
| `nxgen-stats.html` | Clean. `XLSX` library loaded from jsDelivr, `localStorage` writable. |

Test data seeded during the check was removed afterwards; the test origin
(`127.0.0.1:8765`) is separate from the `file://` origin the office PC will use, so nothing
staff-facing was touched either way.

**Conclusion: no functional defects found.** The rebuild is a design and architecture job,
not a repair job. The one genuine weakness is architectural, already captured above — local
storage is per-device, and several devices are planned.

### Known storage keys

| File | Keys |
|---|---|
| `dashboard.html` | `fae-dashboard-data`, `fae-current-user`, `fae-data-export-<n>` |
| `staff.html` | `fae-staff-v1`, `fae-staff-user`, `fae-staff-backup-<n>`, reads `fae-payroll-v1` and `fae-dashboard-data` |
| `payroll.html` | `fae-payroll-v1`, `fae-payroll-<n>`, `fae-payroll-backup-<n>`, `fae-salary-history` |
| `nxgen-stats.html` | none found |

---

## How to resume the test environment

The preview pane renders files outside its root as static snapshots, so JavaScript does not
execute and `file://` testing proves nothing. Serve over real HTTP instead:

    cd 06-SOFTWARE/fae-command-center
    python -m http.server 8765 --bind 127.0.0.1

Then open `http://127.0.0.1:8765/index.html`. Python 3.12 is installed and on PATH.

## Environment note

**Node.js is not installed on this machine.** It does not block any of the work above (these
are plain HTML files), but it is why every plugin hook fails and why several MCP servers will
not connect. Fix with `winget install OpenJS.NodeJS.LTS`, then restart the app.

## External dependencies per page (matters for an offline office PC)

| Page | Needs network for |
|---|---|
| `index.html` | Google Fonts, the two Lovable site links |
| `schedule.html` | Google Fonts, the live Google Sheet embed |
| `dashboard.html` | the Google Sheet embed |
| `nxgen-stats.html` | `cdn.jsdelivr.net` (Excel export library) |
| `payroll.html`, `staff.html`, `playbook.html` | Google Fonts only |

If the office connection is unreliable, fonts and the jsDelivr library should be bundled
locally. Not yet decided.
