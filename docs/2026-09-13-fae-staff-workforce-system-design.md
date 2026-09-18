# F.A.E. Staff Workforce System — Design

**Date:** 2026-09-13 · **Owner:** Coach Junior Raymundo (Owner/CEO) · **Approved:** yes (chat)

## Problem
FAE has strong training *content* (22-tab manual, deck, front-desk playbook) but no **gate** that verifies a person meets the standard before working solo. In PH work culture the failure modes are: wait-to-be-told, the silent nod (didn't understand, won't say), inconsistent standards, and no accountability trail. US-style "figure it out" fails; "here is the exact standard + here is how we check you hit it" works.

## The system — "The F.A.E. Way"
One repeatable method for every role.

**4-step deploy ladder** (nobody works solo until step 4 is signed):
1. Read & watch — read the role playbook, watch a senior do it.
2. Do-with-me — trainee does it, trainer beside them.
3. Teach-back — trainee *shows* the trainer ("show me how you'd handle X"), fixes the silent-nod.
4. Sign-off → solo — trainer + trainee sign a dated competency sheet.

**Three culture mechanisms in every playbook:** "when you're free, do this" list (kills idle), teach-back scenarios, printable competency sign-off (accountability trail).

## Org & sign-off chain
| Role | Playbook | Trained + signed by |
|---|---|---|
| Owner/CEO — Junior | — | — |
| Head Ops — Jazzy | oversight (in framework) | Owner |
| Coach track: Entry → Assistant → Senior (bball+vball, tiers extensible) | full | Senior Coach (coach trains coach) |
| Court Attendant (front desk) | exists: `playbook.html` | Jazzy |
| Admin (shares COH report w/ attendant) | clone | Jazzy |
| Social Media Marketer (incoming hire) | clone, ready | Jazzy |
| Custodian (cleaning, pulled out of coach duties) | clone | Jazzy |
| Referee (open runs) | light | Senior Coach |

**Coach progression rule:** Entry assists only → once trained *and comfortable* and signed → may run an **open run** solo → climbs. Solo is earned per rung, never assumed.

## Build (in `06-SOFTWARE/fae-command-center/`)
Alongside existing files (compare before replace). Shared design system extracted to `assets/fae-playbook.css` so role clones stay consistent.
1. `the-fae-way.html` — the system/framework, screen-presentable.
2. `role-template.html` — blank playbook skeleton every role clones.
3. `playbook-coach.html` — full coach track with progression gate, teach-back, competency sheet, "when free" list, session runsheets (batch / 1:1 / open run), conduct, escalation, quick card.
4. Later: clone Court Attendant → template, Admin, Social Media Marketer, Custodian, Referee.

All print-friendly (binder), link back to `console.html`. Wiring into console nav offered separately (not auto-applied).

## Notes
- Not a git repo → spec not committed; saved here as the record.
- Source of duties: `01-ADMIN-AND-LEGAL/Handover-2026/FAE FILES.docx`, coach contracts, `Staff-Training/` manual.
