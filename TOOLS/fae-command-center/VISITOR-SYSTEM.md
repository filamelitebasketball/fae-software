# Visitor sign-in & who is in the building

Two screens and one rule: **an adult registers once, and the youth they bring are
attached to them.** That link is what lets the front desk answer "whose child is
this?" and "is anyone still inside?" without a second system.

---

## The pieces

| Screen | Who uses it | Where |
|---|---|---|
| **register.html** | The visitor, on their own phone | QR taped by the door |
| **checkin.html** | Front desk / a tablet at the door | Office PC or door tablet |
| **Dashboard → Visitors** | Owner and admin | Business Dashboard |

All three read and write the same records, so nothing needs re-typing.

---

## Setting it up (once)

1. Start the Command Center with **`START-COMMAND-CENTER-WIFI.bat`**.
2. Open **Staff QR Sheet** from the console.
3. In the **SHEET** dropdown pick **Visitor Sign-In (door)**.
4. Check the address is the *On a PHONE* one (starts `192.168.` or `10.`), then **Print**.
5. Tape it at the entrance, at eye level.
6. Open **checkin.html** on the front-desk PC or a tablet and leave it up all day.

The visitor sheet needs **no office code** — visitors are not staff. Only the daily
task ticket asks for one.

---

## What the visitor does

1. Scans the QR, taps the link.
2. If they have been before: types their mobile number, taps **Find my record** —
   everything comes back, including their children.
3. Otherwise: name and mobile (required), then email, address and an emergency contact.
4. **+ Add another child** for each youth they are responsible for — name, age, and a
   note like a team or an allergy.
5. Ticks the consent box and presses **REGISTER**.
6. They get a household ID (`HH-20260906-A4X9`). They never need it — their name is enough.

Phone numbers are matched loosely on purpose: `0917 555 1234`, `+63 917 555 1234` and
`639175551234` all find the same family, so nobody gets registered twice.

---

## What the front desk does

On **checkin.html**:

- Type any part of a name (or a phone) — matching people appear as big tiles.
- **Tap a tile** to flip that person between IN and OUT. Green border = inside.
- A youth's tile shows **"with Maria Santos"** so you always know who brought them.
- **Check in whole family** appears when the matches are one household — one tap for
  everyone who arrived together.
- **UNDO LAST** reverses a wrong tap. No password, because wrong taps happen constantly.
- Nobody found? The card links to the registration form.

The top strip always shows **how many people are inside and how many of them are youth.**
That is the number that matters in a fire drill.

---

## What the office sees

**Business Dashboard → Visitors**:

- Households, people registered, youth on file, who is inside now, youth inside, movements today.
- The full register: adult, contact details, emergency contact, and the youth attached.
- Today's in/out log with a × on each row to remove a wrong movement.
- **Edit** or **Delete** any household.
- **CSV / Excel** export of the whole register.
- **Refresh** pulls in anything registered on the door tablet.

---

## Where the files land

```
data\visitors\
   HH-20260906-A4X9.json          one file per household (the current truth)
   FAE-visitors-2026-09-06.csv    a log of registrations, for Excel
data\checkins\
   checkins-2026-09-06.json       today's movements
   FAE-checkins-2026-09-06.csv    the same, for Excel
```

---

## Privacy — read this part

You are collecting **children's names and ages**. Under the Philippine Data Privacy Act
that makes the business a personal information controller. What the system already does:

- The consent box is required, and says plainly what the details are for.
- Personal details **never leave the office computer**. A phone on the Wi-Fi can *send* a
  registration but cannot read the register back — `/fae-visitors` and `/fae-checkins`
  answer the office PC only.
- Every deletion is recorded in **Dashboard → Removed**, so a record cannot quietly vanish.

What is still on you:

- **Only collect what you use.** Address and email are optional for a reason.
- **Answer deletion requests.** A parent can ask you to remove their family; the Delete
  button on the Visitors tab does it.
- **Do not print the register** and leave it on the counter.
- **Back it up** (Registry → Back up everything) and keep the backup somewhere locked.
- If you later put this online, that is a different risk level — get advice first.

---

## Fixing mistakes

Everything in this system can be undone by the person standing there:

| Mistake | Fix |
|---|---|
| Tapped the wrong person IN | **UNDO LAST** on the kiosk, or the × on the dashboard log |
| Family checked in twice | The tile is already green — tapping again checks them OUT; use Undo |
| Registered the same family twice | Open Visitors, **Delete** the duplicate |
| Wrong phone number typed | Visitor re-runs *Find my record*, or the office presses **Edit** |
| Child added to the wrong adult | Edit the household and remove the row, then add them to the right one |

Every one of those is written to **Dashboard → Removed** with who did it and why.
