import type { ReactNode } from "react";

/**
 * Shared shell for legal / policy pages. Consistent typography and spacing
 * around raw prose blocks — no `dangerouslySetInnerHTML`.
 */
export function LegalDoc({ title, updated, children }: { title: string; updated?: string; children: ReactNode }) {
  return (
    <article className="prose prose-invert max-w-none [&_h2]:mt-8 [&_h2]:text-xs [&_h2]:font-black [&_h2]:uppercase [&_h2]:tracking-[0.3em] [&_h2]:text-muted-foreground [&_p]:text-sm [&_p]:leading-relaxed [&_li]:text-sm [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-1">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">Legal</p>
      <h1 className="mt-2 text-4xl font-black uppercase">{title}</h1>
      {updated && <p className="mt-1 text-xs text-muted-foreground">Last updated {updated}</p>}
      <div className="mt-8 space-y-4">{children}</div>
    </article>
  );
}
