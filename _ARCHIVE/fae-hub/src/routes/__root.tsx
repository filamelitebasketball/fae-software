import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { AuthProvider } from "@/components/fae/AuthProvider";
import { Nav } from "@/components/fae/Nav";
import { ContactFab } from "@/components/fae/ContactFab";
import { ToastProvider } from "@/components/fae/Toast";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-7xl font-black text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-xl font-bold tracking-tight text-foreground">This page didn't load</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-lg border border-border bg-surface-2 px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-goldline"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "F.A.E. Court — Lipa City hoops, volleyball & pickleball" },
      {
        name: "description",
        content:
          "F.A.E. Court in Lipa City, Batangas. Book basketball, volleyball and pickleball by the hour, join Filam Elite, and run your league season from one account.",
      },
      { name: "author", content: "F.A.E. Corp" },
      { property: "og:title", content: "F.A.E. Court — Lipa City hoops, volleyball & pickleball" },
      {
        property: "og:description",
        content:
          "Book basketball, volleyball and pickleball by the hour at F.A.E. Court, Lipa City, Batangas. Home of Filam Elite.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Archivo:wght@700;800;900&family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SportsActivityLocation",
              name: "F.A.E. Court",
              description:
                "Basketball, volleyball and pickleball courts for hourly rental in Lipa City, Batangas. Home of Filam Elite.",
              address: {
                "@type": "PostalAddress",
                streetAddress: "F.A.E. Court",
                addressLocality: "Lipa City",
                addressRegion: "Batangas",
                addressCountry: "PH",
              },
              geo: { "@type": "GeoCoordinates", latitude: 13.9352049, longitude: 121.1154848 },
              telephone: "+639175018835",
              email: "hello@faecourt.ph",
              openingHoursSpecification: [
                {
                  "@type": "OpeningHoursSpecification",
                  dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
                  opens: "04:00",
                  closes: "00:00",
                },
                { "@type": "OpeningHoursSpecification", dayOfWeek: "Sunday", opens: "00:00", closes: "23:59" },
              ],
              sport: ["Basketball", "Volleyball", "Pickleball"],
            }),
          }}
        />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider queryClient={queryClient}>
        <ToastProvider>
          <Nav />
          <Outlet />
          <ContactFab />
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
