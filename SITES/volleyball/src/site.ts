/**
 * Everything that differs between volleyball.faeph.com and basketball.faeph.com.
 * The page (routes/index.tsx), shell and styles are the same NXGEN-derived code in
 * both SITES/basketball and SITES/volleyball — edit copy and links here only.
 *
 * Sources: the FAE Volleyball enrollment ad (05-BRAND-AND-MEDIA/Video-Renders/
 * FAEVBALLLIVEADD.mp4). No public volleyball Facebook page was found, so Messenger and
 * Facebook point at the main FilAm Elite page until the volleyball page link is added.
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

const FAE_FB = "https://www.facebook.com/FilAmEliteBasketball";
const MESSENGER = "https://m.me/FilAmEliteBasketball";

export const site: Site = {
  sport: "Volleyball",
  name: "FilAmElite Volleyball",
  url: "https://volleyball.faeph.com",
  logo: "/brand/logo.png",
  slogan: "/brand/slogan.png",
  wordmark: "FILAMELITE",
  badge: "Year-round training · Open for enrollment",
  tagline: "Skills, game IQ and vertical training. All year round.",
  meta: "12 training meetings per batch · Developmental tournaments",
  place: "Lipa City, Batangas",
  hero: { video: "/media/hero.mp4", poster: "/media/hero.jpg" },
  enroll: { label: "Enroll now", href: MESSENGER },
  heroLink: { lead: "Need a court?", label: "Book F.A.E. Court", href: "https://bookings.faeph.com" },
  ticker: ["Year-round training", "Game IQ & development", "Vertical training with Coach Jr", "Developmental tournaments", "Open for enrollment", "Earned Not Given"],
  stats: [
    { value: "6", label: "Batches trained" },
    { value: "5", label: "Tournament seasons" },
    { value: "12", label: "Meetings per batch" },
    { value: "6", label: "Games guaranteed" },
  ],
  programs: [
    { title: "Volleyball Training", meta: ["12 TRAINING MEETINGS", "SKILLS · GAME IQ · TACTICS"], fee: "₱4,500", per: "/ 12 meetings", href: "#training", icon: "whistle" },
    { title: "Developmental Tournaments", meta: ["SEASONS 1–5 PLAYED", "6 GAMES GUARANTEED"], fee: "₱1,500", per: "tournament fee", href: "#tournaments", icon: "trophy" },
    { title: "Vertical Training", meta: ["WITH COACH JR", "IN EVERY BATCH"], fee: "Included", href: "#training", icon: "bolt" },
    { title: "Court Rental", meta: ["F.A.E. COURT · LIPA CITY", "BOOK BY THE HOUR"], fee: "Book a court", href: "https://bookings.faeph.com", logo: "/sponsors/fae.png" },
  ],
  training: {
    price: "₱4,500",
    per: "12 meetings",
    groups: [
      { label: "12 training meetings", items: ["Basic volleyball skill fundamentals", "Game IQ & development", "Offense & defense game tactics", "Athletic training modules", "Vertical training with Coach Jr"] },
    ],
    awards: ["Certificate of recognition", "Special awards"],
  },
  tournament: {
    fee: "₱1,500",
    items: ["Certificate of participation", "Medals: champion, 1st, 2nd & 3rd runner-up", "Mythical 6 & Finals MVP", "Game footage: photos + FB Live", "Player of the Game posts", "6 games guaranteed", "Semi-final & championship rounds"],
  },
  schedule: [
    { day: "SAT", group: "TRAINING", time: "1:00 – 4:00 PM" },
    { day: "SUN", group: "TRAINING", time: "11:00 AM – 12:00 PM" },
  ],
  coaches: {
    image: "/media/staff.webp",
    alt: "FilAmElite Volleyball coaching staff and management",
    people: [
      { name: "Coach Jazzy", role: "Head Coach, FilAmElite Volleyball" },
      { name: "Coach Jr", role: "Athletic Performance & Vertical Coach", note: "In partnership with FilAmElite Basketball" },
    ],
  },
  vision: "Volleyball training methods and programs that teach athletes moral values. Our dedicated coaches work with you to reach your ambitions as an athlete and prosper as an individual.",
  mission: "Guiding home-grown Filipinos nationwide to their maximum potential, with methods and techniques built for skill and IQ development. Together we train for efficiency.",
  record: {
    title: "Five seasons. Six batches.",
    series: ["Season 1", "Season 2", "Season 3", "Season 4", "Season 5"],
    images: [
      { src: "/media/tournaments.webp", alt: "Team photos from FilAmElite Volleyball developmental tournaments, seasons 1 to 5", caption: "Developmental tournaments · Seasons 1–5" },
      { src: "/media/batches.webp", alt: "Group photos of FilAmElite Volleyball batches 1 to 6", caption: "Batches 1–6" },
    ],
  },
  kit: [
    { src: "/kit/boys.webp", alt: "2026 boys batch uniform" },
    { src: "/kit/girls.webp", alt: "2026 girls batch uniform" },
    { src: "/kit/tournament-dark.webp", alt: "Tournament uniform, dark" },
    { src: "/kit/tournament-light.webp", alt: "Tournament uniform, light" },
    { src: "/kit/coaches.webp", alt: "2026 coaches uniform" },
  ],
  film: { src: "/media/film.mp4", poster: "/media/film.jpg", blurb: "Coaches, inclusions, schedule and five seasons of tournaments, in one film." },
  socials: [
    { label: "Messenger", href: MESSENGER },
    { label: "FilAm Elite on Facebook", href: FAE_FB },
  ],
  contact: {
    phone: "+639175018835",
    phoneLabel: "0917 501 8835",
    email: "filamelitebasketball@gmail.com",
    address: "Lipa City, Batangas",
  },
  sponsors: [
    { name: "Picklemania", logo: "/sponsors/picklemania.png" },
    { name: "Aguila Auto Glass", logo: "/sponsors/aguila.png" },
    { name: "VA", logo: "/sponsors/va.png" },
    { name: "FilAmElite Basketball", logo: "/sponsors/basketball.png" },
    { name: "NXGEN Premier League", logo: "/sponsors/nxgen.png" },
  ],
  network: [
    { name: "FAE Hub", caption: "FilAmElite Management", href: "https://faeph.com", logo: "/sponsors/fae.png" },
    { name: "FilAmElite Basketball", caption: "Training & tournaments", href: "https://basketball.faeph.com", logo: "/sponsors/basketball.png" },
    { name: "NXGEN Premier League", caption: "League play · all ages", href: "https://nxgen.faeph.com", logo: "/sponsors/nxgen.png" },
    { name: "F.A.E. Bookings", caption: "Court rental · WiFi café", href: "https://bookings.faeph.com", logo: "/sponsors/fae.png" },
    { name: "LinkMePH", caption: "NFC cards · livestreams", href: "https://linkmeio.faeph.com", logo: "/sponsors/linkme.png" },
  ],
};
