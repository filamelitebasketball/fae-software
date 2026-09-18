import { SITE_URL } from "@/lib/site-url";
import { createFileRoute } from "@tanstack/react-router";
import { LegalDoc } from "@/components/legal-doc";

export const Route = createFileRoute("/legal/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — NXGEN Premier League" },
      { name: "description", content: "Eligibility, payments, conduct, liability, RFID data privacy, and dispute resolution terms for NXGEN Premier League." },
      { property: "og:title", content: "Terms of Service — NXGEN Premier League" },
      { property: "og:description", content: "Eligibility, payments, conduct, liability, RFID data privacy, and dispute resolution terms for NXGEN Premier League." },
      { property: "og:url", content: `${SITE_URL}/legal/terms` },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/legal/terms` }],
  }),
  component: () => (
    <LegalDoc title="Terms of Service" updated="2026-01-01">
      <p>
        These Terms of Service ("Terms") govern your access to and use of the NXGEN Premier League platform, facilities,
        and competitions. NXGEN Premier League ("NXGEN", "the League") is operated by{" "}
        <strong>FAE Sports Management Services</strong> ("we", "us"), a business name registered with the Philippine
        Department of Trade and Industry, out of F.A.E. Court, Lipa City, Batangas, Philippines. By creating an account,
        registering for a division, entering the venue, or participating in any League activity, you agree to be bound by
        these Terms.
      </p>
      <p>
        If you are registering on behalf of a team, you confirm that you have the authority to accept these Terms for every
        player on your roster and that you will communicate them to your players and their guardians.
      </p>

      <h2>1. Eligibility &amp; Registration Requirements</h2>
      <p>
        Participation is open to individuals who meet the age, skill, and residency requirements published for each
        division — Rising Stars, Legacy, 3x3, and King of the Court. Every registrant must submit accurate personal
        information, including full legal name, date of birth, and a working contact number. Falsified age, identity, or
        eligibility documents are grounds for immediate disqualification without refund, and any games affected may be
        recorded as forfeits.
      </p>
      <p>
        Players below eighteen (18) years of age must have a parent or legal guardian review and co-sign the registration,
        waiver, and consent forms before the player is cleared to compete. Guardian consent is collected through the
        League's consent link and is stored with the player's record.
      </p>
      <p>
        A registration is only considered complete once the entry form is submitted, the required documents are on file,
        and the League confirms the entry. NXGEN reserves the right to review, defer, or decline any registration, including
        where a division has reached capacity or where a player has an unresolved disciplinary record.
      </p>

      <h2>2. Payment &amp; No-Refund Policy</h2>
      <p>
        Registration fees are set per division and are announced at the time of registration. Fees may be settled through
        the payment channels published by the League. Payment instructions are provided directly to registrants after their
        entry is received; a slot is only reserved once payment is confirmed by League staff.
      </p>
      <p>
        <strong>All payments are final and non-refundable once transacted.</strong> This includes withdrawal by a player or
        team, failure to appear for scheduled games, suspension or expulsion for misconduct, and loss of interest in
        continuing the season. Fees cover operating costs — venue, officials, equipment, insurance administration, and
        production — that are committed in advance and cannot be recovered. Wallet balances, café charges, and merchandise
        purchases follow the same policy and are reconciled in-venue.
      </p>
      <p>
        There is <strong>no self-service refund request</strong> on this site. If you believe your situation warrants an
        exception, raise it directly with league management in person or through the League's official contact channels;
        management reviews and decides at its sole discretion, and any exception is a goodwill decision rather than an
        entitlement. Separately, where the League itself cancels an entire division before its first scheduled game,
        affected registrants may receive a credit toward a future season or a refund at the League's discretion. The full{" "}
        <a href="/legal/refund-policy">Refund Policy</a> governs.
      </p>

      <h2>3. Player Conduct &amp; Suspension Rules</h2>
      <p>
        Players, coaches, team officials, and accompanying supporters must conduct themselves respectfully toward
        opponents, referees, table officials, League staff, and spectators at all times, on and off the court. The Code of
        Conduct forms part of these Terms and applies at the venue, in League communications, and on public social media
        where NXGEN or its participants are identified.
      </p>
      <p>
        Prohibited conduct includes physical altercations, threats, abusive or discriminatory language, deliberate attempts
        to injure, tampering with scoring or officiating, damage to venue property, and attending games under the influence
        of alcohol or prohibited substances.
      </p>
      <p>
        Depending on severity, sanctions may include a warning, technical or flagrant penalties, game suspension,
        multi-game suspension, forfeiture of games, or permanent expulsion from the League. Suspensions and expulsions do
        not entitle the affected party to any refund of fees paid.
      </p>

      <h2>4. Liability &amp; Injury Waiver</h2>
      <p>
        Basketball is a contact sport that carries an inherent risk of injury, including sprains, fractures, concussions,
        and in rare cases catastrophic or fatal injury. By participating, you acknowledge that you have voluntarily assumed
        these risks and that you are in good physical health and medically fit to compete.
      </p>
      <p>
        <strong>NXGEN Premier League, its organizers, officers, staff, volunteers, sponsors, and the owners of F.A.E. Court
        are not liable for any injury, illness, aggravation of a pre-existing condition, loss, theft, or property damage
        sustained during games, practices, tryouts, events, or while on the premises</strong>, except where such liability
        cannot be excluded under Philippine law.
      </p>
      <p>
        Participants are responsible for their own medical and accident coverage. The League may arrange basic first aid at
        the venue, but any further medical treatment, transport, or hospitalization is at the participant's own cost. The
        separate Waiver you sign at registration supplements these Terms and is read together with this section.
      </p>

      <h2>5. RFID Bracelet &amp; Data Privacy</h2>
      <p>
        The League issues optional RFID bracelets that link to your player profile. The bracelet may be used for venue
        check-in, wallet balances, café or internet access, and merchandise or refreshment purchases. You are responsible
        for keeping your bracelet secure; transactions made with your bracelet are treated as authorized by you until you
        report it lost through your account.
      </p>
      <p>
        NXGEN collects and processes personal data — including your name, contact details, date of birth, photo, statistics,
        bracelet identifiers, and transaction history — in accordance with the Data Privacy Act of 2012 (Republic Act No.
        10173) and its implementing rules. Data is used to operate the League, verify eligibility, maintain records and
        standings, and process payments, and is retained only as long as necessary for those purposes.
      </p>
      <p>
        You have the right to be informed, to access, to correct, to object, and to request erasure or blocking of your
        personal data, subject to the League's legitimate and legal retention obligations. Requests may be sent to the
        League's contact channels published on the site. We do not sell personal data. Limited information may be shared
        with officials, venue operators, and payment providers strictly to run the League.
      </p>
      <p>
        Games, practices, tryouts, awarding and events are photographed, recorded and livestreamed. By participating, you
        grant NXGEN Premier League, <strong>FAE Sports Management Services</strong> and <strong>F.A.E. Court</strong>
        (together, "the Organisation") a worldwide, royalty-free, non-exclusive and perpetual right to record, reproduce,
        edit, publish, broadcast and distribute your <strong>name, image, likeness, jersey number, voice, team
        affiliation and game statistics</strong>.
      </p>
      <p>That material may be used for any purpose of the Organisation, including:</p>
      <ul>
        <li>League coverage &mdash; livestreams, replays, highlight reels, box scores, standings and player-of-the-game posts;</li>
        <li>the Organisation's websites, social media accounts and printed materials;</li>
        <li>promotion, advertising and sponsorship of the League, the Organisation's other programmes, and F.A.E. Court as a venue;</li>
        <li>training, coaching and officiating review;</li>
        <li>archival and historical records of the League.</li>
      </ul>
      <p>
        <strong>No additional compensation is due to you</strong> for any of these uses, and you waive any right to inspect
        or approve a finished item before it is published. You may object to a specific photograph, clip or post in
        writing, and the Organisation will remove it from channels it controls within a reasonable period; material already
        broadcast live, downloaded, or reposted by third parties cannot be recalled.
      </p>
      <p>
        <strong>For players under 18 this clause does not apply on its own.</strong> A minor's image and statistics are
        used only under the separate{" "}
        <a href="/legal/minor-consent">Parental Consent &amp; Media Release</a>, signed by a parent or legal guardian, and
        that form's stricter privacy rules prevail over anything in these Terms.
      </p>

      <h2>6. Player Visibility, Minors &amp; Access to the Player Pool</h2>
      <p>
        NXGEN exists so that players can be found. A player profile is a basketball r&eacute;sum&eacute; &mdash; statistics,
        position, highlights and history in one place &mdash; and it is built to be seen by scouts, coaches, recruiters and
        the wider community.
      </p>
      <p>
        <strong>Every player chooses.</strong> Making your profile public publishes your name, photo, division, team,
        jersey number, position, height and weight where supplied, game statistics, highlights, and any social handles you
        enter yourself. A public profile can be viewed and shared by anyone, on the site and off it, and may be indexed by
        search engines. You can turn this off from your account at any time; once off, your profile leaves the public
        pages, though material already shared or cached elsewhere cannot be recalled.
      </p>
      <p>
        <strong>Players under 18 need a guardian's consent before their profile is published.</strong> Until a parent or
        legal guardian signs the{" "}
        <a href="/legal/minor-consent">Parental Consent &amp; Media Release</a>, a minor's profile stays private. Once it
        is signed, the minor's profile works the same way as any other player's, because being discoverable is the point of
        having one. A guardian may withdraw that consent in writing at any time, and the profile returns to private.
      </p>
      <p>
        <strong>Scouts and recruiters</strong> may browse the player pool like any other visitor. The League additionally
        operates a verified Scout role for recruiters it has admitted, which carries fuller statistical access. For a
        player under 18, a scout's first contact is routed through the League and the player's guardian rather than sent
        directly &mdash; this protects the player and gives the guardian a record of who is asking.
      </p>
      <p>League administrators have full access to all records in order to operate the League.</p>

      <h2>7. League Authority &amp; Rule Changes</h2>
      <p>
        NXGEN Premier League reserves the right to modify division rules, formats, schedules, standings criteria, playoff
        qualification, venue assignments, fees for future seasons, and these Terms at any time. Changes are made to protect
        competitive balance, participant safety, and the operational viability of the season.
      </p>
      <p>
        Material changes will be announced on the website and through the League's official channels, and take effect on the
        date of posting unless a later date is stated. Continued participation after a change is published constitutes
        acceptance of the revised rules and Terms.
      </p>
      <p>
        The League may also postpone, relocate, shorten, or cancel games or an entire season due to events outside its
        reasonable control, including weather, calamity, public health directives, venue unavailability, or government
        orders.
      </p>

      <h2>8. Dispute Resolution</h2>
      <p>
        Protests concerning game results, officiating, eligibility, or standings must be filed in writing with League staff
        within twenty-four (24) hours of the game in question, together with any supporting evidence. Protests filed after
        this window will not be entertained.
      </p>
      <p>
        All protests, disciplinary matters, and interpretation disputes are reviewed by the League Commissioner or their
        designated panel. <strong>The decision of the League Commissioner is final and binding on all participants.</strong>
      </p>
      <p>
        These Terms are governed by the laws of the Republic of the Philippines. Any matter that cannot be resolved through
        the League's internal process shall be settled through good-faith negotiation and, failing that, in the proper
        courts of Lipa City, Batangas, Philippines, to the exclusion of other venues.
      </p>
    </LegalDoc>
  ),
});
