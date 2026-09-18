# Registry & privacy runbook

**Who this is for:** whoever manages the front desk. It covers what staff may and may not do
with the register, how to answer a parent who asks about their child's data, how long records
are kept, and what to do if something leaks.

**The short version:** we hold children's names. That raises the standard of care for
everything in this folder.

---

## 1 · Who is responsible

Fill this in — the law expects a named person, not "the office".

| Role | Who | What they own |
|---|---|---|
| **Personal Information Controller** | F.A.E. Sports Management Services | The business is legally the controller |
| **Person responsible for data privacy** | *set in Settings → Data Privacy* | Answers requests, decides on deletions, handles a breach |
| **Deputy** | *name someone* | Covers when the above is away |

Set the name and contact in **Settings → Data Privacy**. It appears automatically on the
public privacy notice, so a stale entry there blocks the very requests it invites.

> **Threshold to watch:** once you hold records for **1,000 people or more**, the National
> Privacy Commission expects registration as a personal information controller. Court rentals
> pass 1,000 faster than owners expect. The count is on the Visitors tab.

---

## 2 · What staff may see

Access is enforced by the software, not by trust. Do not work around it.

| | Front desk | Admin | Owner |
|---|---|---|---|
| Door kiosk — names, guardian link, who is inside | ✅ | ✅ | ✅ |
| Full register — address, email, health notes | ❌ | ✅ | ✅ |
| Consent status, retention, purge | ❌ | ✅ | ✅ |
| Income figures | ❌ | only if granted | ✅ |

**The door kiosk now needs a staff sign-in.** It lists every child by name with the adult
responsible for them — that is not a screen to leave open and unlocked on a counter facing
the public. Sign in once per shift.

### Rules for staff, in plain terms

1. **Never** read out a child's details, address or health note to anyone who is not the
   registered guardian.
2. **Never** photograph the screen or a paper register.
3. **Never** send a family's details over personal Messenger or SMS. Use the system's export.
4. A child leaves with the adult who signed them in, or someone that adult named. If in doubt,
   phone the guardian. Awkward beats wrong.
5. Health notes exist so a first aider can act. That is the only reason to open one.
6. If a parent asks you to delete their record — write it down, tell management the same day.
   Do not promise a timeline yourself; the standard is 15 working days.

---

## 3 · Consent — what we ask and why it is split

The registration form asks **four separate things**. That separation is the legal requirement,
not a design preference: consent must be specific, and it must be safe to say no.

| Tick | Required? | Covers |
|---|---|---|
| Terms, waiver & privacy notice | Yes | Risk of sport, emergency treatment, the privacy notice |
| Keep these details | Yes | Bookings, safety, emergencies |
| I am the parent or guardian | Yes, **when a child is listed** | The adult accepts the waiver for the child and stays responsible |
| Photos and video | **No** | Promotion and league coverage |

**If someone declines photos, nothing else changes.** Do not ask again, do not treat them
differently, and do not photograph their child. If you are ever unsure whether a face in a
photo has permission, do not post it.

**Health notes are optional and always were.** Never pressure a parent to fill that field.
It is sensitive personal information under the Act and it is stored on a stricter footing.

### What gets recorded
Every registration stores which version of the terms was accepted, when, whether the document
was actually opened, and each permission separately. "They ticked a box once" is not an
answer to a parent asking why we hold their child's name — this is.

**If you change the terms**, bump the version in `terms.html` *and* `TERMS_VERSION` in
`register.html`. Existing families will be asked to re-confirm on their next visit. That is
deliberate: an old yes is not a yes to new terms.

---

## 4 · Retention — what gets deleted, and when

| Record | Kept | Why that long |
|---|---|---|
| Visitor & child registration | 2 years after last visit | Long enough for a returning family, short enough to be defensible |
| Check-in / check-out log | 1 year | Evacuation and incident investigation |
| Incident & injury reports | 5 years; **for a child, until they turn 21** | A minor can bring a claim after reaching majority |
| Receipts & financial records | 10 years | Tax law |
| Photos with permission | Until permission is withdrawn | — |

Change the first two in **Settings → Data Privacy**. The Visitors tab shows what is past
retention and offers a reviewed purge.

**Purging is a monthly job, not an automatic one.** Nothing deletes itself — a machine
quietly destroying a family's record is worse than one that waits to be told. Put it on the
first Monday of the month:

1. Visitors tab → Retention card → **Review and purge**
2. Read the list. Anything you recognise as a live dispute or open incident, keep.
3. Confirm. The deletion is written to the **Removed** tab automatically.

---

## 5 · When someone asks about their data

A parent can ask for anything below, free, for themselves and their children.
**Target: 15 working days. Log every request.**

| They ask | You do |
|---|---|
| "What do you have on us?" | Visitors → find them → **Copy** — hands them a complete file |
| "This is wrong" | Edit the household, or have them re-register |
| "Delete us" | **Erase** on their row. Explain anything we must keep (an open incident, a receipt) and why |
| "Stop using our photos" | Untick photo permission, and take down what we still control |
| "I'm not happy" | Escalate to the privacy contact same day. They may also complain to the NPC |

**Check who is asking.** Only the registered guardian gets a child's record. If a caller
cannot confirm details already on file, do not read anything out — ask them to come in.

Keep a simple log: date, who asked, what they wanted, what you did, date closed. A folder of
notes is fine. Being able to show you answered is the point.

---

## 6 · If data leaks

A lost laptop, a stolen backup drive, an emailed register, a screen photographed and shared.

**Within the first hour**
1. Tell the privacy contact. Do not sit on it, and do not investigate alone first.
2. Write down what happened, when it was noticed, and roughly whose data was involved.
3. Stop the bleeding — change the master PIN, take the machine off the network, recover the drive.

**Within 72 hours**
Where the leak is likely to put people at real risk, the National Privacy Commission must be
notified within **72 hours**, and so must the people affected. Children's data in the wrong
hands is exactly the kind of case that clears that bar. If you are unsure whether it qualifies,
get advice immediately — the clock does not pause while you decide.

**Afterwards** — write down what changed so it cannot happen the same way twice.

---

## 7 · Keeping it safe day to day

- **Back up weekly** — Registry → Back up everything. Keep one copy off the machine.
- **The backup holds everything, including children's data.** Encrypt the drive or keep it locked.
  A backup on a USB stick in a drawer is a breach waiting to happen.
- **Change the master PIN** from the default, and change it when someone leaves.
- **Do not put this folder on public cloud storage** with sharing on.
- **Wi-Fi mode is deliberately one-directional**: a phone can send a registration but cannot read
  the register or the in/out log — those answer the office computer only. Keep it that way.
- **Lock the office PC** when you step away.

---

## 8 · Paper fallback

When someone has no phone, or the system is down:

1. Print `terms.html` and keep signed copies in a folder.
2. Take the same details on paper: adult name, mobile, emergency contact, each child's name and age.
3. Have the adult **sign and date**, and tick the same boxes — including the guardian
   confirmation if a child is listed.
4. Type it into the system the same day. Mark the source as "paper".
5. Keep the paper. A signature is stronger evidence than a tick.

---

## 9 · What still needs a lawyer

Honest limits — this pack was written as a working template, not as legal advice:

- **`terms.html` has not been reviewed by counsel.** The waiver especially. Under Philippine
  law a waiver cannot excuse the business from its own negligence, and any clause that tries to
  is void — the document says so, but a lawyer should confirm the wording holds for your setup.
- **Insurance.** Check that your public liability cover matches what the waiver assumes,
  particularly for minors.
- **NPC registration** once you pass 1,000 individuals.
- **Age of the guardian.** The form trusts that whoever registers is an adult. If unaccompanied
  teenagers become common, get advice on how to handle that properly.
- **CCTV**, if you install it, needs its own signage and notice.

Take this document and `terms.html` to a Philippine lawyer, get them adjusted, and print the
reviewed version. Until then, treat them as a good-faith starting point rather than a shield.
