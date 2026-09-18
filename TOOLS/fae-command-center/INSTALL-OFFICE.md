# Installing the F.A.E. Command Center at the office

Plain steps. No technical background needed. Takes about ten minutes per machine.

---

## 1. Copy the folder

Copy the whole `fae-command-center` folder onto the office computer. Desktop is fine.

Keep the folder together — the pages link to each other and to `assets/`. Copying a single
file out of it will break those links.

## 2. Choose how it opens

There are two ways to run it, and the difference matters.

### Live mode (recommended)

Double-click **`START-COMMAND-CENTER.bat`**.

A black window opens and the Command Center appears in the browser with a green **LIVE** chip
in the header. In this mode it reads the court schedule straight from the Google Sheet — the
status tiles at the top show what is on court right now, the next booking, how many are booked
today and the expected cash.

**Leave the black window open while you work.** Closing it turns live mode off.

This needs Python on the machine. If the launcher says Python was not found, install it from
<https://python.org> and tick **"Add python.exe to PATH"** during setup, then run the launcher
again.

### Basic mode

Double-click **`console.html`**.

Everything works except the live status tiles — Google blocks reading the Sheet when a page is
opened straight from a folder. You get a gold **LOCAL ONLY** chip explaining this, and the
"Today's Schedule" button still opens the live schedule page as normal.

Basic mode is fine for a machine that only needs the Staff Hub, payroll or the playbook.

## 3. Make a shortcut

Right-click `START-COMMAND-CENTER.bat` → **Send to** → **Desktop (create shortcut)**.

Rename the shortcut to **F.A.E. Command Center**. That is the only icon staff need.

## 4. Pick one browser and stick to it

Chrome or Edge, either is fine — but **use the same one every time on that machine**.

The Staff Hub, payroll and checklist save inside the browser. Opening the folder in a different
browser on the same computer looks like a different machine with no data.

## 5. Record the install

Open `logs/INSTALL-LOG.md` and fill in a row: machine, date, who installed it, which browser,
the version stamp from the bottom of `console.html`, and whether live mode works.

Do this now, not later. When two machines disagree about a record, this log is what tells you
which one is stale.

## 6. Show the staff three things

1. **`console.html` is home.** Everything opens from there.
2. **Log an Incident is the red button.** Press it the moment anything goes wrong.
3. **Print the Quick Card** from `playbook.html` and put it on the desk.

Have them read the playbook once, top to bottom. It takes ten minutes and covers the whole job.

---

## What is shared and what is not

This matters more than anything else on this page, because getting it wrong is how records go
missing.

| Shared across every device | Saved on one machine only |
|---|---|
| Court schedule (Google Sheet) | Front-desk checklist ticks |
| Members, payments, roles, stock (live site `/admin`) | Staff Hub shifts, tasks, drinks counts |
| | Payroll data |
| | Dashboard records and incident drafts |

**The rule: if it must match on every device, it does not live in this folder.** Put it on the
Sheet or the live site.

## Backups

On each machine, open the Staff Hub and press **Export backup** regularly — weekly at minimum,
and always before copying a new version of the folder over the old one.

The exported file is a `.json`. Keep them somewhere shared so a dead machine does not take its
records with it.

## Adding next week to the Sheet

The renter calendar has one tab per week. When a new week's tab is created, the console needs
its id or it will fall back to the schedule page.

1. Open the new tab in the Google Sheet.
2. Look at the address bar. The end reads `gid=1234567890`. Copy that number.
3. Open `console.html` in a text editor, find the `WEEK_TABS` list near the top of the script,
   and add a line in date order:

       {from:'2026-09-20', gid:'1234567890'},

4. Save, and copy the updated file to every machine.

This is on the weekly audit checklist (`logs/AUDIT.md`, check W7) so it does not get forgotten.

## If something looks wrong

| Symptom | Cause | Fix |
|---|---|---|
| Gold **LOCAL ONLY** chip | Opened straight from the folder | Use `START-COMMAND-CENTER.bat` |
| Status tiles say "needs live mode" | Same as above | Same as above |
| "Could not reach the Sheet" | No internet, or the Sheet's sharing was changed | Check the connection, then open the Sheet directly |
| "This week has no tab listed" | New week tab not registered | Follow "Adding next week" above |
| Staff Hub shows no roster | No employees in Payroll on this machine | Add them in Payroll, or import a backup |
| Two machines show different numbers | Local data does not sync — this is expected | Use the Sheet and the live site for shared records |
| Versions differ in the footers | One machine has an older copy of the folder | Copy the current folder across, log it in the install log |

---

## Files in this folder

| File | What it is |
|---|---|
| `START-COMMAND-CENTER.bat` | The launcher. This is what staff double-click. |
| `console.html` | The home screen — live status, big actions, today's schedule. |
| `index.html` | Redirects to `console.html`, so any old shortcut still works. |
| `dashboard.html` | Business dashboard — gold/black, top tabs, incidents, revenue, members, stock. |
| `playbook.html` | The training doc and printable Quick Card. |
| `scoreboard.html` | Gamified flow — missions, points, streaks, owner-set reward ladder. |
| `worker.html` | Phone form for staff — makes a QR/code submission the desk scans or types in. |
| `take-payment.html` | Quick desk calculator — rate × hours, method, OR reminder, daily log. |
| `schedule.html` | Live court schedule, embedded from the Google Sheet. |
| `staff.html` | Staff Hub — shifts, daily tasks, drinks count, master queue. |
| `payroll.html` | DOLE-compliant payroll and payslips. |
| `nxgen-stats.html` | NXGEN league stat entry, leaders and standings. |
| `blueprint.html` | Master blueprint reference. |
| `_old/` | The previous home screen, dashboard, playbook and README — kept for reference. |
| `logs/AUDIT.md` | Standing audit sheet — daily, weekly, monthly checks with sign-off. |
| `logs/INSTALL-LOG.md` | Which machine runs what, and every update. |
| `logs/CHANGELOG.md` | Every change made to this folder. |
| `assets/` | Logos. Leave this alone. |
