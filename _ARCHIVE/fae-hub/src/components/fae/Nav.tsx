import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "./AuthProvider";
import { ButtonLink } from "./Button";
import { Icon } from "./Icon";

const LINKS = [
  { to: "/", label: "Home" },
  { to: "/book", label: "Book a Court" },
  { to: "/schedule", label: "Schedule" },
  { to: "/teams", label: "Teams" },
  { to: "/location", label: "Location" },
  { to: "/account", label: "My Account" },
] as const;

export function Nav() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [progress, setProgress] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 24);
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(max > 0 ? Math.min(1, y / max) : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const displayName =
    (user?.user_metadata?.["full_name"] as string | undefined)?.split(" ")[0] ??
    (user?.user_metadata?.["first_name"] as string | undefined) ??
    user?.email?.split("@")[0] ??
    "Member";

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-[60] transition-colors duration-300",
        scrolled ? "border-b border-border bg-background/85 backdrop-blur-md" : "bg-transparent",
      )}
    >
      {/* scroll progress */}
      <div className="absolute left-0 top-0 h-[2px] bg-gold transition-[width] duration-150" style={{ width: `${progress * 100}%` }} />

      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-3" aria-label="F.A.E. Court home">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gold text-primary-foreground">
            <Icon name="logo" size={20} strokeWidth={1.8} />
          </span>
          <span className="leading-none">
            <span className="block font-display text-[15px] font-extrabold tracking-wide text-foreground">F.A.E. COURT</span>
            <span className="mt-1 block font-mono text-[8px] uppercase tracking-[0.22em] text-muted-foreground">
              Lipa City · Batangas
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-7 lg:flex" aria-label="Primary">
          {LINKS.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              activeOptions={{ exact: link.to === "/" }}
              activeProps={{ className: "nav-link active" }}
              inactiveProps={{ className: "nav-link" }}
              className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          {user ? (
            <>
              <ButtonLink to="/account" variant="ghost" size="sm">
                <Icon name="user" size={14} />
                {displayName}
              </ButtonLink>
              <ButtonLink to="/book" variant="gold" size="sm">
                Book
              </ButtonLink>
            </>
          ) : (
            <>
              <ButtonLink to="/auth" variant="ghost" size="sm">
                Sign in
              </ButtonLink>
              <ButtonLink to="/auth" search={{ mode: "register" }} variant="gold" size="sm">
                Register
              </ButtonLink>
            </>
          )}
        </div>

        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-surface-2 text-foreground lg:hidden"
          onClick={() => setMenuOpen(true)}
          aria-label="Open menu"
        >
          <Icon name="menu" size={18} />
        </button>
      </div>

      {/* Mobile sheet */}
      {menuOpen && (
        <div className="fade-in fixed inset-0 z-[70] flex flex-col bg-background/98 backdrop-blur-md lg:hidden">
          <div className="flex h-16 items-center justify-between px-4">
            <span className="font-display text-[15px] font-extrabold tracking-wide text-foreground">F.A.E. COURT</span>
            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-surface-2 text-foreground"
              onClick={() => setMenuOpen(false)}
              aria-label="Close menu"
            >
              <Icon name="x" size={18} />
            </button>
          </div>
          <nav className="flex flex-1 flex-col justify-center gap-2 px-8" aria-label="Mobile">
            {LINKS.map((link, i) => (
              <button
                key={link.to}
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  navigate({ to: link.to });
                }}
                className="border-b border-border py-4 text-left font-display text-3xl font-extrabold uppercase tracking-wide text-foreground transition-colors hover:text-gold"
                style={{ transitionDelay: `${i * 40}ms` }}
              >
                {link.label}
              </button>
            ))}
          </nav>
          <div className="flex gap-3 px-8 pb-10">
            {user ? (
              <>
                <ButtonLink to="/account" variant="ghost" className="flex-1" onClick={() => setMenuOpen(false)}>
                  {displayName}
                </ButtonLink>
                <ButtonLink to="/book" variant="gold" className="flex-1" onClick={() => setMenuOpen(false)}>
                  Book
                </ButtonLink>
              </>
            ) : (
              <>
                <ButtonLink to="/auth" variant="ghost" className="flex-1" onClick={() => setMenuOpen(false)}>
                  Sign in
                </ButtonLink>
                <ButtonLink to="/auth" search={{ mode: "register" }} variant="gold" className="flex-1" onClick={() => setMenuOpen(false)}>
                  Register
                </ButtonLink>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
