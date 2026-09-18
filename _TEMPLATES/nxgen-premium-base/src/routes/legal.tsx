import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { BackButton } from "@/components/back-button";

export const Route = createFileRoute("/legal")({
  component: LegalLayout,
});

const PAGES = [
  { to: "/legal/privacy", label: "Privacy" },
  { to: "/legal/terms", label: "Terms" },
  { to: "/legal/waiver", label: "Waiver" },
  { to: "/legal/minor-consent", label: "Minor Consent" },
  { to: "/legal/code-of-conduct", label: "Code of Conduct" },
  { to: "/legal/refund-policy", label: "Refund Policy" },
] as const;

function LegalLayout() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <BackButton fallback="/" />
            <Link to="/" className="text-sm font-bold uppercase tracking-widest">NXGEN</Link>
          </div>
          <nav className="hidden gap-4 text-xs uppercase tracking-widest text-muted-foreground md:flex">
            {PAGES.map((p) => (
              <Link key={p.to} to={p.to} className="hover:text-foreground" activeProps={{ className: "text-foreground" }}>
                {p.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-16">
        <Outlet />
      </main>
    </div>
  );
}
