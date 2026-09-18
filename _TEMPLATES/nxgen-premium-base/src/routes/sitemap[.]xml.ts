import { SITE_URL as BASE_URL } from "@/lib/site-url";
import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";


interface SitemapEntry {
  path: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const entries: SitemapEntry[] = [
          { path: "/", changefreq: "weekly", priority: "1.0" },
          { path: "/register", changefreq: "weekly", priority: "0.9" },
          { path: "/schedule", changefreq: "daily", priority: "0.8" },
          { path: "/standings", changefreq: "daily", priority: "0.8" },
          { path: "/leaders", changefreq: "daily", priority: "0.8" },
          { path: "/rankings", changefreq: "daily", priority: "0.8" },
          { path: "/teams", changefreq: "weekly", priority: "0.7" },
          { path: "/divisions/rising-stars", changefreq: "monthly", priority: "0.8" },
          { path: "/divisions/legacy", changefreq: "monthly", priority: "0.8" },
          { path: "/divisions/3x3", changefreq: "monthly", priority: "0.8" },
          { path: "/divisions/king-of-the-court", changefreq: "monthly", priority: "0.8" },
          { path: "/faq", changefreq: "monthly", priority: "0.7" },
          { path: "/gallery", changefreq: "weekly", priority: "0.6" },
          { path: "/sponsors", changefreq: "monthly", priority: "0.6" },
          { path: "/archive", changefreq: "monthly", priority: "0.5" },
          { path: "/development", changefreq: "monthly", priority: "0.7" },
          { path: "/legal", changefreq: "yearly", priority: "0.3" },
          { path: "/legal/privacy", changefreq: "yearly", priority: "0.3" },
          { path: "/legal/terms", changefreq: "yearly", priority: "0.3" },
          { path: "/legal/waiver", changefreq: "yearly", priority: "0.3" },
          { path: "/legal/code-of-conduct", changefreq: "yearly", priority: "0.3" },
          { path: "/legal/refund-policy", changefreq: "yearly", priority: "0.3" },
        ];

        const urls = entries.map((e) =>
          [
            `  <url>`,
            `    <loc>${BASE_URL}${e.path}</loc>`,
            e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
            e.priority ? `    <priority>${e.priority}</priority>` : null,
            `  </url>`,
          ].filter(Boolean).join("\n"),
        );

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...urls,
          `</urlset>`,
        ].join("\n");

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
