# F.A.E. Staff Hub — Design

Date: 2026-09-01
Status: approved by owner, building

## Problem

Employees have no single place that tells them when they work, what they must do
during the shift, and what the month ahead looks like. Shift hours are disputed
after the fact, daily duties are done from memory, and the drinks fridge is
counted inconsistently so shortages surface late. The owner needs to be the
single master who sets all of it, and needs the result presentable.

## Scope

One new self-contained page, `fae-command-center/staff.html`, plus a tile on
`index.html`. Nothing existing is modified or replaced.

## Modules

1. **Sign in** — employee taps their name. Roster is read from the payroll key
   `fae-payroll-v1` so staff are never entered twice. A **Master** button
   unlocks every edit control behind PIN `2021`.
2. **My Day** — today's shift block, start, end, computed duration (handles
   overnight wrap), position, and who else is on. Employee taps *Hours are
   correct* or *Something's wrong* + note. Both land in the Master review queue
   stamped with name and time.
3. **Month** — full month grid, shift chips per day, employee's own shifts
   highlighted, court/league events, month navigation, print view. Master taps a
   day to assign shifts and events; employees are read-only.
4. **Daily tasks** — fixed checklist for the day, ticked through the shift, then
   **Submit day**, which locks it and records who submitted, when, and what was
   left unticked. New list each calendar day. Unsubmitted past days show red in
   Master history.
5. **Drinks count** — start-of-shift and end-of-shift count against the product
   list. Computes sold, expected pesos, and variance. Variance is flagged to
   Master. Product list is seeded from `dashboard.html`'s list and is
   Master-editable; the page never writes to dashboard data.
6. **Booking flow** — the step-by-step a staffer follows when a renter arrives.

## Shift blocks

24-hour coverage, three 8-hour blocks plus custom:
A Morning 06:00–14:00, B Afternoon 14:00–22:00, C Graveyard 22:00–06:00.

## Data

Single key `fae-staff-v1`. Reads `fae-payroll-v1` (roster) and
`fae-dashboard-data` (products) read-only. Export/Import JSON for backup and
moving between devices.

## Known limits (stated to the owner)

- The PIN is a speed bump against accidental edits, not security. Anyone who
  opens the file in a text editor can read it. Real access control is the live
  Supabase site.
- Storage is one browser on one device, the same constraint as the rest of the
  hub. Two staff on two phones keep two separate copies. Genuine home-to-court
  sync is the live site, a separate job.

## Verification

Open in a browser and click through every module: sign in, confirm hours, flag
an issue, navigate months, assign a shift as Master, submit a task day, enter a
drinks count that produces a variance, export and re-import.
