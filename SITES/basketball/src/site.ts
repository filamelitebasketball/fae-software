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
  hero: { video: string; poster: string };
  enroll: Link;
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
  review?: { quote: string; by: string; meta: string; summary: string; href: string };
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
  logo: "/brand/logo.png",
  slogan: "/brand/slogan.png",
  wordmark: "FILAMELITE",
  badge: "Batch 23 · Now enrolling",
  tagline: "Year-round training. Science-driven methodology.",
  meta: "Kids 5–11 · Teens 12–18 · 1:1, small & big group",
  place: "Lipa City, Batangas",
  hero: { video: "/media/hero.mp4", poster: "/media/hero.jpg" },
  enroll: { label: "Enroll now", href: MESSENGER },
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
    { title: "NXGEN League", meta: ["FOUR DIVISIONS · ALL AGES", "F.A.E. COURT · LIPA CITY"], fee: "Join the league", href: "https://nxgen.faeph.com", logo: "/sponsors/nxgen.png" },
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
  review: {
    quote: "I am totally impressed kung paano i-train ni Coach Junior at iba pa na coaches ang mga participants. From the basic ball handling, passing, shooting etc, and even the discipline inside or outside the court.",
    by: "Ysabelle C.",
    meta: "Facebook review · Nov 2025",
    summary: "100% recommend · 7 reviews",
    href: `${FB}/reviews`,
  },
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
    { name: "Picklemania", logo: "/sponsors/picklemania.png" },
    { name: "Aguila Auto Glass", logo: "/sponsors/aguila.png" },
    { name: "VA", logo: "/sponsors/va.png" },
    { name: "FilAmElite Volleyball", logo: "/sponsors/volleyball.png" },
    { name: "NXGEN Premier League", logo: "/sponsors/nxgen.png" },
  ],
  network: [
    { name: "FAE Hub", caption: "FilAmElite Management", href: "https://faeph.com", logo: "/sponsors/fae.png" },
    { name: "FilAmElite Volleyball", caption: "Training & tournaments", href: "https://volleyball.faeph.com", logo: "/sponsors/volleyball.png" },
    { name: "NXGEN Premier League", caption: "League play · all ages", href: "https://nxgen.faeph.com", logo: "/sponsors/nxgen.png" },
    { name: "F.A.E. Bookings", caption: "Court rental · WiFi café", href: "https://bookings.faeph.com", logo: "/sponsors/fae.png" },
    { name: "LinkMePH", caption: "NFC cards · livestreams", href: "https://linkmeio.faeph.com", logo: "/sponsors/linkme.png" },
  ],
};
