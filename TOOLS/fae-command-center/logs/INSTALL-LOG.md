# F.A.E. Command Center — Install Log

One row per machine that runs the Command Center. Fill this in at the moment of install,
not afterwards. When a machine is retired, mark it retired rather than deleting the row —
you may need to know where an old record came from.

The **Version** column is the stamp printed in the footer of `console.html`. If two machines
show different versions, one of them is stale and needs the folder copied across again.

| # | Machine / location | Installed on | Installed by | Browser | Version at install | Live mode? | Notes |
|---|---|---|---|---|---|---|---|
| 1 |  |  |  |  | console v1.0 · 2026-09-03 |  |  |
| 2 |  |  |  |  |  |  |  |
| 3 |  |  |  |  |  |  |  |

**Live mode?** — "Yes" if `START-COMMAND-CENTER.bat` runs and the console header shows the
green LIVE chip. "No" if the machine has no Python and opens `console.html` directly; that
machine cannot read the live court schedule and must use the schedule page instead.

---

## Update log

Record every time a machine is brought up to a newer version of the folder.

| Date | Machine | From version | To version | Done by | Backup exported first? | Notes |
|---|---|---|---|---|---|---|
|  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |

---

## Before updating any machine

1. On that machine, open the Staff Hub and **Export backup**. Local data does not travel with
   the folder — copying new files over the old ones does not move it, but a cleared browser
   would lose it.
2. Note the current version from the console footer in the table above.
3. Copy the new folder over.
4. Open `console.html`, confirm the new version stamp, and confirm the LIVE chip if that
   machine uses live mode.
5. Import the backup if anything is missing.

## Known per-device data

These are saved in the browser on one machine only, and are not shared:

- `fae-console-checklist` — today's front-desk checklist ticks
- `fae-staff-v1`, `fae-staff-user` — Staff Hub shifts, tasks, drinks counts
- `fae-payroll-v1`, `fae-salary-history` — payroll data and history
- `fae-dashboard-data`, `fae-current-user` — dashboard records and the signed-in name
