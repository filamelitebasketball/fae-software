/**
 * F.A.E. Court — single source of truth for sports, courts, rates,
 * contact details, network programs, tiers and teams.
 * All components reference these constants — no scattered hardcoded values.
 */

export type SportKey = "basketball" | "volleyball" | "pickleball";

export interface Court {
  id: string;
  name: string;
  memberRate: number;
  nonMemberRate: number;
}

export interface Sport {
  key: SportKey;
  label: string;
  icon: string;
  /** hex accent — used for inline styles where a per-sport color is needed */
  acc: string;
  courts: Court[];
  description: string;
}

export const SPORTS: Record<SportKey, Sport> = {
  basketball: {
    key: "basketball",
    label: "Basketball",
    icon: "basketball",
    acc: "#E8843C",
    description: "Full hardwood with league-standard rings, shot clock and scorer's table.",
    courts: [{ id: "bb-full", name: "Full court", memberRate: 900, nonMemberRate: 1200 }],
  },
  volleyball: {
    key: "volleyball",
    label: "Volleyball",
    icon: "volleyball",
    acc: "#5B8FE8",
    description: "Regulation indoor court, net height adjustable for men's, women's and juniors.",
    courts: [{ id: "vb-1", name: "Indoor court", memberRate: 900, nonMemberRate: 1200 }],
  },
  pickleball: {
    key: "pickleball",
    label: "Pickleball",
    icon: "pickleball",
    acc: "#2ECC71",
    description: "Two dedicated courts with permanent nets. Paddles and balls included.",
    courts: [
      { id: "pb-1", name: "Pickleball court 1", memberRate: 500, nonMemberRate: 700 },
      { id: "pb-2", name: "Pickleball court 2", memberRate: 500, nonMemberRate: 700 },
    ],
  },
};

export const SPORT_KEYS = Object.keys(SPORTS) as SportKey[];

/** Peak pricing: disabled, uplift set to 0%. */
export const PEAK = { enabled: false, start: 18, uplift: 0 } as const;

/** Bookable start hours: 6AM–11PM. */
export const HOURS: number[] = Array.from({ length: 18 }, (_, i) => i + 6);

export const FAE_CONTACT = {
  phone: "+63 917 501 8835",
  email: "hello@faecourt.ph",
  address: "F.A.E. Court, Lipa City, Batangas",
  lat: 13.9352049,
  lng: 121.1154848,
  mapsUrl: "https://www.google.com/maps/search/?api=1&query=13.9352049,121.1154848",
  hours: {
    weekday: "4:00 AM – 12:00 AM",
    sunday: "Open 24 hours",
    badge: "OPEN 4 AM – 12 AM · 24 HOURS SUNDAYS",
  },
} as const;

export interface NetworkProgram {
  tag: string;
  name: string;
  icon: string;
  accent: string;
  url: string;
  external?: boolean;
}

export const NETWORK: NetworkProgram[] = [
  {
    tag: "NXGEN League",
    name: "NXGEN League",
    icon: "trophy",
    accent: "#C9A227",
    url: "https://nxgenpremierleague.lovable.app",
    external: true,
  },
  { tag: "Elite Basketball", name: "Elite Basketball", icon: "basketball", accent: "#E8843C", url: "/teams" },
  { tag: "Elite Volleyball", name: "Elite Volleyball", icon: "volleyball", accent: "#5B8FE8", url: "/teams" },
  { tag: "Elite Pickleball", name: "Elite Pickleball", icon: "pickleball", accent: "#2ECC71", url: "/teams" },
];

/* ---------- Membership ---------- */

export type MembershipTier = "non_member" | "member";

export const MEMBERSHIP = {
  fee: 1000,
  validityYears: 1,
  bandReplacement: 250,
  inclusions: [
    "1 RFID band",
    "1 membership card",
    "5% off FAE Basketball & Volleyball training",
    "10 GB data starter pack (60 days)",
  ],
} as const;

export const LOYALTY = {
  basketballVolleyball: { threshold: 10, reward: "1 free court rental" },
  pickleball: { threshold: 15, reward: "1 free court rental" },
} as const;

export function isMember(tier: string | null | undefined): boolean {
  return tier === "member";
}

/* ---------- Filam Elite teams ---------- */

export interface TeamPlayer {
  number?: string;
  name: string;
  position: string;
}

export interface Team {
  sport: SportKey;
  name: string;
  league: string;
  copy: string;
  stats: { value: string; label: string }[];
  roster: TeamPlayer[];
}

export const TEAMS: Team[] = [
  {
    sport: "basketball",
    name: "Filam Elite Basketball",
    league: "NXGEN Premier League · Legacy Division",
    copy: "The senior men's program. Trains four nights a week on the home floor and carries the F.A.E. name into every NXGEN season.",
    stats: [
      { value: "14", label: "Roster" },
      { value: "22–4", label: "Last season" },
      { value: "4x", label: "Titles" },
    ],
    roster: [
      { number: "4", name: "Marco Villanueva", position: "Guard" },
      { number: "7", name: "JR Delos Santos", position: "Wing" },
      { number: "11", name: "Kenji Alvarez", position: "Forward" },
      { number: "23", name: "Paulo Mendoza", position: "Center" },
      { number: "32", name: "Rafa Lim", position: "Guard" },
    ],
  },
  {
    sport: "volleyball",
    name: "Filam Elite Volleyball",
    league: "Batangas Indoor Circuit · Women's",
    copy: "Women's indoor squad built out of Lipa and Batangas club players. Open gym Tuesdays, competitive tryouts every off-season.",
    stats: [
      { value: "12", label: "Roster" },
      { value: "18–6", label: "Last season" },
      { value: "2x", label: "Titles" },
    ],
    roster: [
      { number: "1", name: "Aliyah Santos", position: "Setter" },
      { number: "5", name: "Nina Bautista", position: "Outside" },
      { number: "9", name: "Trish Ocampo", position: "Middle" },
      { number: "14", name: "Kim Herrera", position: "Libero" },
      { number: "17", name: "Bea Ramos", position: "Opposite" },
    ],
  },
  {
    sport: "pickleball",
    name: "Lipa Elite Pickleball",
    league: "Lipa Open Ladder · Mixed",
    copy: "Ladder play Wednesday and Sunday nights, plus a beginner clinic every first Saturday — paddles provided.",
    stats: [
      { value: "20", label: "Members" },
      { value: "3.5–4.5", label: "DUPR band" },
      { value: "Wed/Sun", label: "Ladder" },
    ],
    roster: [
      { name: "Coach Danilo Cruz", position: "Captain" },
      { name: "Grace Ilagan", position: "Mixed doubles" },
      { name: "Migs Torres", position: "Men's doubles" },
      { name: "Ella Panganiban", position: "Women's doubles" },
      { name: "Rey Malabanan", position: "Singles" },
    ],
  },
];

/* ---------- Court rules ---------- */

export const COURT_RULES: { title: string; body: string }[] = [
  {
    title: "Non-marking soles only",
    body: "Indoor court shoes on the hardwood at all times. Outdoor rubber soles stay in the cubbies by the entrance.",
  },
  {
    title: "Slots run on the hour",
    body: "Be on the floor at your start time. Your hour ends at :55 so the next group can warm up.",
  },
  {
    title: "Free cancellation up to 6 hours",
    body: "Cancel from your account up to six hours before your slot. Later cancellations are charged in full.",
  },
  {
    title: "Member rates",
    body: "Members pay the lower member rate on every slot, every sport. Show your RFID band at the counter.",
  },
  {
    title: "Waiver",
    body: "Every player signs the F.A.E. court rules and waiver once — it is covered when you create an account.",
  },
  {
    title: "Booked players park free",
    body: "Show your booking reference at the gate. Free parking for the duration of your slot.",
  },
];

/* ---------- Social media ---------- */

export interface SocialLink {
  platform: string;
  icon: string;
  url: string;
  handle: string;
}

export const FAE_SOCIALS: SocialLink[] = [
  { platform: "Facebook", icon: "facebook", url: "https://facebook.com/FAECourtLipa", handle: "@FAECourtLipa" },
  { platform: "Instagram", icon: "instagram", url: "https://instagram.com/faecourt", handle: "@faecourt" },
  { platform: "TikTok", icon: "tiktok", url: "https://tiktok.com/@faecourt", handle: "@faecourt" },
];

export const FAE_WHATSAPP = `https://wa.me/${FAE_CONTACT.phone.replace(/[^0-9+]/g, "")}?text=${encodeURIComponent("Hi! I'd like to inquire about court bookings at F.A.E. Court.")}`;

/* ---------- FAQ ---------- */

export interface FaqItem {
  question: string;
  answer: string;
}

export const FAQ: FaqItem[] = [
  {
    question: "How do I book a court?",
    answer: "Create an account, go to the Book page, pick your sport, surface, date and time slots. Pay at the counter when you arrive.",
  },
  {
    question: "What's the cancellation policy?",
    answer: "Free cancellation up to 6 hours before your slot. Later cancellations are charged in full.",
  },
  {
    question: "Do I need to bring my own ball?",
    answer: "Basketball and volleyball — yes, bring your own. Pickleball — paddles and balls are included with every booking.",
  },
  {
    question: "How does membership work?",
    answer: "Pay ₱1,000 once a year, get an RFID band, and every court on the floor drops to the member rate. You also get 5% off Filam Elite training.",
  },
  {
    question: "Can I walk in without a booking?",
    answer: "Yes, if the court is free. But booking online guarantees your slot. Check the Schedule page to see what's open.",
  },
  {
    question: "Is parking free?",
    answer: "Yes — free parking for the duration of your booked slot. Show your booking reference at the gate.",
  },
  {
    question: "What shoes are allowed on the court?",
    answer: "Non-marking indoor court shoes only. Outdoor rubber soles stay in the cubbies by the entrance.",
  },
  {
    question: "How do I join a Filam Elite team?",
    answer: "Go to the Teams page and sign up for tryouts. Tryouts run monthly on the home floor. Roster spots open when a season closes.",
  },
];

/* ---------- Helpers ---------- */

export function formatPeso(amount: number): string {
  return `₱${amount.toLocaleString("en-PH", { maximumFractionDigits: amount % 1 === 0 ? 0 : 2 })}`;
}

export function formatHour(hour: number): string {
  if (hour === 0 || hour === 24) return "12 AM";
  if (hour === 12) return "12 PM";
  return hour < 12 ? `${hour} AM` : `${hour - 12} PM`;
}

export function hourPrice(rate: number, startHour: number): number {
  return Math.round(rate * (startHour >= PEAK.start ? 1 + PEAK.uplift : 1));
}
