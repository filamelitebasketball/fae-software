# F.A.E. Registry Database — `data\`

This folder is the **file copy** of everything the Command Center records.
The software runs in the browser and keeps its live data in the browser's own
storage; this folder is where that data gets written out so it survives a
cleared cache, a new computer, or a browser update — and so you can open it in
Excel any time without the software running.

Open **`registry.html`** (console tile: **Registry Database**) to write files here.

---

## Folder layout

```
data\
  members\    FAE-members-YYYY-MM-DD.csv     every member, tagged by category
  tickets\    FAE-tickets-YYYY-MM-DD.csv     daily task tickets (time in/out, tasks)
  payments\   FAE-payments-YYYY-MM-DD.csv    desk collections + invoices  (owner only)
  stock\      FAE-stock-YYYY-MM-DD.csv       drinks / inventory levels
  backups\    FAE-full-backup-YYYY-MM-DD.json   everything in one restorable file
```

## How files get here

| Way | What happens |
|---|---|
| **Save to data folder** button | Chrome/Edge opens a Save dialog — point it at the right sub-folder. Works when the Command Center is opened over `http://localhost` (the `START-COMMAND-CENTER.bat` way). |
| **CSV / Excel** button | The file lands in your **Downloads**. Move it into the matching sub-folder. |
| Any browser on a phone | Downloads only — send the file to the office PC and file it here. |

## The columns

**members** — `ID, Name, Category, Status, Phone, Email, NFC, Wallet, Tab, Programs, Joined, Source`
`Category` is where the member came from: NXGEN, BASKETBALL, VOLLEYBALL, PICKLEBALL, COURT RENT, MEMBER.
`Source` says which store on the device the record came out of (dashboard / sync / registry).

**tickets** — `Ticket, Date, Employee, Position, Shift, TimeIn, TimeOut, Hours, TasksDone, TasksTotal, Accomplished, Issues, Status, SubmittedAt`
One row per employee per shift. `Hours` is computed from the two stamps, so it is
the honest figure to carry into payroll.

**payments** — `Ref, Date, Payer, Item, Method, Amount, Status`
Only visible when signed in as **master** (or an admin you have trusted with money).

**stock** — `Item, Category, OnHand, Price, Low`

## Backups

`FAE-full-backup-*.json` holds every store in one file — members, tickets,
invoices, stock, payroll, settings and the pending sync queue.
Restore it from **Registry Database → Restore from file**.

**Keep two copies.** One here, one off the computer (Google Drive, a USB stick, or
the office phone). A backup that only exists on the machine that broke is not a backup.

## Rules of thumb

- Back up **at the end of every week**, and always before an update.
- Do not hand-edit the CSVs and expect the software to read them back — the CSVs
  are for Excel and the Google Sheet. Use the **JSON backup** for restoring.
- `payments\` contains income figures. Treat that sub-folder the way you treat the
  cash box.
