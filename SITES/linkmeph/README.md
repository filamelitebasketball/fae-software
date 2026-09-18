# LinkHub PH

I'm rebuilding LinkMePH — a Philippine digital-services brand, founded 2022 in Lipa 
City, Batangas by Isidro V. Raymundo Jr. Today it sells a PVC NFC "LinkMe Card" 
(SRP ₱1,200, promo ₱999) that links to a digital profile page combining someone's 
social media, portfolio, and contact info (like Popl/HiHello/Blinq/Wave). I want to 
relaunch it as a digital-services hub with five parts: the card product, live sports 
streaming, creative editing services, a cleaner account system, and an about/footer 
section.

## 1. Upgrade the LinkMe Card / digital profile
- Mobile-first public profile page: cover photo, avatar, name/title/company, bio, 
  and a scrollable list of link buttons (social, website, WhatsApp, Viber, GCash, 
  email, phone)
- "Save Contact" button that downloads a vCard (.vcf) to the visitor's phone
- Apple Wallet / Google Wallet pass generation for the digital card
- Optional lead-capture form so visitors can leave their name/number back with the 
  card owner
- Analytics dashboard for card owners: profile views, link clicks, taps over time
- Multiple profile themes/templates to choose from when creating a profile
- Support embedding a short video or a Facebook/Instagram/TikTok post on the profile
- Shop/order page: show SRP ₱1,200 struck through with Promo ₱999, live mockup 
  preview of the card with the customer's name/logo before checkout, and a clear 
  timeline (5–7 business days shipping, +2–3 business days for custom mockup/approval)
- Checkout supports GCash and Maya alongside cards

## 2. Add a "Live Sports" section (basketball + volleyball)
- New top-level nav item: Live Sports
- Trusted partner strip: streamed in partnership with Filamelite Basketball and 
  Filamelite Volleyball — show their logos/names on this section and the homepage
- Schedule/calendar of upcoming games — date, time (PH time), teams/league, status 
  (Upcoming / Live Now / Ended)
- Match page: embedded video player, league/partner name, live score if available, 
  countdown before start
- Access model: some games free, others behind a pass — single-game pass and 
  monthly subscription tiers, paid via GCash/Maya/card
- "My Passes" page showing what the user has bought or subscribed to
- Opt-in reminder notification before a game starts
- Simple live chat/reactions panel alongside the stream

## 3. Add Creative Services: Video & Photo Editing for Social Media
- New nav item: Creative Services
- Service page listing packages: reels/short-form video editing, photo retouching, 
  carousel/post design for social media marketing
- Pricing tiers per package (per piece, or monthly retainer)
- Before/after or sample-work gallery
- Simple order/request form: client uploads raw video/photos or links a Google 
  Drive folder, describes what they want, picks a package, and submits
- Order status tracking (Submitted / In Progress / Delivered) in the account 
  dashboard
- Turnaround-time expectations shown clearly before checkout

## 4. Fix the account system: sign up, log in, profile
- Clean, modern sign up and log in pages with email/password, plus Google and 
  Facebook social login
- Working forgot-password / reset-password flow
- One unified account dashboard covering all services: LinkMe Card & analytics, 
  Live Sports passes, and Creative Services orders
- Profile edit page with a live preview of the public LinkMe Card while editing
- Clear validation and error messages on all forms; fully responsive on mobile

## 5. About / Footer
- Short About section: founded 2022, Lipa City, Batangas, Philippines; founder 
  Isidro V. Raymundo Jr.
- Footer contact block: phone, cell, email (contact@linkmeph.com)
- One line on what LinkMePH does: digital business cards, NFC data transfer, QR 
  code services — now expanding into live sports and creative services

## Design direction
- Brand colors: red #D91314, cyan #0BCEFC, deep teal #1E4E50, heading blue #007DD6, 
  ink #24272E, black #000000
- Logo: red/teal "V/\" mark with "LINKMEPH" wordmark in #24272E below it
- One cohesive brand across all five parts — same header, nav, color system, and 
  typography
- Mobile-first, since most visitors will be on phones
- Copy in English but simple enough to localize into Filipino/Taglish later
- [Insert fonts and Filamelite partner logos here once confirmed]

Scaffold this as pages and components with realistic placeholder data first — we'll 
wire up real payments, the streaming source, and file uploads after.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://ph-connect-all.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/de04f2a5-2d19-4fa6-b6f9-b4ee5fa94cb9).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
