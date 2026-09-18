import { createFileRoute } from "@tanstack/react-router";
import { LegalDoc } from "@/components/legal-doc";

export const Route = createFileRoute("/legal/refund-policy")({
  head: () => ({ meta: [{ title: "Refund Policy — NXGEN Premier League" }, { name: "description", content: "NXGEN operates a no-refund policy. Once a payment is transacted it is final; exceptions are handled by league management at their discretion." }] }),
  component: () => (
    <LegalDoc title="Refund Policy" updated="2026-09-11">
      <p>
        NXGEN Premier League is operated by <strong>FAE Sports Management Services</strong>. This policy applies to all
        registration fees, wallet top-ups, café and merchandise purchases, and any other payment made to the League.
      </p>

      <h2>No refund after a transaction</h2>
      <p>
        <strong>All payments are final once transacted.</strong> A completed payment is not refunded on request. This
        covers, without limitation, a player or team withdrawing, failing to appear for scheduled games, being suspended
        or expelled for misconduct, or simply losing interest in the season. Fees pay for costs the League commits to in
        advance — venue, officials, equipment and production — which cannot be recovered after the fact.
      </p>

      <h2>Exceptions are handled by management</h2>
      <p>
        There is no self-service refund request on this site. If you believe your situation warrants an exception, raise
        it <strong>directly with league management in person or through the League's official contact channels</strong>.
        Management will review the circumstances and decide at their sole discretion. Any exception granted is a goodwill
        decision by management and does not change this no-refund policy or create an entitlement for anyone else.
      </p>

      <h2>Cancelled events</h2>
      <p>
        If NXGEN cancels an entire division or season before its first scheduled game, affected registrants may receive a
        credit toward a future season or a refund, at the League's discretion. This is the one circumstance the League
        initiates itself.
      </p>

      <h2>Questions</h2>
      <p>
        Speak with league management at F.A.E. Court, Lipa City, or reach out through the League's published contact
        channels. This policy is read together with the <a href="/legal/terms">Terms of Service</a>.
      </p>
    </LegalDoc>
  ),
});
