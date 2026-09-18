import { createFileRoute } from "@tanstack/react-router";
import { LegalDoc } from "@/components/legal-doc";

export const Route = createFileRoute("/legal/code-of-conduct")({
  head: () => ({ meta: [{ title: "Code of Conduct — NXGEN Premier League" }, { name: "description", content: "Standards of behavior for all NXGEN participants and spectators." }] }),
  component: () => (
    <LegalDoc title="Code of Conduct" updated="2026-01-01">
      <h2>Respect</h2><p>Treat opponents, teammates, referees, staff, and spectators with respect at all times.</p>
      <h2>Fair play</h2><p>Play hard, play clean. Deliberate attempts to injure, taunt, or intimidate result in immediate ejection.</p>
      <h2>Zero tolerance</h2><p>Racism, harassment, threats, and violence are grounds for permanent removal from the league without refund.</p>
      <h2>Substances</h2><p>Alcohol and illegal substances are prohibited at all NXGEN events. Anyone under the influence will be removed.</p>
      <h2>Reporting</h2><p>Report incidents to any NXGEN staff member or via the contact form. All reports are reviewed by league admins.</p>
    </LegalDoc>
  ),
});
