import { createFileRoute } from "@tanstack/react-router";
import { LegalDoc } from "@/components/legal-doc";

export const Route = createFileRoute("/legal/waiver")({
  head: () => ({ meta: [{ title: "Liability Waiver — NXGEN Premier League" }, { name: "description", content: "Assumption of risk, health declaration and release of liability for NXGEN participants (Philippines)." }] }),
  component: () => (
    <LegalDoc title="Liability Waiver & Release of Claims" updated="2026-07-19">
      <p>
        This waiver is executed in the Republic of the Philippines by every participant of NXGEN Premier League ("NXGEN", "League", "we", "us"). By registering, checking in, or setting foot on the playing floor at <strong>F.A.E. Court</strong> or any NXGEN venue, you confirm you have read, understood and agree to be bound by every clause below.
      </p>

      <h2>1. Voluntary participation</h2>
      <p>You are joining the League of your own free will. No one from NXGEN has forced, pressured or induced you to participate.</p>

      <h2>2. Health declaration</h2>
      <p>You represent and warrant that:</p>
      <ul>
        <li>You are in <strong>good physical and mental health</strong> and medically fit to play competitive basketball.</li>
        <li>You have consulted a physician if you have any pre-existing condition (cardiac, respiratory, musculoskeletal, neurological, diabetic, etc.) and have been cleared to play.</li>
        <li>You are not under the influence of alcohol, prohibited drugs, or medication that impairs judgment or reflexes when on court.</li>
        <li>You will immediately stop playing and inform league staff if you experience chest pain, dizziness, shortness of breath, or any symptom of injury.</li>
      </ul>
      <p><strong>Any injury, aggravation of a pre-existing condition, illness, disability or death arising from or in connection with your participation shall be at your own risk and account.</strong></p>

      <h2>3. Assumption of risk</h2>
      <p>Basketball is a contact sport. You knowingly and voluntarily assume all risks — known and unknown, foreseen and unforeseen — that come with participation, including but not limited to sprains, fractures, concussion, dental injury, cardiac events, permanent disability and, in the worst case, death. You accept that courts, floors, equipment, opponents and referees are not risk-free.</p>

      <h2>4. Release and waiver of claims</h2>
      <p>To the fullest extent permitted by Philippine law, you hereby <strong>release, waive, discharge and forever hold harmless</strong> NXGEN Premier League, its organizers, officers, employees, volunteers, coaches, referees, medical staff, sponsors, venue owners (including F.A.E. Court), and fellow participants from any and all claims, demands, actions, causes of action, damages, costs and expenses of any nature, whether in contract, quasi-delict or otherwise, arising from personal injury, property loss or damage, illness or death sustained in connection with the League.</p>
      <p>This release does not cover liability arising from gross negligence or willful misconduct, which remain governed by the Civil Code of the Philippines.</p>

      <h2>5. Emergency medical authorization</h2>
      <p>You authorize NXGEN staff and any attending medical personnel to administer first aid and, if needed, arrange transport to a hospital at your expense. You confirm that your emergency contact information on file is current.</p>

      <h2>6. Insurance</h2>
      <p>NXGEN does not provide personal accident or medical insurance. You are strongly advised to secure your own coverage. Any medical or hospital bill is your sole responsibility.</p>

      <h2>7. Rules and Code of Conduct</h2>
      <p>You agree to abide by the official rules of play, the Code of Conduct, and any lawful instruction of league staff, referees or venue security. Violations may result in ejection, suspension or permanent removal without refund.</p>

      <h2>8. Minors (under 18)</h2>
      <p>If the participant is a minor, this waiver must be co-signed by a parent or legal guardian, who accepts all obligations on the minor's behalf.</p>
      <p>
        A guardian also signs the <a href="/legal/minor-consent">Parental Consent &amp; Media Release</a>, which governs how
        the minor's image and statistics may be used and sets out the privacy rules that keep a minor off the public site.
        No minor is cleared to play until both are on file.
      </p>

      <h2>9. Governing law and venue</h2>
      <p>This waiver is governed by the laws of the Republic of the Philippines. Any dispute shall be resolved before the proper courts of Batangas, to the exclusion of any other venue.</p>

      <h2>10. Digital acceptance</h2>
      <p>Ticking the acceptance box during online registration, signing the paper waiver at check-in, or otherwise entering the playing floor constitutes your full, informed and binding acceptance of every clause above.</p>
    </LegalDoc>
  ),
});
