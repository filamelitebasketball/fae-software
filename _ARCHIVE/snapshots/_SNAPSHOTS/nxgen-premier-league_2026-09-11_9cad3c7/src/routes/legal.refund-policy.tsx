import { createFileRoute } from "@tanstack/react-router";
import { LegalDoc } from "@/components/legal-doc";

export const Route = createFileRoute("/legal/refund-policy")({
  head: () => ({ meta: [{ title: "Refund Policy — NXGEN Premier League" }, { name: "description", content: "How registration fees and wallet balances are refunded." }] }),
  component: () => (
    <LegalDoc title="Refund Policy" updated="2026-01-01">
      <h2>Registration fees</h2><ul><li>Full refund if requested more than 14 days before season tip-off.</li><li>50% refund between 14 and 7 days before tip-off.</li><li>No refund within 7 days of tip-off or after the first game is played.</li></ul>
      <h2>Wallet balances</h2><p>Unused wallet balances can be refunded on request at any time. Café and merch purchases already posted are non-refundable unless the item was defective or the service was not delivered.</p>
      <h2>Cancelled events</h2><p>If NXGEN cancels a full season or division, all registration fees are refunded in full or, at your option, credited to a future season.</p>
      <h2>Process</h2><p>Request refunds via the contact form. Approved refunds are issued within 10 business days to the original payment method or wallet.</p>
    </LegalDoc>
  ),
});
