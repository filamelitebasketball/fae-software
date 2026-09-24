/**
 * Everything that differs between basketball.faeph.com and volleyball.faeph.com.
 * The page (routes/index.tsx), shell and styles are the same NXGEN-derived code in
 * both SITES/basketball and SITES/volleyball — edit copy and links here only.
 *
 * Sources: the FAE Basketball enrollment ad (05-BRAND-AND-MEDIA/Video-Renders/
 * FAEBBALLADLIVE.mp4) and the public Facebook page facebook.com/FilAmEliteBasketball.
 */

type Icon = "whistle" | "trophy" | "user" | "bolt" | "court";
type Link = { label: string; href: string };
/** Badge and medal art, drawn with lucide icons in components/roster.tsx. */
export type Art = "target" | "shield" | "zap" | "hand" | "share" | "brain" | "layers" | "rocket" | "trophy" | "medal" | "star" | "award";
/** A public roster entry: only what a parent has cleared for the website. Birthdays,
 *  guardian contacts and medical notes stay in the Command Center and never come here. */
export type Player = {
  name: string; number: string; position: string; height: string; batch: string; division: string;
  photo?: string; gallery?: string[]; badges?: string[]; medals?: string[];
};

export type Site = {
  sport: string;
  name: string;
  url: string;
  logo: string;
  slogan: string;
  wordmark: string;
  badge: string;
  tagline: string;
  meta: string;
  place: string;
  /** Words stepped through once in the hero line "Train to become a …". It rests on the last
   *  word, so put the longest last or the line keeps a gap where the wider word was. */
  rotate: string[];
  /** form = the live Google Form. Its responses are the sheet the Command Center loads. */
  enroll: Link & { form?: string };
  heroLink: Link & { lead: string };
  ticker: string[];
  stats: { value: string; label: string }[];
  programs: { title: string; meta: [string, string]; fee: string; per?: string; href: string; icon?: Icon; logo?: string }[];
  training: { price: string; per: string; groups: { label: string; items: string[] }[]; awards: string[]; benefits?: string[] };
  tournament: { fee: string; items: string[] };
  schedule: { day: string; group: string; time: string }[];
  coaches: { image: string; alt: string; people: { name: string; role: string; note?: string }[] };
  vision: string;
  mission: string;
  record: { title: string; series: string[]; images: { src: string; alt: string; caption: string }[] };
  kit: { src: string; alt: string }[];
  film: { src: string; poster: string; blurb: string };
  roster: Player[];
  /** Shown in place of the roster while it is empty: the card a new player earns. */
  rosterSample: Player;
  badges: { name: string; from: string; art: Art }[];
  medals: { name: string; art: Art }[];
  /** Real reviews only. Three or more scroll as a marquee. */
  reviews: { quote: string; by: string; meta: string }[];
  reviewSummary?: Link;
  facebook?: string;
  socials: Link[];
  contact: { phone: string; phoneLabel: string; email: string; address: string; mapUrl?: string; note?: string };
  sponsors: { name: string; logo: string }[];
  network: { name: string; caption: string; href: string; logo: string }[];
};

const FB = "https://www.facebook.com/FilAmEliteBasketball";
const MESSENGER = "https://m.me/FilAmEliteBasketball";

export const site: Site = {
  sport: "Basketball",
  name: "FilAmElite Basketball",
  url: "https://basketball.faeph.com",
  logo: "/brand/logo.webp",
  slogan: "/brand/slogan.webp",
  wordmark: "FILAMELITE",
  badge: "Batch 23 · Now enrolling",
  tagline: "Year-round training. Science-driven methodology.",
  meta: "Kids 5–11 · Teens 12–18 · 1:1, small & big group",
  place: "Lipa City, Batangas",
  rotate: ["Shooter", "Defender", "Leader", "Playmaker"],
  // "FAE Batch 23 Registration Form Lipa City" in Drive.
  enroll: { label: "Enroll now", href: MESSENGER, form: "https://docs.google.com/forms/d/e/1FAIpQLSfKcb7faevH_gFP3ALCVzwZdBxyT1CZD5D0g3HyvYXmpp91Zw/viewform" },
  heroLink: { lead: "Ready for league play?", label: "Join NXGEN Premier League", href: "https://nxgen.faeph.com" },
  ticker: ["Year-round training", "Science-driven methodology", "Kids 5–11", "Teens 12–18", "1:1 · Small · Big group", "Tournaments", "Earned Not Given"],
  stats: [
    { value: "11K", label: "Facebook followers" },
    { value: "15", label: "Tournaments hosted" },
    { value: "100%", label: "Recommend us" },
    { value: "12", label: "Sessions per batch" },
  ],
  programs: [
    { title: "Skills Training", meta: ["10 SKILLS + 2 GAME SESSIONS", "KIDS 5–11 · TEENS 12–18"], fee: "₱5,500", per: "/ 12 sessions", href: "#training", icon: "whistle" },
    { title: "Tournaments", meta: ["FIVE SERIES · VOL. 1–3 EACH", "MEDALS · MVP · FB LIVE"], fee: "₱2,500", per: "tournament fee", href: "#tournaments", icon: "trophy" },
    { title: "1:1 & Small Group", meta: ["1:1 · SMALL · BIG GROUP", "LIPA CITY · MALOLOS"], fee: "Message us", href: MESSENGER, icon: "user" },
    { title: "NXGEN League", meta: ["FOUR DIVISIONS · ALL AGES", "F.A.E. COURT · LIPA CITY"], fee: "Join the league", href: "https://nxgen.faeph.com", logo: "/sponsors/nxgen.webp" },
  ],
  training: {
    price: "₱5,500",
    per: "12 sessions",
    groups: [
      { label: "10 skills sessions", items: ["Basic fundamentals", "Athleticism training", "Shooting mechanics", "Ball handling", "Defense & offense tactics", "Passing skills"] },
      { label: "2 game sessions", items: ["Game scrimmages", "Tournament (fee not included)"] },
    ],
    awards: ["Certificate of participation", "Special awards"],
    benefits: ["Professional licensed coaching", "Techniques from the United States", "Learn a variety of skills", "Develop from basic to advanced", "A chance to play in local club leagues"],
  },
  tournament: {
    fee: "₱2,500",
    items: ["Certificate of participation", "Medals: champion, 1st, 2nd & 3rd runner-up", "Mythical 5 & Finals MVP", "Game footage: photos + FB Live", "Player of the Game posts", "2 games guaranteed + championship round", "Stickers"],
  },
  schedule: [
    { day: "SAT", group: "KIDS 5–11", time: "10:00 – 11:30 AM" },
    { day: "SAT", group: "TEENS 12–18", time: "11:30 AM – 1:00 PM" },
    { day: "SUN", group: "TEENS 12–18", time: "8:00 – 9:30 AM" },
    { day: "SUN", group: "KIDS 5–11", time: "9:30 – 11:00 AM" },
  ],
  coaches: {
    image: "/media/staff.webp",
    alt: "FilAmElite Basketball coaching staff with Coach Junior",
    people: [{ name: "Coach Junior", role: "Founder · Professional Skills & Athletic Performance Trainer", note: "USA Youth Development certified" }],
  },
  vision: "Basketball training methods from international programs. Our practices teach hard work, integrity and discipline, so you reach your ambitions as an athlete and prosper as an individual.",
  mission: "Helping home-grown Filipinos nationwide reach their maximum potential, with sports science and a game plan built for skill and IQ development. We train smart. We train for the best results.",
  record: {
    title: "15 tournaments. Five series.",
    series: ["Hoopfest", "Summer Jam", "Summer Tip-Off", "Hardcourt Kings", "Holiday Classics"],
    images: [
      { src: "/media/tournaments.webp", alt: "Team photos from every FilAmElite tournament series", caption: "Every series, Vol. 1–3" },
      { src: "/media/batches.webp", alt: "Group photos of FilAmElite training batches", caption: "Big group batches" },
    ],
  },
  kit: [
    { src: "/kit/players.webp", alt: "2026 batch player uniform" },
    { src: "/kit/tournament.webp", alt: "2026 tournament uniform" },
    { src: "/kit/coaches.webp", alt: "2026 coaches uniform" },
  ],
  film: { src: "/media/film.mp4", poster: "/media/film.jpg", blurb: "Batch 23 in under a minute: inclusions, schedule, coaches and every tournament." },
  // Empty until parents clear their player for the website.
  roster: [],
  rosterSample: { name: "Your name here", number: "00", position: "Guard · Wing · Big", height: "Your height", batch: "Batch 23", division: "Kids 5–11 · Teens 12–18" },
  // One badge per clinic module in training.groups; medals mirror the tournament package.
  badges: [
    { name: "Foundations", from: "Basic fundamentals", art: "layers" },
    { name: "Athlete", from: "Athleticism training", art: "zap" },
    { name: "Shooting Specialist", from: "Shooting mechanics", art: "target" },
    { name: "Ball Handler", from: "Ball handling", art: "hand" },
    { name: "Elite Defender", from: "Defense & offense tactics", art: "shield" },
    { name: "Playmaker", from: "Passing skills", art: "share" },
  ],
  medals: [
    { name: "Champion", art: "trophy" },
    { name: "1st Runner-up", art: "medal" },
    { name: "2nd Runner-up", art: "medal" },
    { name: "3rd Runner-up", art: "medal" },
    { name: "Mythical 5", art: "star" },
    { name: "Finals MVP", art: "award" },
    { name: "Player of the Game", art: "star" },
  ],
  reviews: [
    {
      quote: "I am totally impressed kung paano i-train ni Coach Junior at iba pa na coaches ang mga participants. From the basic ball handling, passing, shooting etc, and even the discipline inside or outside the court.",
      by: "Ysabelle C.",
      meta: "Facebook review · Nov 2025",
    },
  ],
  reviewSummary: { label: "100% recommend · 7 reviews", href: `${FB}/reviews` },
  facebook: FB,
  socials: [
    { label: "Facebook", href: FB },
    { label: "Messenger", href: MESSENGER },
    { label: "YouTube", href: "https://www.youtube.com/channel/UC25QU4GxLEy0LM4c6lIHdeA" },
  ],
  contact: {
    phone: "+639175018835",
    phoneLabel: "0917 501 8835",
    email: "filamelitebasketball@gmail.com",
    address: "Banay Banay, San Vicente, Lipa City, Batangas",
    mapUrl: "https://www.google.com/maps/search/?api=1&query=Banay+Banay%2C+San+Vicente%2C+Lipa+City%2C+Batangas",
    note: "Branches: Lipa City, Batangas · Malolos, Bulacan",
  },
  sponsors: [
    { name: "Picklemania", logo: "/sponsors/picklemania.webp" },
    { name: "Aguila Auto Glass", logo: "/sponsors/aguila.webp" },
    { name: "VA", logo: "/sponsors/va.webp" },
    { name: "FilAmElite Volleyball", logo: "/sponsors/volleyball.webp" },
    { name: "NXGEN Premier League", logo: "/sponsors/nxgen.webp" },
  ],
  network: [
    { name: "FAE Hub", caption: "FilAmElite Management", href: "https://faeph.com", logo: "/sponsors/fae.webp" },
    { name: "FilAmElite Volleyball", caption: "Training & tournaments", href: "https://volleyball.faeph.com", logo: "/sponsors/volleyball.webp" },
    { name: "NXGEN Premier League", caption: "League play · all ages", href: "https://nxgen.faeph.com", logo: "/sponsors/nxgen.webp" },
    { name: "F.A.E. Bookings", caption: "Court rental · WiFi café", href: "https://bookings.faeph.com", logo: "/sponsors/fae.webp" },
    { name: "LinkMePH", caption: "NFC cards · livestreams", href: "https://linkmeio.faeph.com", logo: "/sponsors/linkme.webp" },
  ],
};
