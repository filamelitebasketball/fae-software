# F.A.E. Command Center — Change Log

Every change made to this folder gets recorded here, newest first.


---

## 2026-09-11 (session 26) — Drink edit, walk-in→member tiers, member registry, blank-lookup fix

**Edit drinks inventory.** Every inventory row gets a ✎ Edit button → modal to fix
name / category / price / correct the stock counts, plus a Remove-item option. Root
bug fixed underneath: Add / Restock / Edit / new-member saves never called
`saveAllData()`, so those changes vanished on refresh — they persist now.

**Walk-in → member with tiers.** Visitors tab household rows get **→ Make member**.
It creates a member from the adult, links the household (`memberId` stamp, no
double-convert), and sets the tier from how they came in: guest → verified (has
phone+email) → full-member (assigned later with an NFC band). Visit count is read
from their check-ins. Already-members show a ⭐ MEMBER badge instead of the button.

**Member registry with headshots.** New `member-registry.html` (console tile + reads
`fae-dashboard-data.members`): a card per member with headshot, contact, tier; search,
Copy all (TSV to clipboard), Print, and CSV/Excel export. Headshot capture added to the
member Add form — downscaled to ~240px JPEG, stored as base64 on the member record, and
shown in place of initials on member cards and the profile modal.
ponytail: photos live in localStorage (~5-10KB each); move to IndexedDB only if the
roster reaches the thousands.

**Quick lookup showed no names — fixed at the root.** Synced website members
(`fae-members-v1`) use `fullName`, but the merge read `m.name||""`, so those members
had blank names in the Wallet quick lookup and Take Payment dropdown. Added
`FAE.memberName()` (coalesces name/fullName/Name/memberName/adult.name) and used it at
the merge and in both dropdowns; the take-payment sort is now null-safe too.

Core bumped to `?v=6` across 20 pages. Verified over http on the real server: synced
member shows its name in the lookup, walk-in converts to FAE-004 tier=verified and
persists, inventory edit persists (price 99 survived a reload), headshot renders on the
card + profile modal, member-registry lists 5 members with working search/export, no
console errors. Test data cleared, server stopped.

---
## 2026-09-07 (session 24) — Console grouped, and a setup guide for the office install

### The console was nineteen identical boxes

Every tile looked the same and sat in one flat grid, so finding the right one meant reading
all nineteen labels. They are now grouped by **when you use them**, so a new hire only has to
read the first group:

- **EVERY SHIFT — the front desk** · who is in the building, visitor sign-in, daily task
  ticket, worker submit, playbook
- **RECORDS & MONEY — management** · dashboard, registry, payroll, scoreboard, NXGEN stats
- **PRINT & POST — put these on the wall** · QR sheets, terms & waiver, advertiser pack
- **SET UP ONCE — owner only** · setup guide, settings, sync engine, blueprint
- **LIVE ONLINE — opens in a browser tab** · the two Lovable sites and the Google Sheet

### `SETUP-GUIDE.html` — for the office install

A printable, step-by-step guide covering the whole first day: copy the folder, install Python,
first start in Wi-Fi mode, firewall, settings, printing both QR sheets, the door screen,
testing the full loop, the optional Google Sheet, and the backup habit.

- **Two diagrams**: how the pieces connect (phones → office computer → files), and the test
  loop from a phone scan to a CSV you can open in Excel.
- **An annotated copy of the black launcher window**, with the two lines that matter — the
  phone address and the office code — marked out. That window is where every first-day
  install goes wrong.
- **A troubleshooting table** for the nine failures we actually hit while building this.
- **An 18-item tick-list** for tomorrow, and the daily/weekly/monthly routine once running.
- **It reads the live values off the running server**: opened from the office computer in
  Wi-Fi mode, it shows the real phone address and the real office code in a green box at the
  top, so nobody has to copy them off the terminal by hand.
- Ends with the three things the guide cannot do for you: change the PINs, get the waiver
  reviewed by a lawyer, and make the backups happen.

Verified: 12 steps render, both diagrams draw, the live box pulled the actual office code
from the running receiver, console shows 5 groups totalling 20 tiles, no console errors.

---

## 2026-09-06 (session 23) — One export button instead of five, and three real bugs

### Download buttons collapsed into one control

Every list could be sent out four or five ways - CSV, Excel, JSON, into the data folder,
up to the Google Sheet - and each one had its own little button beside the table. That was
**51 export buttons** across the app, which buried the buttons that actually matter.

New **`assets/fae-export.js`**: a single "Export" control that opens a short menu with the
formats that make sense for that list, each with a one-line explanation of what the file is
for. It asks for the rows fresh each time it opens, so a menu always exports exactly what
the current filters are showing.

- **Registry** — 20 buttons became 8 (four export menus plus backup/restore/sync, which are
  different actions, not formats).
- **Dashboard** — Members, Daily Tickets, Visitors and Removed each went from 2-3 buttons to one.
- The **Export & Reports hub** was left as it is: those nine buttons are nine different
  *datasets*, already grouped under "Data Exports" and "Generate Reports". Hiding them behind
  a menu would have made the place harder to use, not easier.

**One deliberate omission:** the Visitors export offers CSV, Excel and the data folder but
**not** the Google Sheet. That list carries children's names and health notes, and the sheet
is a different trust boundary — it stays on the office machine.

### Bugs fixed

1. **The Inventory page crashed on incomplete stock records.** `renderInventory` called
   `.toLocaleString()` straight on `cashRev`/`gcashRev`, so any item saved by an older
   version, restored from a partial backup, or added through a path that never set those
   counters took the whole screen down — and Inventory is a page the front desk lives in.
   Every number is now treated as optional.
2. **Two calendar buttons were the same button.** "Google Calendar" and "Apple Calendar"
   called the same function and produced the same `.ics` file. One file works everywhere, so
   offering a choice that was not a choice just added a box and a decision. Merged into one.
3. **KPI accent bars stopped at five tiles.** The Visitors row has seven, so the last two had
   no colour bar. Extended to eight, and the row now wraps instead of squashing.

Verified: all 24 dashboard views open with no console errors; the export menu opens, positions
itself on screen, closes on a second click or Escape, and produced real CSV and Excel files
with the right names and contents; the Visitors menu correctly omits the Sheet option;
Inventory renders a deliberately broken item instead of dying. Test data cleared, server stopped.

## 2026-09-06 (session 22) — Waiver, terms and Data Privacy Act compliance for the visitor register

The register holds children's names, ages and sometimes health notes. This session
brought the forms and the software up to the standard that requires.

### The serious one: the door kiosk had no lock

`checkin.html` lists every registered child by name with the adult responsible for them,
and anyone on the office Wi-Fi could open that URL and read it. It now needs a staff
sign-in, and **nothing renders until signed in** - an overlay alone was not enough,
because the names were still in the page source for anyone who looked. Added a LOCK
button for the end of a shift.

The full register is now admin/owner only. Front desk gets 8 dashboard tabs and Visitors
is not one of them: they run the door from the kiosk, which shows the names they need and
not home addresses, emails or health notes. That is what the privacy notice promises, so
the software now enforces it instead of relying on habit.

### Consent: one tick became four

A single checkbox covering everything was the real legal problem - consent under RA 10173
must be **specific** and **freely given**, which rules out bundling photographs with
"we may keep your details".

- **Required:** accept the terms/waiver/privacy notice · keep these details
- **Required only when a child is listed:** *I am the parent or legal guardian.* The box
  appears and disappears as children are added or removed, and submit stays blocked until
  it is ticked. A child cannot consent for themselves.
- **Optional:** photographs and video. Declining changes nothing about the visit, and the
  form says so.

Health notes relabelled "Team / allergy / condition - optional". That is sensitive personal
information under the Act and nobody should feel pushed into it.

**What is stored is now auditable:** terms version, timestamp, whether the document was
actually opened, and each permission separately. Bump `TERMS_VERSION` and every family
re-confirms on their next visit - an old yes is not a yes to new terms.

### New documents

- **`terms.html`** - house rules, waiver and assumption of risk, a children's section, and
  a full privacy notice with a what-we-collect-and-why table, retention schedule and the
  eight data-subject rights. Printable for paper sign-ups. The waiver states plainly what
  it cannot do: under Philippine law it cannot excuse the business from its own negligence,
  and a clause attempting that is void.
- **`PRIVACY-RUNBOOK.md`** - the operational half. Who is responsible, what staff may and
  may not see, the monthly purge job, how to answer "what do you hold on my child?", and
  the 72-hour breach procedure.
- **Settings -> Data Privacy** - name the responsible person, set retention periods. They
  flow into the public notice automatically, so it can never list a dead contact.

### Registry management tools (Visitors tab)

- **Consent chips** per household: terms version (amber when stale, red when never
  recorded), guardian, photo yes/no, and an amber HEALTH INFO flag for sensitive data.
- **Consent gaps card** - households with dependents but no guardian confirmation, no
  consent record at all, or an out-of-date terms version, with a copyable message asking
  them to re-confirm.
- **Retention card** - counts what is past the configured retention, and a reviewed purge
  that lists exactly what would go and asks twice. Nothing deletes itself on a timer: a
  machine quietly destroying a family's record is worse than one that waits to be told.
- **Copy** on each household - right of access and portability, hands a parent everything
  held about their family as one file.
- **Erase** - the right to erasure, extended to withdraw their movements from the building log.

### Fixes made after review

1. **An "erasure" was keeping a full copy of the erased family** - names, ages and health
   notes - inside the undo trail. That is not an erasure. It now records that the erasure
   happened and who did it, and keeps no snapshot.
2. **A voided check-in kept the person's name**, so an erased child stayed named in the
   building log. New `FAE.redactPerson()` blanks the identity while keeping the row, because
   who was in the building at a given hour still matters for an incident review.
3. **The audit trail trimmed to the last 800 entries**, so a large retention purge could
   push the record of an earlier erasure out of the log. Erasures and purges are now
   protected from trimming.
4. **`toast(msg, level)` took a boolean** while 16 call sites passed 'success'/'warning'/
   'info'. Every string is truthy, so cheerful messages rendered as red errors.
5. **`.kpi-value` had no font-size or weight** - the styled class was `.kpi-val`, which the
   markup does not use. All 45 KPI figures across every dashboard page were rendering at
   body text size. Also made `.kpi-row` wrap rather than squash at seven tiles.

`assets/fae-core.js` bumped to `?v=5` across all 19 pages - the RBAC change was being
served from cache, which is how a front-desk gap would have gone unnoticed.

**Stated plainly in the documents themselves:** this pack is a working template, not legal
advice, and `terms.html` has not been reviewed by counsel. The waiver and the children's
section in particular should go to a Philippine lawyer before the business relies on them.

Verified: erasure removes the household, redacts the child's name to `[erased]`, keeps the
movement row, and logs both actions with no snapshot; consent gap detection flags exactly
the three seeded problem households and not the compliant one; retention finds a
three-year-old record; the guardian box gates submit correctly; the kiosk exposes no names
before sign-in; front desk sees 8 tabs and master 24. Test data cleared, server stopped.

## 2026-09-06 (session 21) — Undo on every charge + walk-in visitor register with dependents

Two things: mistakes are now reversible everywhere money changes hands, and anyone
walking into the building can sign themselves (and the youth they brought) in.

### 1. "There will always be mistakes" — a delete button on every service

- **Drink sales** now carry an id and every row in the sales log has a **x** button.
  Removing one puts the stock back, backs the money out of that payment method's
  revenue, and if it was charged to a tab it clears the tab line and the debt too.
  The double-tapped order is the case this was built for.
- **Cash-log entries** have the same x.
- **Invoices** get a **Void** button instead of a delete. An invoice is a numbered
  document - a gap in the receipt sequence is exactly what an audit asks about - so it
  stays in the list marked VOID with the reason.
- **Bookings** and **check-ins** are removable the same way.
- Every removal asks for confirmation and offers an optional reason ("double order",
  "customer changed mind"). The reason box is optional on purpose: a required one is
  how staff learn to click through without reading.

- **New Dashboard tab: Removed.** Nothing deleted anywhere in the Command Center
  vanishes silently. Each removal is logged with what it was, how much, who removed it
  and why, and exports to CSV. Check it against the drawer at closing; a run of
  removals by one person on one shift is worth a conversation.

### 2. Walk-in visitor register + who is in the building

- **register.html** - the visitor's own phone. Adult contact details, then
  "+ Add another child" for each youth they are responsible for. A returning family
  types their mobile and everything comes back. Requires a consent tick, because this
  collects minors' data.
- **checkin.html** - a door/front-desk kiosk. Search a name, tap the tile to flip
  someone IN or OUT. A youth's tile shows "with <the adult>". "Check in whole family"
  handles an arrival in one tap. **UNDO LAST** needs no password - wrong taps at a door
  are constant. Counts at the top: who is inside, and how many of them are youth.
- **Dashboard -> Visitors** - the register, who is inside now, today's in/out log with
  a x on each row, edit/delete a household, and CSV/Excel export.
- **fae-server.py** files registrations to `data\visitors\` and movements to
  `data\checkins\`, as JSON plus an Excel-ready CSV.
- The QR poster gained a **Visitor Sign-In** sheet with its own instructions and its own
  footer explaining why the details are asked for. A visitor reading "tap TIME IN" would
  just walk away, so the steps swap with the sheet.
- Console gained **Who Is In The Building** and **Visitor Sign-In** tiles.
- **VISITOR-SYSTEM.md** documents setup, daily use, the file locations, the fix-a-mistake
  table, and the Data Privacy Act obligations that come with holding children's names.

**Privacy boundary, deliberately drawn:** personal details never leave the office
computer. A phone on the Wi-Fi can POST a registration but `/fae-visitors` and
`/fae-checkins` answer localhost only - a phone cannot read the register or the log of
who is in the building. Visitors are never asked for the staff office code.

**Fixed while building:** `findByPhone` compared raw digits, so a family that registered
as `0917...` and searched as `+63917...` looked like a new household and would have been
registered twice. Numbers are now normalised to the local `09` form before comparing.

Verified end to end on the real server: a household with an adult and youth registered
from the form, filed to `data\visitors\` as JSON + CSV; the kiosk checked two people in,
the counts and youth-inside figure updated, UNDO reversed one and left the movement
struck through rather than deleted; the dashboard pulled it all back and showed the
guardian link. A double drink order was removed and stock went 5 -> 1 -> 3 with the
revenue backed out and a trail line naming the reason. All 24 dashboard views open with
zero console errors. Test data cleared, server stopped.

## 2026-09-06 (session 20) — Office code on the Wi-Fi form + full function audit

Locked down the open Wi-Fi form, then walked every page and every function. Five real
bugs found, four of them in the money path.

**Office code (the open-Wi-Fi fix)**
- `fae-server.py` now makes a 4-digit code on first run and keeps it in
  `data\staff-code.txt`. A phone must send it (`X-FAE-Code`) to file a ticket; the office
  PC itself is exempt. Wrong code returns 403 and the launcher window logs the attempt.
- Reading is tighter than writing: `GET /fae-inbox` (the whole staff log) and `GET /fae-code`
  answer the office computer only. A phone can send a ticket, never pull down everyone's hours.
- `tasks.html` asks for the code once, remembers it, and says up front when it still needs it.
- Dashboard → Daily Tickets shows the current code to the manager (localhost only).
- Honest limit written into the guide: this is a gate, not a lock. Anyone who watches a staff
  member type it knows it.

**Bugs found and fixed**
1. **Voiding a wallet session credited the member 100x.** `voidLedgerEntry` mixed units -
   `m.balance` is in pesos, `amountCents` in cents - so cancelling a ₱250 session added
   ₱25,000 to their wallet. Now reverses in the right unit.
2. **Voiding a session charged to a tab doubled the debt.** Session entries were saved with a
   negative amount while drink and court charges were positive, so the reversal ran backwards.
   All charges now record positive, and the void reverses by magnitude, never below zero.
3. **Take Payment's tab charges were being destroyed by the dashboard.** `saveAllData()` never
   included `inventory` or `ledgerEntries`, so every dashboard save overwrote the shared key
   without them: drinks stock reset to the seed numbers on refresh, and the front desk's court
   charges lost the ledger line explaining them. Both are now saved and reloaded.
4. **Member edits vanished while the roster was small.** `loadSavedData` only restored members
   if there were more than 3 - a leftover seed guard. On day one at the office, with 1-3
   members, every edit (tab balance, NFC card, phone number) was thrown away on refresh.
5. **The ledger showed drinks bought on tab as money coming in** (green ↑), because it decided
   credit-vs-debit from the sign. It now decides from what the line actually is.

Also fixed: the registry read `stock`/`qty` when the dashboard tracks `startStock`/`sold`, so
the stock export said every drink was 0 left - it would have sent someone to reorder a full
fridge. Now reports on-hand, sold and start stock, and flags low stock properly. The
launcher printed the internet-facing address when the PC was on a VPN (no phone can reach
it, and it would have been printed on the QR poster); it now prefers a real office address
and warns when it cannot find one. Python `SyntaxWarning`s no longer clutter the launcher
window, a phone walking out of Wi-Fi range no longer prints a traceback, and a ticket
rejected for a bad code keeps its draft instead of wiping the employee's typed work.

**Audit coverage** - static: every `onclick`/`onchange` handler in all 18 pages resolves to a
real function; every `FAE.*` and `FAEMotion.*` call matches an actual export (48 of them); no
duplicate function definitions. Runtime: all 18 pages loaded with zero JavaScript errors; all
22 dashboard views opened; member categories, all three layouts, sorting, filters and exports
exercised; tab charge → ledger → void → stock restore verified to the cent; settings
save/reset round-trip; payroll, staff, worker, sync, scoreboard, registry and take-payment
functions all called without a throw. Test data and files cleared afterwards.

---

## 2026-09-06 (session 19) — Office Wi-Fi mode: phones can open and send the task ticket

Answering "how does the employee get and send the ticket". Before this, the launcher bound to
`127.0.0.1`, so no phone could even open the form. Now the office PC serves the Command Center
to the office Wi-Fi **and receives what the phones submit** — no internet, no Google account,
no monthly cost.

- **`fae-server.py`** — the office receiver. Serves the folder to the Wi-Fi and accepts
  `POST /fae-inbox`. A submitted ticket is written to `data\tickets\<id>.json` *and* appended
  to `data\tickets\FAE-tickets-<date>.csv` for Excel. `GET /fae-inbox` hands them back to the
  dashboard; `GET /fae-ping` lets a page ask whether the receiver is up. A re-sent ticket
  merges onto the filed copy, so a thinner second copy can never wipe details already received.
  `.bat` files and `data\backups\` are never served over the network.
- **`START-COMMAND-CENTER-WIFI.bat`** — new launcher for Wi-Fi mode. Prints the address staff
  type on their phones. The original `START-COMMAND-CENTER.bat` is untouched for
  this-computer-only use.
- **`ALLOW-WIFI-FIREWALL.bat`** — run once as administrator if Windows blocks the phones.
  Private networks only, ports 8765-8766.
- **`qr-poster.html`** — a printable A4 sheet with a QR of the phone address, the six steps of
  a shift, and what to do if it will not open. Warns loudly if the address shown is
  `127.0.0.1` (the mistake that would produce a useless printed poster) and can test whether
  the receiver is actually answering.
- **`tasks.html`** — a strip at the top now says, before they start, whether the ticket will
  send by itself. Submitting uses the new `FAE.deliver()`: office PC on this Wi-Fi first, then
  the online endpoint, then the outbox + ticket code. Never lost, only delayed.
- **Dashboard → Daily Tickets** — pulls from the office receiver on opening the tab and every
  25 seconds, plus a **Check Phones** button. New tickets merge in by themselves.
- **`DAILY-TASK-TICKET-SETUP.md`** — one page for the office: setup, the employee's six steps,
  where the files land, and a troubleshooting table.
- Console gained a **Staff QR Sheet** tile.

**Bug found and fixed while testing:** the Daily Tickets date filter and the "today" KPIs used
`toISOString()` (UTC), so every ticket submitted after 8am Manila time was filtered out of its
own day. Now built from local date parts (`tkToday()`). Same class of bug as the cash-flow one
in session 15. `FAE.taskId()` had the same UTC slip in the ticket number and was fixed too.

Verified end to end against the real server: phone form → `POST /fae-inbox` → JSON + CSV on
disk → dashboard pulled both tickets back after its local store was deliberately emptied;
re-send kept the original details; QR rendered and the localhost warning fired correctly.
Test files and data cleared afterwards.

---

## 2026-09-05 (session 18) — Member categories, motion UI, daily task tickets, registry database

Four things: categories on the members tab, an upgraded look, a phone form for
employee daily tasks that reports back to the office, and a file-based registry.

**1. Members tab — categories + list view (list is now the default)**
- Category chips across the top: ALL / NXGEN / BASKETBALL / VOLLEYBALL / PICKLEBALL /
  COURT RENT / MEMBER, each with a live count. Empty categories hide themselves.
- Three layouts, remembered per computer: **LIST** (default — a proper sortable table with
  Member, Category, Status, NFC, Contact, Wallet, Tab, Joined), **CARDS** (the old view,
  kept), **COMPACT** (dense name grid for a quick scan).
- Extra filters: Active only · Has NFC · Tab open · Owes money. Search now also matches
  phone and email.
- Every column heading sorts; click again to reverse.
- Category logic moved into `assets/fae-core.js` (`FAE.memberCategory`) so the dashboard,
  Take Payment and the registry all tag the same person the same way. Take Payment's own
  copy was deleted and now calls the shared one — its dropdown labels match the dashboard.
- Buttons: CSV · Excel · Send to Sheet, exporting exactly what the filters are showing.

**2. Motion / UI upgrade**
- New `assets/fae-motion.css` + `assets/fae-motion.js`, linked from every page.
  Panels rise in, cards and KPIs stagger, tiles lift on hover, buttons answer a tap,
  modals scale in, progress bars grow, numbers can count up, lists shimmer while loading.
- **Settings → Interface → Motion**: Full / Subtle / Off, stored in `fae-config-v1.ui.motion`
  and applied on `<html data-motion>`. A device set to "reduce motion" in its own
  accessibility settings always wins.
- Nothing about layout or colour changed — deleting the two files returns the old look.

**3. Daily task ticket (`tasks.html`) + Daily Tickets tab on the dashboard**
- Phone-first form: pick your name (pulled from the payroll roster), tap **TIME IN**,
  tick the shift checklist, write what you accomplished, flag anything broken, tap
  **TIME OUT**, submit. Hours are computed from the two real stamps.
- Checklist ships with Opening / During the shift / Closing duties
  (`fae-task-template-v1`), plus "+ Add a task I did".
- Saves a draft as you go, so a dropped connection or a locked phone loses nothing.
- Submitting stores the ticket in `fae-tasks-v1`, queues it in the sync outbox, and
  queues a flat row for the **TASKS** tab of the Google Sheet.
- No internet link yet? The page prints a **ticket code** the employee copies and sends by
  chat. At the office: Dashboard → Daily Tickets → **Paste Ticket**.
- Dashboard gained a **Daily Tickets** view: today's tickets, hours, tasks done, issues
  raised, approve / remove, and CSV · Excel · Send to Sheet. Front desk and admin can
  both open it; it holds no income figures.

**4. Registry database (`registry.html`) + `data\` folder**
- New console tiles: **Daily Task Ticket** and **Registry Database**.
- The registry reads every store on the computer and reports what is in it: members by
  category, tickets by status, stock (with a low-stock count) and payments.
- Writes out **CSV**, **Excel (.xls)**, **JSON**, or **Save to data folder** (Chrome/Edge
  over `http://localhost` opens a real Save dialog straight into `data\`).
- **Back up everything** → one JSON with all stores; **Restore from file** puts it back.
- Payments/income section stays locked unless signed in as master (or a trusted admin).
- New `data\` folder with `members\ tickets\ payments\ stock\ backups\` and a README
  explaining the columns and the backup rule.

**5. Excel / Google Sheet append**
- `FAE.sheetPush(tab, rows)` queues rows in the existing offline outbox; they go out with
  everything else once an endpoint is set.
- `SYNC-SETUP.md` now carries the complete Apps Script `doPost` — it creates the MEMBERS /
  TASKS / PAYMENTS tabs, writes a header row once, and skips rows already logged, so
  pressing *Send to Sheet* twice does not duplicate.
- With no endpoint configured, CSV/Excel is the working path — nothing is blocked.

Files added: `tasks.html`, `registry.html`, `assets/fae-motion.css`, `assets/fae-motion.js`,
`data/README.md` + sub-folders. `assets/fae-core.js` bumped to `?v=4` everywhere.

Verified over `http://127.0.0.1` with a seeded roster: ticket submitted from the phone form
(5.00 hrs, 3 tasks, issue flagged) → appeared on the dashboard → approved → exported;
a second ticket imported from a pasted code; member categories counted and filtered
correctly in all three views; money stayed hidden for the front-desk role. Test data cleared.

---

## 2026-09-05 (session 17) — Member / non-member pricing + member dropdown with source tags

**New rate model.** Court rates are now member vs non-member: Basketball & Volleyball ₱1000
member / ₱1200 non-member; Pickleball ₱500 / ₱700. `fae-config-v1.rates.<sport>` is now
`{member, nonMember}` (old single-number shape still read for safety). Added `FAE.rate(sport,
isMember)` to core (bumped to `?v=3`) as the one place price is resolved.

- **Settings** — each court sport now has Member ₱ and Non-member ₱ inputs; defaults 1000/1200
  and 500/700; saves the new shape. Verified.
- **Take Payment** — a Member / Non-member toggle drives the price; sport tiles show both
  ("₱1000 M · ₱1200 N"); picking a member from the dropdown auto-selects the member rate.
  Verified BB ₱1000/₱1200, Pickle ₱500/₱700.
- **Playbook & Staff Hub** — rate displays and Quick Card now show member / non-member.
- **Worker** payment (walk-in) uses the non-member price.

**Member dropdown fixed + source-tagged.** It was empty on a fresh device; now it aggregates
members from the dashboard store and the synced workbook, each labelled by where they came from
(BASKETBALL / VOLLEYBALL / PICKLEBALL / NXGEN / COURT), and shows a clear empty-state pointing to
the dashboard/Sync when none are on the device yet. Verified: "Jeanine Alcantara · PICKLEBALL",
"Juan Dela Cruz · BASKETBALL".

Note: full cross-platform member unification (one shared roster every page writes to, NXGEN
import) is still partial — take-payment reads all local sources, but a single canonical member
store is a later pass.

---

## 2026-09-05 (session 16) — Take Payment: charge a court rental to a member's tab

`take-payment.html` gains a **member dropdown** and a **"Charge to Tab"** method (Cash / GCash /
Tab). Members are loaded from `fae-dashboard-data` + the synced `fae-members-v1`; picking one
auto-fills the renter name. On collect with Tab, the court amount is charged to that member's tab
in `fae-dashboard-data` (tabBalance + a ledger entry, method `tab`) — so it shows in the dashboard
member ledger and can be removed there with the void button. Tab requires a member (guarded), and
warns if the member isn't in the dashboard data yet. Verified: Basketball 1.5h → member tab
₱1,350, ledger entry added, log method Tab.

---

## 2026-09-05 (session 15) — Dashboard schedule/inventory/nav fixes + member-tab drinks + void

Five requests, all verified.

- **Live schedule in the dashboard.** The Court Schedule view now shows a parsed "Today · Live
  Bookings" table (time / renter / amount / status) read from the FAE week tab — the same live
  parse the console uses — above the embedded Sheet. Refreshes when the view opens; visible to
  all roles (schedule is not money). Verified front-desk sees "live · week of 2026-08-30".
- **Inventory returned to front desk.** RBAC had dropped inventory from the front-desk view;
  added it back (they run the drinks count). `fae-core.js` bumped to `?v=2` on all three includes
  so the change beats browser cache — matters for office updates too.
- **Back to Command Center.** Added a "← Home" pill at the start of the dashboard tab strip and a
  "home" link in the role badge, both to `console.html`.
- **Member tab ↔ drinks, one synced action.** The Tab modal now has "Charge a drink to this tab":
  pick a drink + qty → it draws down the drinks count (inventory `sold`), records a Tab sale in
  the sales log, charges the member's tab, and adds a ledger line — all in one call, then saves
  and re-renders. Verified 2× Water: stock 5→3, tab ₱0→₱40, logged as Tab + ledger.
- **Remove an accidental transaction.** Each member-ledger row now has an × that voids the entry:
  reverses the tab (or wallet) balance and, for a drink charge, puts the stock back (the ledger
  entry is tagged with drink+qty for this). Verified the double-order case: two 2× charges →
  tab ₱80/stock 1, void one → tab ₱40/stock 3.

---

## 2026-09-05 (session 14) — Online sync backbone (offline outbox → configurable endpoint)

The last big item: worker submissions can now auto-send online, not only as a QR hand-off.
Built credential-driven (no secrets hardcoded) so it is safe and works the moment an endpoint
is set.

- **`fae-core.js` outbox.** Submissions queue to `fae-outbox`. `pushOutbox()` POSTs each pending
  item as JSON to the configured endpoint (`config.sync = {endpoint, key, enabled}`), sends the
  key as `apikey` + `Bearer`, marks sent items synced, and keeps failures queued (no data loss).
  Auto-flushes on the browser `online` event.
- **`worker.html`.** On submit it enqueues and tries to push; a status bar shows grey (device
  only) / green (synced) / gold (waiting) / red (offline queued) with a "Sync now" button.
  Verified: enqueue works, a failed POST keeps the item pending, a stubbed 200 marks it synced
  and turns the bar green.
- **`settings.html` → Online Sync.** Endpoint URL, optional API key, and an auto-send toggle,
  saved to `fae-config-v1.sync`. Verified persist.
- **`SYNC-SETUP.md`** — how to point it at Supabase REST, a Google Apps Script web app, or a
  Lovable edge function, plus the JSON payload shape and honest client-side limits.

Nothing sends until the owner sets an endpoint; until then it stays on-device with the QR
hand-off. This closes the offline↔online loop from the worker side (one-way, submissions out).

---

## 2026-09-05 (session 13) — Live cash flow (dashboard reads the income sheet)

The dashboard Cash Flow view now shows **live** figures instead of only a static snapshot.
- A "Live Income" card fetches the FAE Sheet's INCOME DASHBOARD tab (gid 1336326927, same
  workbook the schedule reads) and renders the weekly Collected / Outstanding / Cash / GCash /
  Bookings, with four KPI tiles totalling them. Verified live: 12 weeks, Collected ₱452,350,
  Outstanding ₱2,000, Cash ₱105,700, GCash ₱171,300.
- Adds "Desk collections today (this device)" from `fae-takepayment-log` (cash/GCash split).
  Fixed a timezone bug: the day match now uses the local business day, not the UTC date slice.
- Master/admin(with money) only; hidden for others; falls back to a message on `file://`.
  The old hardcoded table stays below, labelled HISTORICAL SNAPSHOT.
- Refresh fires whenever the Cash Flow view opens (universal go() hook, works for master too
  whose go() is otherwise un-wrapped). Zero console errors.

---

## 2026-09-05 (session 12) — Data-layer merge: one source for members, invoices, rates

Closed the three integration gaps from session 11's function test.

- **Members (`fae-members-v1` → dashboard).** `faeMergeLocal()` folds pickleball-synced members
  into the dashboard `members` array (dedup by id) and re-renders. Verified a synced member
  appears in the Members view.
- **Invoices (`fae-invoices-v1` → dashboard).** Desk Take-Payment invoices merge into the
  dashboard `invoices` ledger (dedup by number) and re-render, so collected money is visible in
  the Invoices view (master/admin). Verified FAE-INV row + ₱1,350 amount.
- **Rates (`fae-config-v1` → playbook + staff).** Playbook rate cards, its Quick Card, and the
  Staff Hub booking-flow rate line now read the court rates from Settings. Verified all show
  ₱800 after setting it in config. (Fixed a load-order bug: the Quick Card update is deferred to
  DOMContentLoaded since it sits later in the page.) The merge runs before the dashboard's first
  render (called at the top of the role gate).

Not court-rate stale risks, so intentionally left: payroll peso figures (wages) and scoreboard
peso figures (points). Still seed-based, noted for later: the Cash Flow revenue *chart* — desk
collections now show in the Invoices ledger but the cashflow chart totals still come from seed
data; wiring live collections into that chart is a deeper follow-up.

---

## 2026-09-05 (session 11) — Role-based access control + invoicing + pickleball sync

**NEW `assets/fae-core.js`** — shared config/session/role layer loaded by pages. Roles:
`master` (owner — all figures), `admin` (trusted — operations, no owner money by default),
`frontdesk` (schedule & incidents, never money). Helpers: `FAE.canSeeMoney()`, `allowedViews()`,
`landingView()`, session get/set, PIN check. Client-side only — stops staff *seeing* figures,
not real security (stated on screen).

**Dashboard RBAC.** A role sign-in (replaces the old name gate) sets the session; then:
- Master sees all 21 tabs. Admin sees 16 operational tabs — **zero money views** (cashflow,
  payroll, exports, wallet, overview hidden). Front desk sees 5 (schedule, members, incidents,
  rentals, data). Verified each role.
- `go()` is wrapped so any blocked view redirects to the role's landing (front desk → schedule,
  admin → members, master → overview). A role badge (bottom-right) shows the role with Switch.
- Fixed a self-inflicted bug: the injected role markup had dropped the `>` closing the tab
  `<nav>`, swallowing the Overview pill — restored, master now sees all 21.

**Console money-gating.** Loads fae-core; the "Expected today" cash tile shows the real live
figure only for master (and admin if enabled), else "••• owner view only". Verified both ways.
This also satisfies "the live schedule numbers correspond to the figures" — master sees the
real ₱ pulled from the Sheet.

**Settings — Access & Roles.** New section to set the Admin PIN, an optional Front-desk PIN, and
an "Admin may see income figures" toggle, saved into `fae-config-v1.roles`. Verified persist.

**Invoicing (`take-payment.html`).** Auto-generates a transaction invoice on checkout —
`FAE-INV-YYYYMMDD-NN` (resets daily, verified -01→-02), business header from Settings, lines +
TOTAL PAID, `[Email Digital Copy]` (mailto) and `[Print Physical Copy]` (print-only CSS). Stored
to `fae-invoices-v1`.

**Pickleball sync (`sync.html`).** Reads the pickleball workbook (`11Qbrw…EsBU`) — MEMBERS
(16 → `fae-members-v1`), RATE CARD (→ `fae-config-v1`, PB courts + peak rules), BOOKINGS_FEED,
and today's schedule via the same weekly-tab pipeline as basketball. Fixed two parse bugs
(sheet footnote rows leaking into members/courts). Console tile added.

**Function test (session 11).** All 15 pages load, HTTP 200, zero console errors. Fixed the
scoreboard blank-on-empty-roster defect (now shows missions/ladder + a pointer to add staff).
Still open — reported to user: `fae-members-v1`, `fae-invoices-v1`, `fae-takepayment-log` are
written but not yet read by the dashboard views (Members / Invoices / Cash Flow), and
`fae-config-v1` rates are not yet read by dashboard/playbook/staff/payroll/scoreboard (the
₱800-vs-₱900 stale-rate risk persists in those files). Data-layer merge is the next pass.

---

## 2026-09-04 (session 10) — Master Settings (single source of truth) + advertiser ad

**NEW `settings.html` — master-PIN editor for pricing & business info.** One place to edit the
numbers the whole Command Center reads from, so a rate is never hardcoded in five files again.
- Master PIN `2021` to unlock. Edits: business info (name, owner, phone, email, address, brands,
  DTI, tagline), court & equipment rates (basketball/volleyball/pickleball/scoreboard/ball/late
  fee), and the advertising packages (name/price/unit, add/remove rows).
- Saves to a shared config key `fae-config-v1`. Defaults pre-fill from the official rate card
  (business info) and the current live tools (court rates).
- `take-payment.html` and `worker.html` now read court rates from `fae-config-v1` when present,
  falling back to their built-in defaults. Verified end to end: set basketball/volleyball to
  ₱800 in Settings → Take Payment immediately showed ₱800.
- Added a **Settings** tile to the console. Verified: wrong PIN blocked, correct PIN unlocks,
  edits persist, dependent tools update, zero console errors.

**Flagged: court-rate discrepancy.** The official rate card (Aug 4, Coach Jr) says ₱800/hr
basketball & volleyball; the live tools used ₱900/₱750/₱400. Not silently resolved — Settings is
now the place the owner sets the correct number once and everything follows.

**NEW `advertise.html` — the advertiser Media Kit (direction A, chosen).** A one-page
"Advertise at F.A.E. Court" sheet in the official brand (navy/red/gold, "EARNED NOT GIVEN"):
hero, weekly foot-traffic stats, why-advertise points, the package list, terms, and a contact
CTA, with a Save/Print-as-PDF button. **Fully config-driven** — it reads business info and the
advertising packages from `fae-config-v1`, so editing them in Settings updates the ad. Verified:
seeded custom packages + phone in Settings → the ad rendered exactly those. Added an
**Advertise at F.A.E.** tile to the console. Court rate left for the owner to set in Settings.

---

## 2026-09-04 (session 9) — Dashboard tweaks, QR worker-form, Take Payment, retire old versions

**Dashboard tweaks (all three requested).**
- Top tabs now show on **every** width, not just narrow — the sidebar is retired as the nav so
  the tab strip is the single, always-visible navigation. Verified tabs flex + sidebar hidden
  on desktop.
- **Mobile sign-in popup fixed.** The "Who's using the dashboard?" gate overflowed on a phone;
  the three role buttons now sit in one tidy row that fits, and the box stays inside the screen.
- **Pills reordered** daily-use-first: Dashboard, Schedule, Cash Flow, Members, Incidents,
  Payroll, Inventory, Court Rentals, Data Input, … reports last.

**NEW `worker.html` — phone submission form (QR).** Staff fill a form on their phone; it makes
a compact `FAE1.` code **and a QR** they show or send to the desk — no login, fully offline
(the QR library is bundled at `assets/vendor/qrcode.min.js`). Four types: Incident, Shift hours,
Payment (auto rate×hours), Note. A "Receive (desk)" mode decodes a pasted code back to a
readable submission to file. Verified full round-trip: incident → code → QR → decode; payment
auto-calc (Basketball×3h = ₱2,700). This is the offline half of the sync idea — data captured
offline, handed over as a code/QR.

**NEW `take-payment.html` — desk payment calculator.** Pick sport (₱900/₱750/₱400), step the
hours, live total, Cash/GCash, "Mark collected" with an **OR reminder**, and a running
this-device log with cash/GCash split. Verified Volleyball×2h = ₱1,500 logged with totals. The
console's Take Payment button now opens this instead of the members list.

**Retired the old versions (promoted new to canonical names).**
- `dashboard.html` is now the rebranded top-tabs version; `playbook.html` is the training doc;
  `READ ME FIRST.txt` is the multi-device rewrite. The previous `dashboard-v2.html` /
  `playbook-v2.html` names are gone (their content is now the canonical files).
- Every original is preserved in `_old/` (index, dashboard, playbook, README) — nothing deleted
  for good; restorable from there.
- Console links repointed to the canonical playbook; new **Scoreboard** and **Worker Submit**
  tiles added. `INSTALL-OFFICE.md` file list updated.
- Verified: all 12 pages return 200, every console link resolves, console loads clean in LIVE
  mode.

---

## 2026-09-04 (session 8) — Scoreboard: gamified flow + incentive system (scoreboard.html)

**New page `scoreboard.html`** — turns the daily flow into a light game that doubles as a
staff incentive system, as requested. Chosen modules: Daily Missions + Streaks, tied to a
reward ladder. Subtle/professional tone, gold/black to match the console. Linked from a new
"Scoreboard" tile on the console home.

- **Points from real activity, not invented.** Reads (never writes) the Staff Hub
  (`fae-staff-v1`) and Payroll (`fae-payroll-v1`) data and scores: completed tasks in submitted
  days, a bonus for a fully-complete day, on-time hour confirmations, and streak milestones.
  Verified the maths on seeded data: 57 tasks + 4 perfect days + 2 confirms + a 6-day streak
  computed to exactly 750 points.
- **Daily Missions** — the 11 Start/Shift/End tasks shown as today's missions with XP; reads
  the same tick state as the Staff Hub. Carries its own copy of the default task list so
  missions render even before the Staff Hub has been opened on a device.
- **Streak + 14-day heatmap** — consecutive clean days, with a heatmap that shows clean
  (gold), submitted (dim gold), missed-but-scheduled (red) and off (blank) days at a glance.
- **Reward ladder (the incentive)** — points climb tiers the owner defines; each rung shows
  unlocked/locked and the page tells the employee how many points to the next reward. Default
  ladder provided (free drink → snack/load → half-day or bonus → employee of the month).
- **Owner edits the rewards** behind the master PIN `2021`; the ladder saves to
  `fae-scoreboard-v1`. Verified: wrong PIN blocked, correct PIN unlocks, edits persist and
  re-render.
- **Quiet owner overview** — a points/streak table across the team (not a loud leaderboard,
  since standings weren't chosen).
- **Honest limit stated on the page:** points are per-device; fair cross-device standings need
  the offline/online sync still queued.

---

## 2026-09-04 (session 7) — Business dashboard: rebrand + bottom tabs (dashboard-v2.html)

Built **alongside** the original — `dashboard.html` is untouched; the new work is
`dashboard-v2.html` so the two can be compared before either is retired.

**Fixed the "can't see the bottom tabs" bug.** The dashboard's only navigation was a left
sidebar that runs `transform:translateX(-100%)` on narrow screens — it slid fully off-screen,
reachable only via a hamburger, so in the app's narrow pane the whole menu vanished. There
were never any bottom tabs.

**Added a top scroll-tab strip (chosen direction: C).**
- All 21 pages as labelled pills in a horizontal, swipeable row pinned to the top of the
  screen on ≤900px: Dashboard, Cash Flow, Schedule, … Export & Reports. Nothing is hidden in
  a menu; you scroll sideways to any page, and the active pill scrolls itself into view.
- The tabs drive the existing `go()` view switcher, so every destination and its render hooks
  keep working. Verified: switching to Payroll and Incidents changes the active view, the
  active pill highlights, zero console errors, 21 pills present.
- On wide screens (≥901px) the sidebar shows as before and the strip hides. On narrow the
  sidebar is forced off, the old hamburger is hidden, and the strip appears — navigation is
  always visible.
- (An earlier build of this file used bottom tabs; switched to the top scroll strip on
  request.)

**Full rebrand to the command center look.**
- Remapped the dashboard's CSS palette variables from the old orange theme to the console's
  void-black `#050507` + gold `#C9A227`, so every element driven by those variables recoloured
  at once. Also replaced the ~13 hardcoded orange values (gradients, drop-shadows, inline
  styles) and the stray blue.
- Switched the type to Archivo / DM Sans / JetBrains Mono to match the console.
- Verified: computed `--accent` is `#C9A227`, body background is void black, base font is
  DM Sans, and the sign-in gate, KPI cards, revenue chart and payroll page all render in the
  new palette.

**Not yet decided:** whether `dashboard-v2.html` replaces `dashboard.html`. Left both in place.

---

## 2026-09-04 (session 6) — Icons, console as home screen, On-Shift fix

**Fixed a defect in the new console.** The "On Shift" panel read the wrong data shape —
it treated `DB.shifts` as a flat array and looked for `sh.date`/`sh.staffId`, but Staff Hub
stores `DB.shifts` as an object keyed by date holding `{empId, name, blockId, start, end}`.
Against real data the panel would always show empty. Corrected to read
`DB.shifts[today]`, map `blockId` (A/B/C/X) to its label, and resolve the name from the
shift record or the Payroll roster. Verified end to end with a seeded shift.

**Icons — replaced emoji with IconaMoon-style Light line icons (console + playbook).**
- The four home-screen action buttons now use inline SVG line icons (calendar, alert,
  people, payment card) instead of emoji, gold/dark-tinted to the brand. Inline SVG means
  they render identically on every machine and need no internet.
- The playbook print button uses a matching printer icon.
- The `₱` peso signs in prices are currency text, left as-is.

**Made the console the real home screen.**
- The previous `index.html` is preserved for comparison at
  `_old/index-original-2026-09-01.html`; the old playbook and README are in `_old/` too.
- `index.html` is now a small redirect to `console.html`, so every existing "home" link in
  payroll, schedule and staff lands on the console without editing those original files.
- The launcher already opens `console.html` directly.
- Console version stamp bumped to `console v1.1 · 2026-09-04`.

**Queued for their own turns (chosen but not yet built):** an offline/online model where
staff create tickets and records offline that submit automatically when back online (needs a
design pass — mainly the submission target); a Take Payment rate calculator; and splitting
the 347 KB `dashboard.html`.

---

## 2026-09-03 (session 5) — Operator Console, training playbook, audit system, office install

Built for the office install. **Nothing was overwritten** — every new page sits alongside the
old one so they can be compared before anything is deleted.

**console.html — NEW home screen (replaces index.html once approved)**
- The home screen is now a status report rather than a menu. Four tiles across the top:
  court right now, next booking, booked today, expected cash — each carrying a source badge
  saying whether the number is shared across devices or local to this machine.
- Reads the live court schedule straight from the Google Sheet, picks the right weekly tab
  by today's date, merges consecutive 30-minute slots into one booking block, and marks each
  as ON COURT / IN n MIN / DONE with its payment status.
- Kiosk-sized action buttons: Today's Schedule, Log an Incident, Staff Hub, Take Payment.
- On-shift table from the Staff Hub, self-resetting daily checklist, type-to-jump bar
  (`schedule`, `incident`, `staff`, `payroll`, `dashboard`, `nxgen`, `playbook`, `rates`, `sheet`).
- Version stamp in the footer so a stale copy on another PC is obvious at a glance.

**Discovered and designed around: Google blocks the Sheet read from `file://`.**
Opening a page straight from the folder sends `Origin: null`, which Google answers without an
`Access-Control-Allow-Origin` header, so the fetch fails. Served over `http://127.0.0.1` it
succeeds. The console detects which mode it is in and says so — green LIVE chip or gold
LOCAL ONLY chip — and degrades cleanly instead of showing blank tiles.

**START-COMMAND-CENTER.bat — NEW one-click launcher**
- Finds Python, picks a free port, starts a local server and opens the console in the browser
  with live mode on. Explains itself in plain language if Python is missing.

**playbook-v2.html — NEW training doc (replaces playbook.html once approved)**
- The whole job in one page, written to be read once by a new hire in about ten minutes:
  the one rule (log it immediately), where records live, the 8-step renter flow lifted
  verbatim from the Staff Hub, opening/during/closing shift sequences, the six-step money
  path, incident types and what to capture, who decides what, the escalation ladder, the
  paper fallback for when the PC or internet is down, and a printable Quick Card.
- Print stylesheet included; the Quick Card starts on its own page.

**logs/AUDIT.md — NEW standing audit sheet**
- Seven daily checks (front desk), seven weekly (master), eight monthly (owner), each with a
  pass condition and sign-off columns. Includes how to record a failed check rather than
  leaving a box blank.

**logs/INSTALL-LOG.md — NEW**
- One row per machine: location, date, installer, browser, version stamp, whether live mode
  works. Plus an update log and the pre-update backup procedure.

**INSTALL-OFFICE.md — NEW**
- Ten-minute install walkthrough, live vs basic mode, shortcut, one-browser rule, what is
  shared vs per-device, backups, how to register next week's Sheet tab, and a symptom/cause/fix
  table.

**Verified on a real server before release**
- All seven existing pages load with zero console errors.
- Today's real booking parsed correctly end to end: Lexi Victorino, 7:00–10:30 PM, ₱2,700,
  Paid GCash, shown as IN 9 HR.
- Ruled out two suspected bugs: the duplicate element IDs in `dashboard.html` are separate
  modal templates that are never in the DOM together, and the Staff Hub roster contract with
  Payroll is correct — both use `fae-payroll-v1` with matching shapes, confirmed by seeding a
  roster and watching inactive staff be excluded.

**Known limits, stated plainly**
- Live status needs the launcher. Double-clicking `console.html` gives everything except the
  Sheet-driven tiles.
- Local data still does not sync between machines. That is why every number now carries a
  source badge and why the rule is printed everywhere: if it must match on every device, it
  does not live in this folder.
- A new weekly tab in the Sheet must have its gid added to `WEEK_TABS` in `console.html`.
  This is weekly audit check W7.

---

## 2026-09-01 (session 4) — Staff Hub (employee scheduling & daily flow)

**staff.html — NEW page for employees**
- Sign-in by name. The roster is read from the Payroll file (`fae-payroll-v1`), so
  staff are never entered twice. Master unlocks all editing with PIN `2021`.
- **My Day:** today’s shift block, start, end and computed duration (handles shifts
  that cross midnight). Employee taps "These hours are correct" or "Something’s
  wrong" + a note; both go to the Master queue stamped with name and time.
- **Month:** full month grid, own shifts highlighted, court/league events, weekday
  repeat-to-month-end, print view. Master-only editing.
- **Daily Tasks:** 11 default tasks grouped Start / During / End of shift. Submitting
  locks the day under the submitter’s name and records anything skipped. Only Master
  can reopen a locked day.
- **Drinks Count:** start- and end-of-shift fridge count over the 10 real products
  from dashboard.html. Computes sold and expected pesos, flags impossible counts.
- **Booking Flow:** the 8-step process for handling a renter.
- **Master queue:** hour disputes, missed task days and stock shortages in one list.
- Export / Import JSON backup. Shift blocks give 24-hour coverage:
  A Morning 06:00–14:00, B Afternoon 14:00–22:00, C Graveyard 22:00–06:00, plus Custom.

**Bugs caught during testing and fixed before release**
- Review queue flooded with "missed day" alerts for dates before the hub existed.
  Now only flags days on or after first use, and only when staff were scheduled.
- An impossible fridge count (more bottles at the end than the start) was being
  subtracted from the totals, understating expected cash — ₱105 shown where ₱285 was
  correct. Miscounts are now excluded from totals and flagged for recount instead.
- Enter key did not submit the Master PIN; group header read "Shift of shift".

**index.html**
- Added the "Staff Hub" tile under Court Operations.

**Known limits**
- Saves to one browser on one device. Export a backup to move it. Real multi-device
  sync is the live site, not this folder.
- The PIN stops accidental edits; it is not security. Anyone opening the file in a
  text editor can read it.
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
