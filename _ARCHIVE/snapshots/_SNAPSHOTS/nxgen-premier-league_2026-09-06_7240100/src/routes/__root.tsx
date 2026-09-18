import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import nxgLogo from "@/assets/NXG-trim.png.asset.json";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { Toaster } from "@/components/ui/sonner";
import { ScrollBasketball } from "@/components/scroll-basketball";
import { NxIntro } from "@/components/nx-intro";
import { NxReveal } from "@/components/nx-reveal";
import { Scroll3DSections } from "@/components/scroll-3d-sections";
import { ScrollAnimate } from "@/components/scroll-animate";
import { TiltCards } from "@/components/tilt-cards";



function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
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
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const SITE_URL = "https://nxgenpremierleague.lovable.app";
/** Absolute share image — relative og:image URLs break Facebook/Twitter previews. */
export const OG_IMAGE = `${SITE_URL}${nxgLogo.url}`;

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "NXGEN Premier League" },
      { name: "description", content: "NXGEN Premier League — home of Rising Stars, Legacy, 3x3 and King of the Court basketball divisions." },
      { property: "og:site_name", content: "NXGEN Premier League" },
      { property: "og:title", content: "NXGEN Premier League" },
      { property: "og:description", content: "Home of Rising Stars, Legacy, 3x3 and King of the Court basketball divisions." },
      { property: "og:type", content: "website" },
      // Site-wide share image. Must be ABSOLUTE — Facebook/Twitter cannot
      // resolve a relative path, which renders the preview card blank.
      { property: "og:image", content: OG_IMAGE },
      { name: "twitter:image", content: OG_IMAGE },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "google-site-verification", content: "Kad9iFAUIwObdv-KLyQ7l_0izj5trn1FV-_jEjZwl0s" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      // The site shipped with no favicon at all, so tabs fell back to the
      // browser default. Uses the current mark, same asset as the nav.
      { rel: "icon", type: "image/png", href: nxgLogo.url },
      { rel: "apple-touch-icon", href: nxgLogo.url },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Archivo:wght@600;700;800;900&family=DM+Sans:wght@400;500;700&family=JetBrains+Mono:wght@400;500;600&display=swap",
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
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isPublic = !/^\/(admin|account|auth|settings|profile)/.test(pathname);

  return (
    <QueryClientProvider client={queryClient}>
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <Outlet />
      <NxReveal />
      {/* Brand intro: public pages only, once per session, skippable. */}
      {isPublic && <NxIntro />}
      {isPublic && <ScrollBasketball />}
      <Scroll3DSections />
      <ScrollAnimate />
      <TiltCards />


      <Toaster />
    </QueryClientProvider>

  );
}
