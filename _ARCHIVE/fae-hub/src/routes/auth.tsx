import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/fae/AuthProvider";
import { Button } from "@/components/fae/Button";
import { Icon } from "@/components/fae/Icon";
import { useToast } from "@/components/fae/Toast";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { ensureMemberProfile } from "@/lib/fae.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>) => {
    const r = search["returnTo"];
    return typeof r === "string" && r.startsWith("/") && !r.startsWith("//") ? { returnTo: r } : {};
  },
  head: () => ({
    meta: [
      { title: "Sign in — F.A.E. Court" },
      { name: "description", content: "Sign in to F.A.E. Court to book courts, join tryouts and manage your counter tab." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { returnTo } = Route.useSearch();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState<"google" | "email" | null>(null);

  const destination = returnTo ?? "/account";

  useEffect(() => {
    if (!loading && user) navigate({ to: destination, replace: true });
  }, [loading, user, destination, navigate]);

  const afterAuth = async (displayName?: string) => {
    try {
      await ensureMemberProfile({ data: displayName ? { name: displayName } : {} });
    } catch {
      /* profile sync is best-effort here */
    }
    navigate({ to: destination, replace: true });
  };

  const signInGoogle = async () => {
    setBusy("google");
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        toast("Google sign-in failed — try email instead.");
        setBusy(null);
        return;
      }
      if (result.redirected) return; // browser navigates away
      await afterAuth();
    } catch {
      toast("Google sign-in failed — try email instead.");
      setBusy(null);
    }
  };

  const submitEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      toast("Enter your email and password.");
      return;
    }
    setBusy("email");
    try {
      if (mode === "register") {
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: { full_name: name.trim() },
            emailRedirectTo: `${window.location.origin}${destination}`,
          },
        });
        if (error) throw error;
        toast("Account created — check your email to confirm, then sign in.");
        setMode("login");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
        await afterAuth();
      }
    } catch (error) {
      toast(error instanceof Error ? error.message : "Authentication failed.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-24">
      <div className="grid w-full max-w-4xl overflow-hidden rounded-xl border border-border bg-surface-2 lg:grid-cols-2">
        {/* Brand panel */}
        <div className="map-grid relative hidden flex-col justify-between bg-surface-1 p-9 lg:flex">
          <div className="map-glow absolute inset-0 opacity-50" />
          <p className="relative font-display text-2xl font-black uppercase tracking-tight text-foreground">
            F.A.E. <span className="text-gold">Court</span>
          </p>
          <div className="relative">
            <p className="font-display text-3xl font-extrabold uppercase leading-tight text-foreground">
              One account.
              <br />
              Every court.
            </p>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
              Book courts, join tryouts and run your counter tab from a single member account.
            </p>
          </div>
          <p className="relative font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Lipa City · Batangas
          </p>
        </div>

        {/* Form */}
        <div className="p-7 sm:p-9">
          <div className="flex rounded-lg border border-border bg-surface-1 p-1">
            {(["login", "register"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={cn(
                  "flex-1 rounded-md px-3 py-2 text-sm font-semibold capitalize transition-colors",
                  mode === m ? "bg-gold text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {m === "login" ? "Sign in" : "Create account"}
              </button>
            ))}
          </div>

          <Button variant="ghost" className="mt-6 w-full justify-center" onClick={signInGoogle} disabled={busy !== null}>
            <Icon name="users" size={16} className="text-gold" />
            {busy === "google" ? "Opening Google…" : "Continue with Google"}
          </Button>

          <div className="my-6 flex items-center gap-3">
            <span className="h-px flex-1 bg-border" />
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">or email</span>
            <span className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={submitEmail} className="space-y-4">
            {mode === "register" ? (
              <Field label="Full name">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={100}
                  autoComplete="name"
                  className="fae-input"
                  placeholder="Juan Dela Cruz"
                />
              </Field>
            ) : null}
            <Field label="Email">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                maxLength={255}
                autoComplete="email"
                required
                className="fae-input"
                placeholder="you@example.com"
              />
            </Field>
            <Field label="Password">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                maxLength={128}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                required
                className="fae-input"
                placeholder="••••••••"
              />
            </Field>
            <Button variant="gold" className="w-full justify-center" disabled={busy !== null}>
              {busy === "email" ? "Working…" : mode === "login" ? "Sign in" : "Create account"}
              <Icon name="arrow-right" size={15} />
            </Button>
          </form>

          <p className="mt-6 text-center text-xs leading-relaxed text-muted-foreground">
            The first account ever created on this site becomes the admin. Everyone else starts as a non-member —
            grab the ₱1,000/year membership at the counter to unlock member rates.
          </p>
        </div>
      </div>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}
