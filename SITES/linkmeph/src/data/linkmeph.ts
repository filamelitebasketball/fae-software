// Placeholder data for the LinkMePH scaffold. Replace with real API data later.

export type LinkType =
  | "facebook"
  | "instagram"
  | "tiktok"
  | "website"
  | "whatsapp"
  | "viber"
  | "gcash"
  | "email"
  | "phone"
  | "linkedin"
  | "youtube";

export type ProfileLink = {
  id: string;
  type: LinkType;
  label: string;
  value: string;
  href: string;
};

export type ProfileTheme = "midnight" | "aurora" | "ember" | "paper";

export type Profile = {
  slug: string;
  name: string;
  title: string;
  company: string;
  bio: string;
  avatarUrl: string;
  coverUrl: string;
  theme: ProfileTheme;
  email: string;
  phone: string;
  embed?: { kind: "video" | "post"; platform: string; title: string };
  links: ProfileLink[];
};

export const themes: { id: ProfileTheme; name: string; description: string }[] = [
  { id: "midnight", name: "Midnight", description: "Dark, high contrast, neon cyan accents" },
  { id: "aurora", name: "Aurora", description: "Teal to cyan gradient, soft cards" },
  { id: "ember", name: "Ember", description: "Brand red energy, bold buttons" },
  { id: "paper", name: "Paper", description: "Clean light layout, minimal borders" },
];

export const demoProfile: Profile = {
  slug: "isidro",
  name: "Isidro V. Raymundo Jr.",
  title: "Founder & Creative Director",
  company: "LinkMePH",
  bio: "Helping Filipino businesses go digital — NFC cards, QR services, live sports and creative editing. Based in Lipa City, Batangas.",
  avatarUrl: "",
  coverUrl: "",
  theme: "aurora",
  email: "contact@linkmeph.com",
  phone: "+63 917 000 0000",
  embed: { kind: "video", platform: "TikTok", title: "How the LinkMe Card works in 30 seconds" },
  links: [
    { id: "1", type: "facebook", label: "Facebook", value: "/linkmeph", href: "#" },
    { id: "2", type: "instagram", label: "Instagram", value: "@linkmeph", href: "#" },
    { id: "3", type: "tiktok", label: "TikTok", value: "@linkmeph", href: "#" },
    { id: "4", type: "website", label: "Website", value: "linkmeph.com", href: "#" },
    { id: "5", type: "whatsapp", label: "WhatsApp", value: "+63 917 000 0000", href: "#" },
    { id: "6", type: "viber", label: "Viber", value: "+63 917 000 0000", href: "#" },
    { id: "7", type: "gcash", label: "GCash", value: "0917 000 0000", href: "#" },
    { id: "8", type: "email", label: "Email", value: "contact@linkmeph.com", href: "#" },
    { id: "9", type: "phone", label: "Call", value: "+63 917 000 0000", href: "#" },
  ],
};

export type MatchStatus = "upcoming" | "live" | "ended";

export type Match = {
  id: string;
  sport: "basketball" | "volleyball";
  league: string;
  partner: "Filamelite Basketball" | "Filamelite Volleyball";
  home: string;
  away: string;
  startsAt: string; // ISO, PH time context
  venue: string;
  status: MatchStatus;
  access: "free" | "pass";
  passPrice: number;
  score?: { home: number; away: number };
};

const hoursFromNow = (h: number) => new Date(Date.now() + h * 3600_000).toISOString();

export const matches: Match[] = [
  {
    id: "fb-2026-001",
    sport: "basketball",
    league: "Filamelite Invitational Cup",
    partner: "Filamelite Basketball",
    home: "Lipa Stallions",
    away: "Batangas Voyagers",
    startsAt: hoursFromNow(-0.5),
    venue: "Lipa City Sports Center",
    status: "live",
    access: "free",
    passPrice: 0,
    score: { home: 54, away: 49 },
  },
  {
    id: "fv-2026-002",
    sport: "volleyball",
    league: "Filamelite Spikers League",
    partner: "Filamelite Volleyball",
    home: "Tanauan Tides",
    away: "Malvar Mavericks",
    startsAt: hoursFromNow(3),
    venue: "Tanauan Covered Court",
    status: "upcoming",
    access: "pass",
    passPrice: 99,
  },
  {
    id: "fb-2026-003",
    sport: "basketball",
    league: "Filamelite Invitational Cup",
    partner: "Filamelite Basketball",
    home: "Sto. Tomas Titans",
    away: "Ibaan Warriors",
    startsAt: hoursFromNow(27),
    venue: "Sto. Tomas Gymnasium",
    status: "upcoming",
    access: "pass",
    passPrice: 99,
  },
  {
    id: "fv-2026-004",
    sport: "volleyball",
    league: "Filamelite Spikers League",
    partner: "Filamelite Volleyball",
    home: "Rosario Risers",
    away: "Lemery Lancers",
    startsAt: hoursFromNow(50),
    venue: "Rosario Sports Complex",
    status: "upcoming",
    access: "free",
    passPrice: 0,
  },
  {
    id: "fb-2026-005",
    sport: "basketball",
    league: "Filamelite Invitational Cup",
    partner: "Filamelite Basketball",
    home: "Lipa Stallions",
    away: "Ibaan Warriors",
    startsAt: hoursFromNow(-30),
    venue: "Lipa City Sports Center",
    status: "ended",
    access: "free",
    passPrice: 0,
    score: { home: 88, away: 81 },
  },
];

export const passTiers = [
  {
    id: "single",
    name: "Single Game Pass",
    price: 99,
    period: "per game",
    perks: ["One live game, full replay for 48 hours", "HD stream", "Live chat access"],
  },
  {
    id: "monthly",
    name: "Monthly All-Access",
    price: 349,
    period: "per month",
    perks: ["All basketball & volleyball games", "Replays for 30 days", "Game reminders", "Live chat + reactions"],
    highlight: true,
  },
  {
    id: "season",
    name: "Season Pass",
    price: 1499,
    period: "per season",
    perks: ["Everything in Monthly", "Priority support", "Partner league highlights"],
  },
];

export const myPasses = [
  {
    id: "p1",
    name: "Monthly All-Access",
    type: "subscription" as const,
    status: "Active",
    detail: "Renews 5 Sept 2026",
    price: 349,
  },
  {
    id: "p2",
    name: "Single Game Pass — Tanauan Tides vs Malvar Mavericks",
    type: "single" as const,
    status: "Ready",
    detail: "Valid until game replay expires",
    price: 99,
  },
  {
    id: "p3",
    name: "Single Game Pass — Lipa Stallions vs Ibaan Warriors",
    type: "single" as const,
    status: "Used",
    detail: "Watched 6 Aug 2026",
    price: 99,
  },
];

export const creativePackages = [
  {
    id: "reels",
    name: "Reels & Short-Form Editing",
    tagline: "Vertical edits built for Reels, TikTok and Shorts",
    perPiece: 750,
    retainer: 8500,
    retainerNote: "12 videos / month",
    turnaround: "2–3 business days per video",
    includes: ["Up to 60 seconds", "Captions & sound design", "2 revision rounds", "Ready for 9:16 platforms"],
  },
  {
    id: "photo",
    name: "Photo Retouching",
    tagline: "Product, portrait and event clean-up",
    perPiece: 200,
    retainer: 4500,
    retainerNote: "30 photos / month",
    turnaround: "1–2 business days per batch",
    includes: ["Color grading", "Skin & object retouch", "Background clean-up", "Web + print exports"],
  },
  {
    id: "carousel",
    name: "Carousel & Post Design",
    tagline: "Social marketing graphics that stay on brand",
    perPiece: 450,
    retainer: 6500,
    retainerNote: "16 posts / month",
    turnaround: "2 business days per set",
    includes: ["Up to 6 slides", "Brand kit applied", "Copy layout support", "Source files on request"],
  },
];

export const sampleWork = [
  { id: "s1", title: "Café launch reel", category: "Reels", before: "Raw phone footage", after: "Captioned 30s reel" },
  { id: "s2", title: "Product photo set", category: "Photo", before: "Flat studio shots", after: "Retouched hero images" },
  { id: "s3", title: "Promo carousel", category: "Carousel", before: "Plain text draft", after: "6-slide branded set" },
  { id: "s4", title: "Event recap", category: "Reels", before: "2 hours of clips", after: "45s highlight cut" },
];

export const creativeOrders = [
  {
    id: "CS-1041",
    package: "Reels & Short-Form Editing",
    submitted: "2 Aug 2026",
    status: "Delivered" as const,
    note: "3 reels for August campaign",
  },
  {
    id: "CS-1046",
    package: "Photo Retouching",
    submitted: "5 Aug 2026",
    status: "In Progress" as const,
    note: "24 product photos",
  },
  {
    id: "CS-1049",
    package: "Carousel & Post Design",
    submitted: "7 Aug 2026",
    status: "Submitted" as const,
    note: "Back-to-school promo set",
  },
];

export const analytics = {
  views: 2841,
  clicks: 1194,
  taps: 386,
  leads: 47,
  daily: [
    { day: "Mon", views: 320, clicks: 132, taps: 41 },
    { day: "Tue", views: 412, clicks: 168, taps: 55 },
    { day: "Wed", views: 388, clicks: 151, taps: 48 },
    { day: "Thu", views: 465, clicks: 201, taps: 66 },
    { day: "Fri", views: 521, clicks: 233, taps: 74 },
    { day: "Sat", views: 402, clicks: 176, taps: 62 },
    { day: "Sun", views: 333, clicks: 133, taps: 40 },
  ],
  topLinks: [
    { label: "Facebook", clicks: 344 },
    { label: "Website", clicks: 268 },
    { label: "WhatsApp", clicks: 210 },
    { label: "GCash", clicks: 187 },
    { label: "Instagram", clicks: 185 },
  ],
};

export const leads = [
  { id: "l1", name: "Marites Dela Cruz", phone: "0917 555 1234", note: "Wants 5 cards for her team", date: "6 Aug 2026" },
  { id: "l2", name: "Ryan Perez", phone: "0918 555 8877", note: "Asking about custom logo", date: "5 Aug 2026" },
  { id: "l3", name: "Joan Mercado", phone: "0921 555 4410", note: "Follow up next week", date: "3 Aug 2026" },
];

export const CARD_SRP = 1200;
export const CARD_PROMO = 999;
