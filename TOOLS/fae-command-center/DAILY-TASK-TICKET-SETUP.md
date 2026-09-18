# Daily Task Ticket — how staff get it and send it

Two sides: the **office computer** runs it, the **staff phones** use it.

---

## Part 1 — Office computer (one-time, 5 minutes)

1. Double-click **`START-COMMAND-CENTER-WIFI.bat`** instead of the plain launcher.
2. Windows asks *"Allow access?"* the first time → tick **Private networks** → **Allow**.
   Missed it? Right-click **`ALLOW-WIFI-FIREWALL.bat`** → *Run as administrator*, once.
3. The black window prints two addresses. The second one is the one that matters:

   ```
   On THIS computer :  http://127.0.0.1:8765/console.html
   On a PHONE       :  http://192.168.1.10:8765/tasks.html     <-- this one
   ```

4. The same window prints an **OFFICE CODE** (4 digits, e.g. `9881`). Staff type it once
   on their phone; it is what stops a customer sitting on your Wi-Fi from filing junk
   tickets. Give it to staff only. To change it, edit `data\staff-code.txt` and restart.
   You can also read it any time on **Dashboard → Daily Tickets**.
5. Open **Staff QR Sheet** from the console, check the address at the top matches the
   *On a PHONE* line, then **Print**. Tape it by the door and inside the office.

**Leave the black window open** while the business is running. Closing it stops the phones
from sending. Nothing is lost if it is closed — the phone holds the ticket and sends it the
next time it can.

---

## Part 2 — The employee (every shift)

1. Connect to the **office Wi-Fi**.
2. Point the phone camera at the QR sheet, tap the link. (Tell them to bookmark it — after
   the first time they never need the QR again.)
3. First time only: the form asks for the **office code**. Type it once — the phone
   remembers it.
4. The strip at the top of the form says **"Connected to the office computer"** in green.
   That is the promise that Submit will work.
5. Pick their name → **TIME IN** on arrival.
6. Tick tasks through the shift. It saves as they go — they can lock the phone.
7. **TIME OUT** → write what they accomplished → **SUBMIT**.
8. They see *"Received by the office computer. Salamat!"*

---

## Part 3 — The office reads it

**Business Dashboard → Daily Tickets.** Tickets appear on their own (the page checks every
25 seconds), or press **Check Phones**. You get time in, time out, hours, the tasks ticked,
what they wrote, and anything they flagged as broken. **Approve** each one when you have
read it.

Every submitted ticket also lands as a file, with no software needed to read it:

```
data\tickets\TKT-20260906-A4X9.json      the full record
data\tickets\FAE-tickets-2026-09-06.csv  one row per ticket — open in Excel
```

The CSV is the file to check against payroll at the end of the week.

---

## When the phone is NOT on office Wi-Fi

The form still works — it saves on the phone and shows a **ticket code**.

The employee taps **COPY CODE** and sends it to you by Messenger or SMS.
You: **Daily Tickets → Paste Ticket → Import.** Same result.

This is also the fallback if the office PC is off. Nothing is ever lost; it is only delayed.

---

## Troubleshooting

| What they see | What it means | Fix |
|---|---|---|
| Page will not open at all | Phone is on mobile data or a different Wi-Fi | Switch to the office network |
| Page opens, strip is **gold** ("not connected") | The office PC is running the plain launcher, or is off | Restart it with `START-COMMAND-CENTER-WIFI.bat` |
| Page opens on the PC but not on phones | Windows Firewall is blocking | Run `ALLOW-WIFI-FIREWALL.bat` as administrator |
| QR sheet shows `127.0.0.1` | It was printed from the wrong address | Reopen the QR sheet in Wi-Fi mode, type the *On a PHONE* address, reprint |
| The IP keeps changing | The router hands out a new address after a reboot | Ask the internet provider to reserve a fixed IP for the office PC, then reprint the QR once |
| **"Wrong office code"** | The phone has the old or a mistyped code | Read the current code off the launcher window or Daily Tickets, retype it on the phone, press Submit again — nothing is lost |
| Launcher warns the address "does not look like an office Wi-Fi address" | The PC is on a VPN, or plugged into the wrong network | Turn the VPN off and restart the launcher; the address should start with `192.168.` or `10.` |

---

## Worth knowing

- The office code is a **gate, not a lock** — anyone who watches a staff member type it knows
  it. It stops idle mischief, not a determined person. Income figures are **not** on this form
  and never travel to a phone: they stay behind the master sign-in on the dashboard.
- Reading the staff log is restricted to the office computer itself. A phone on the Wi-Fi can
  only *send* a ticket; it cannot pull down everyone's hours.
- This runs with no internet at all. If you also want to read tickets from home, set up the
  Google Sheet endpoint in `SYNC-SETUP.md` — the two work together, the ticket goes to both.
