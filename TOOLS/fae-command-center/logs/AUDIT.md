# F.A.E. Command Center — Standing Audit Sheet

What gets checked, by whom, and how often. Print a month at a time and sign each line,
or keep it here and fill in the date and initials.

An audit is not an accusation. It is how a short count stays a small problem.

---

## Daily — Front Desk, every shift

| # | Check | Where | Pass condition |
|---|---|---|---|
| D1 | Cash float counted before first payment | Drawer | Matches the closing count from the previous shift |
| D2 | Every booking on the Sheet was confirmed against the person | Google Sheet | No booking played without being matched |
| D3 | Every payment marked with amount and method | Google Sheet, status column | No blank status on a slot that played |
| D4 | Fridge count taken at start and at end | Staff Hub | Both counts recorded, end ≤ start |
| D5 | Daily tasks submitted | Staff Hub | Day locked under the submitter's name |
| D6 | Closing cash count matches what was marked paid | Drawer vs Sheet | Difference is ₱0, or an incident was filed |
| D7 | Incidents filed same-shift | Command Center | Nothing carried over to the next day |

**Sign-off**

| Date | Shift block | Staff | D1 | D2 | D3 | D4 | D5 | D6 | D7 | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
|  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |  |  |

---

## Weekly — Master, same day each week

| # | Check | Where | Pass condition |
|---|---|---|---|
| W1 | Every day of the week has a locked task submission | Staff Hub, Master queue | No unexplained missed days |
| W2 | Hour disputes cleared | Staff Hub, Master queue | Queue empty, or each item has a decision |
| W3 | Stock shortages reviewed | Staff Hub, drinks count | Every flagged miscount recounted, not written off |
| W4 | Week's collected total agrees with the income tab | Google Sheet | Difference explained in writing |
| W5 | Outstanding balances chased | Google Sheet, outstanding column | Each one has a name and a next action |
| W6 | Incident log read end to end | Dashboard | Nothing open without an owner |
| W7 | Next week's tab exists in the Sheet | Google Sheet | Tab created, and its gid added to `console.html` |

**Sign-off**

| Week of | Master | W1 | W2 | W3 | W4 | W5 | W6 | W7 | Notes |
|---|---|---|---|---|---|---|---|---|---|
|  |  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |  |

---

## Monthly — Owner

| # | Check | Where | Pass condition |
|---|---|---|---|
| M1 | Month's revenue reconciled: cash + GCash vs collected | Google Sheet income tab | Agrees, or the gap is documented |
| M2 | Payroll run matches recorded hours | Payroll · Staff Hub | Every payslip traceable to confirmed hours |
| M3 | Payroll audit trail reviewed | Payroll, audit tab | Every manual edit has an actor and a reason |
| M4 | Members and roles on the live site are current | Live site `/admin` | No stale access, no missing staff |
| M5 | Backups exported from every device in use | Each PC, Export backup | One JSON per device, dated this month |
| M6 | Every device runs the same version | Page footers | Version stamps match across machines |
| M7 | Repeat problems identified | Incident log | Any renter or fault appearing 3+ times has a decision |
| M8 | Rates and house rules still correct everywhere | Playbook, live site, printed card | All three agree |

**Sign-off**

| Month | Owner | M1 | M2 | M3 | M4 | M5 | M6 | M7 | M8 | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
|  |  |  |  |  |  |  |  |  |  |  |

---

## How to record a failed check

Do not leave a box blank and do not tick it anyway. Write the line, then:

1. File an incident describing what failed and the amount or count involved.
2. Note the incident reference in the Notes column.
3. Escalate per the Playbook — now, today, or this week.

A failed check that is written down is the system working. A blank box is the system failing.
