import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

export function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
}) {
  return (
    <section className="border-b border-border bg-secondary/30">
      <div className="mx-auto max-w-6xl px-4 py-12 md:py-16">
        {eyebrow ? (
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-blue">{eyebrow}</p>
        ) : null}
        <h1 className="mt-3 text-3xl font-bold text-foreground md:text-5xl">{title}</h1>
        {description ? (
          <p className="mt-4 max-w-2xl text-sm text-muted-foreground md:text-base">{description}</p>
        ) : null}
      </div>
    </section>
  );
}
