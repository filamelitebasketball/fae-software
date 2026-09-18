import { SITE_URL } from "@/lib/site-url";
import { createFileRoute } from "@tanstack/react-router";
import { LegalDoc } from "@/components/legal-doc";

export const Route = createFileRoute("/legal/minor-consent")({
  head: () => ({
    meta: [
      { title: "Parental Consent & Media Release — NXGEN Premier League" },
      { name: "description", content: "Guardian consent and media release for players under 18 in NXGEN Premier League — what a public player profile shows, and how to withdraw." },
      { property: "og:title", content: "Parental Consent & Media Release — NXGEN Premier League" },
      { property: "og:description", content: "Guardian consent and media release for players under 18 in NXGEN Premier League — what a public player profile shows, and how to withdraw." },
      { property: "og:url", content: `${SITE_URL}/legal/minor-consent` },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/legal/minor-consent` }],
  }),
  component: () => (
    <LegalDoc title="Parental Consent & Media Release" updated="2026-09-11">
      <p>
        This form is signed by the parent or legal guardian of every player <strong>under eighteen (18) years of
        age</strong> ("the Minor") before that player is cleared to compete in NXGEN Premier League ("NXGEN", "the
        League"). It is read together with the <a href="/legal/waiver">Liability Waiver</a>, the{" "}
        <a href="/legal/terms">Terms of Service</a> and the <a href="/legal/privacy">Privacy Policy</a>.
      </p>
      <p>
        No account for a Minor becomes active, and no Minor is fielded in a game, until this consent is recorded against
        the player's record with the guardian's name, relationship, contact details, and the date and time of signing.
      </p>

      <h2>1. Who signs, and what they are confirming</h2>
      <p>By signing, you confirm that:</p>
      <ul>
        <li>You are the Minor's <strong>parent or legal guardian</strong> and have the authority to give this consent.</li>
        <li>The Minor's name, date of birth and division are accurate. Misstated age is grounds for disqualification under the Terms.</li>
        <li>You have read the Liability Waiver and accept every obligation in it <strong>on the Minor's behalf and in your own right</strong>.</li>
        <li>You have discussed participation with the Minor and the Minor is taking part willingly.</li>
      </ul>
      <p>
        A guardian registering more than one Minor signs this form once per child. Consent given for one child is never
        read as consent for a sibling.
      </p>

      <h2>2. What this consent publishes, and what it does not</h2>
      <p>
        NXGEN is a place where players are found. A player profile is a basketball r&eacute;sum&eacute; &mdash; statistics,
        position, highlights and history in one place &mdash; built to be seen by scouts, coaches, recruiters and the wider
        basketball community. <strong>This consent is what allows the Minor's profile to be published.</strong> Until you
        sign it, the Minor's profile stays private.
      </p>
      <p>Once you sign, and while the Minor's profile is set to public, the following may be seen by anyone:</p>
      <ul>
        <li>name, photograph, division, team, jersey number and position;</li>
        <li>height and weight where supplied;</li>
        <li>game statistics, season averages, standings and highlight clips;</li>
        <li>a shareable player card that you or the Minor may post.</li>
      </ul>
      <p>
        These pages may be indexed by search engines and may be viewed without an account, which is what lets a scout find
        the player in the first place.
      </p>
      <p>
        <strong>What is never published, at any access level:</strong> date of birth, home address, contact number, email
        address, your details as guardian, medical information, and payment or wallet records. Those are visible only to
        League administrators who need them to run the League.
      </p>
      <p>
        <strong>Contact with the Minor is routed through the League.</strong> A scout or recruiter who wants to reach the
        Minor goes through NXGEN and through you. Scouts are not given the Minor's contact details, so an interested
        recruiter cannot approach a child directly.
      </p>
      <p>
        <strong>You keep control.</strong> The Minor's profile can be switched back to private from the guardian's account
        at any time, and withdrawing this consent under section 5 does the same thing immediately. Material already shared,
        downloaded or cached elsewhere cannot be recalled.
      </p>

      <h2>3. Media release — photographs, video and livestream</h2>
      <p>
        League games, practices, tryouts, awarding and events at F.A.E. Court are photographed, recorded and livestreamed.
        By signing, you grant NXGEN Premier League, <strong>FAE Sports Management Services</strong> and <strong>F.A.E.
        Court</strong> (together, "the Organisation") a worldwide, royalty-free, non-exclusive and perpetual right to
        record, reproduce, edit, publish, broadcast and distribute the Minor's <strong>name, image, likeness, jersey
        number, voice, team affiliation and game statistics</strong>.
      </p>
      <p>That material may be used for:</p>
      <ul>
        <li>League coverage — livestreams, replays, highlight reels, box scores, standings, and player-of-the-game posts;</li>
        <li>the Organisation's websites, social media accounts and printed materials;</li>
        <li>promotion, advertising and sponsorship of the League, the Organisation's programmes, and F.A.E. Court as a venue;</li>
        <li>scouting, training, coaching and officiating review;</li>
        <li>archival and historical records of the League.</li>
      </ul>
      <p>
        <strong>No payment is due to the Minor or to you</strong> for any of these uses, and you waive any right to inspect
        or approve a specific finished item before it is published.
      </p>
      <p>
        The Organisation will not license or sell footage of a Minor to a third party for that party's own advertising
        without asking you separately first. Sponsor logos appearing in League coverage the Minor happens to feature in are
        not treated as a third-party licence.
      </p>
      <p>
        <strong>You may object to a specific item.</strong> Write to the League and identify the photograph, clip or post.
        The Organisation will remove it from the channels it controls within a reasonable period. Material already
        broadcast live, already downloaded by others, or reposted by third parties cannot be recalled, and printed matter
        already distributed will not be reprinted.
      </p>

      <h2>4. Personal data of a Minor</h2>
      <p>
        The Organisation processes the Minor's personal data as a personal information controller under the{" "}
        <strong>Data Privacy Act of 2012 (Republic Act No. 10173)</strong> and its implementing rules. For a Minor, this
        consent is the lawful basis, and you give it.
      </p>
      <p>
        <strong>What is collected:</strong> full name, date of birth, division, team, jersey number, photograph, height and
        weight where supplied, game statistics, attendance and check-in records, RFID bracelet identifier where one is
        issued, wallet and café transaction history, and your own name, relationship and contact details as guardian.
      </p>
      <p>
        <strong>Retention:</strong> competition records — results, standings and statistics — are kept as part of the
        League's permanent historical record. Contact details, bracelet identifiers and transaction history are kept only
        while needed to operate the League and to meet tax and accounting obligations, then deleted.
      </p>
      <p>
        <strong>Your rights as the Minor's guardian:</strong> to be informed, to access, to correct, to object, to request
        erasure or blocking, to data portability, and to lodge a complaint with the National Privacy Commission. Exercise
        them through the League's published contact channels; we respond within the period the law allows.
      </p>

      <h2>5. Withdrawing this consent</h2>
      <p>You may withdraw this consent at any time, in writing, without giving a reason. On withdrawal:</p>
      <ul>
        <li>the Minor's profile returns to private and leaves the public pages;</li>
        <li>scout access to their record ends immediately;</li>
        <li>future publication of their image by the Organisation stops;</li>
        <li>if you also withdraw participation, the Minor stops being fielded in League games.</li>
      </ul>
      <p>
        Withdrawal does not undo what was lawfully done while the consent was in force, does not erase the historical
        result of a game already played, and does not entitle you to a refund of fees already paid. See the{" "}
        <a href="/legal/refund-policy">Refund Policy</a>.
      </p>

      <h2>6. Health, emergency care and supervision</h2>
      <p>
        You confirm the Minor is medically fit to play competitive basketball and that you have disclosed any condition the
        League should know about. You authorise League staff and attending medical personnel to give first aid and, if
        needed, to arrange transport to a hospital — at your expense — when you cannot be reached in time.
      </p>
      <p>
        The League is not a childcare service. Supervision of a Minor before and after their scheduled game time remains
        with you or an adult you designate. NXGEN does not provide personal accident or medical insurance; you are strongly
        advised to secure your own.
      </p>

      <h2>7. Conduct</h2>
      <p>
        The <a href="/legal/code-of-conduct">Code of Conduct</a> applies to the Minor and to you as their guardian, at the
        venue, in League communications, and on social media. Guardian misconduct toward officials, staff, opponents or
        other spectators may result in sanctions against the Minor's team, including the Minor's suspension.
      </p>

      <h2>8. How this consent is signed and recorded</h2>
      <p>
        Consent is given by completing the guardian section during registration, or through the consent link the League
        sends you, and confirming acceptance. The League records your full name, relationship to the Minor, contact
        details, and the date and time of acceptance against the player's record. That record is the evidence of consent.
      </p>
      <p>
        An electronic acceptance carries the same effect as a handwritten signature under the{" "}
        <strong>Electronic Commerce Act of 2000 (Republic Act No. 8792)</strong>.
      </p>

      <h2>9. Governing law</h2>
      <p>
        This consent is governed by the laws of the Republic of the Philippines. Any dispute that cannot be settled through
        the League's internal process shall be brought before the proper courts of Lipa City, Batangas, to the exclusion of
        other venues.
      </p>

      <h2>10. Acknowledgement</h2>
      <p>
        By accepting, you confirm that you have read this form in full, that you understand the Minor's profile becomes
        publicly visible as described in section 2, that you are giving up the Minor's and your own right to claim payment
        for the uses in section 3, and that you sign freely.
      </p>
    </LegalDoc>
  ),
});
