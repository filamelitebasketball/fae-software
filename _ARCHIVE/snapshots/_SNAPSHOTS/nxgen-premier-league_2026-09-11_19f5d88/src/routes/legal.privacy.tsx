import { createFileRoute } from "@tanstack/react-router";
import { LegalDoc } from "@/components/legal-doc";

export const Route = createFileRoute("/legal/privacy")({
  head: () => ({ meta: [{ title: "Privacy & Media Consent — NXGEN Premier League" }, { name: "description", content: "How NXGEN Premier League collects, uses and protects your personal data under the Philippines Data Privacy Act (RA 10173), and the media consent granted by all participants." }] }),
  component: () => (
    <LegalDoc title="Privacy Policy & Media Consent" updated="2026-07-19">
      <p>
        NXGEN Premier League ("NXGEN", "the League") is operated by <strong>FAE Sports Management Services</strong>, a
        business name registered with the Philippine Department of Trade and Industry, at F.A.E. Court, Lipa City,
        Batangas. FAE Sports Management Services ("we", "us") is the <strong>personal information controller</strong> for
        the data described below, and is who you contact to exercise any of the rights in section 7.
      </p>
      <p>
        We are committed to protecting your personal data in accordance with <strong>Republic Act No. 10173 — the Data Privacy Act of 2012</strong>, its Implementing Rules and Regulations, and the issuances of the National Privacy Commission (NPC).
      </p>

      <h2>1. Personal information we collect</h2>
      <ul>
        <li><strong>Identity & contact</strong>: full name, date of birth, email, mobile number, address (if provided), emergency contact.</li>
        <li><strong>Player profile</strong>: division, team, position, jersey number, height/weight, photo, bio, social media handles.</li>
        <li><strong>Financial</strong>: wallet balance, café/merch transactions, payment proofs (GCash, Maya, bank).</li>
        <li><strong>Device / usage</strong>: bracelet RFID UID linked to your account, log-in timestamps, IP address, browser type.</li>
        <li><strong>Health-adjacent</strong>: physical stats you self-report (height, weight) and emergency medical contact.</li>
      </ul>

      <h2>2. Why we collect it (lawful basis)</h2>
      <p>Under Sections 12 and 13 of RA 10173, we process your data based on:</p>
      <ul>
        <li><strong>Your consent</strong>, given at registration.</li>
        <li><strong>Contractual necessity</strong> — operating the league, tracking stats, managing your wallet and services availed.</li>
        <li><strong>Legitimate interests</strong> — safeguarding participants, preventing fraud, protecting venue property.</li>
        <li><strong>Legal obligation</strong> — responding to lawful requests by government or the NPC.</li>
      </ul>

      <h2>3. Media consent</h2>
      <p>By joining NXGEN you <strong>irrevocably grant NXGEN Premier League and its authorised partners the perpetual, worldwide, royalty-free right</strong> to photograph, film, livestream, record, edit, publish, broadcast, and use your name, likeness, image, jersey number, voice, on-court performance and post-game interviews for:</p>
      <ul>
        <li>League broadcasts, replays and highlight reels (Facebook, YouTube, TikTok, Instagram, and future platforms).</li>
        <li>Marketing and promotional material for NXGEN, its sponsors and its venue partners (including F.A.E. Court).</li>
        <li>Editorial coverage, "Player of the Game" features, press releases and social posts.</li>
      </ul>
      <p>You waive any right to inspect or approve the finished product and any right to compensation from such use. You may request removal of any specific piece of content from NXGEN-owned channels; NXGEN will act reasonably but cannot guarantee removal from re-shared third-party copies.</p>

      <h2>4. Sharing your data</h2>
      <p>We do not sell your personal data. We share it only with:</p>
      <ul>
        <li>Referees, statisticians and coaches who need it to run games.</li>
        <li>Payment providers, cloud hosting and analytics vendors bound by confidentiality.</li>
        <li>Government agencies and law enforcement when compelled by law.</li>
      </ul>
      <p>Public pages (leaderboards, player cards, standings) display only your public profile fields: name, photo, division, team, position, jersey, bio, social handles, and on-court statistics. You can hide your player card by turning off "Public Profile" in Settings.</p>

      <h2>5. Retention</h2>
      <p>We retain your account and stats for as long as you remain an active NXGEN participant and for up to <strong>five (5) years</strong> after your last activity, for historical, statistical and legal-defence purposes. Financial records are retained for the period required by BIR and applicable Philippine law.</p>

      <h2>6. Your rights under the Data Privacy Act</h2>
      <p>You have the right to be informed, to object, to access, to rectify, to erase or block, to damages, to data portability, and to file a complaint with the National Privacy Commission (<a href="https://www.privacy.gov.ph" target="_blank" rel="noreferrer">privacy.gov.ph</a>). To exercise any right, contact our Data Protection Officer via the channels below.</p>

      <h2>7. Security</h2>
      <p>We apply reasonable and appropriate organisational, physical and technical safeguards — encrypted transport (HTTPS), role-based access control, and audit logs on admin actions.</p>

      <h2>8. Data Protection Officer</h2>
      <p>
        Email: <a href="mailto:hello@nxgenleague.com">hello@nxgenleague.com</a><br />
        Phone: +63 917 501 8835<br />
        Venue address: F.A.E. Court, Lipa City, Batangas, Philippines.
      </p>

      <p className="mt-8 text-xs text-muted-foreground">
        By registering or by continuing to use the site, you confirm that you have read this Privacy Policy and Media Consent and that you agree to the collection, use and disclosure of your personal data on the terms set out above.
      </p>
    </LegalDoc>
  ),
});
