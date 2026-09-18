import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { NxPage } from "@/components/nx-shell";
import { LogOut, Eye, EyeOff, Copy, Mail, KeyRound, Shield, Check } from "lucide-react";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings — NXGEN" }, { name: "robots", content: "noindex" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (cancelled) return;
      if (!data.user) { navigate({ to: "/auth" }); return; }
      setUserId(data.user.id);
      setEmail(data.user.email ?? "");
      setNewEmail(data.user.email ?? "");
      const { data: p } = await supabase
        .from("profiles")
        .select("is_public")
        .eq("id", data.user.id)
        .maybeSingle();
      if (cancelled) return;
      setIsPublic((p as { is_public?: boolean } | null)?.is_public ?? true);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [navigate]);

  const togglePublic = async (next: boolean) => {
    if (!userId) return;
    setBusy(true);
    const { error } = await supabase.from("profiles").update({ is_public: next }).eq("id", userId);
    setBusy(false);
    if (error) return toast.error(error.message);
    setIsPublic(next);
    toast.success(next ? "Profile is now public" : "Profile is now private");
  };

  const changeEmail = async () => {
    if (!newEmail || newEmail === email) return;
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ email: newEmail });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Check your inbox to confirm the new email.");
  };

  const changePassword = async () => {
    if (newPassword.length < 6) return toast.error("Password must be at least 6 characters");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setBusy(false);
    if (error) return toast.error(error.message);
    setNewPassword("");
    toast.success("Password updated");
  };

  const signOut = async () => { await supabase.auth.signOut(); navigate({ to: "/" }); };

  const publicUrl = userId && typeof window !== "undefined"
    ? `${window.location.origin}/players/${userId}`
    : "";

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      toast.success("Link copied");
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy the link");
    }
  };

  if (loading) {
    return (
      <NxPage eyebrow="Account" title="Settings">
        <p className="hub-loading" role="status">Loading…</p>
      </NxPage>
    );
  }

  return (
    <NxPage
      eyebrow="Account"
      title="Settings"
      intro="Control who can see your player card, and manage how you sign in."
    >
      <div className="set-wrap">
        <section className="inf-group">
          <div className="inf-head">
            <h3><Shield aria-hidden="true" /> Visibility</h3>
          </div>

          <div className="set-toggle">
            <span className="set-toggle-copy">
              <b>{isPublic ? <Eye aria-hidden="true" /> : <EyeOff aria-hidden="true" />} Public profile</b>
              <span>
                {isPublic
                  ? "Anyone with your link can see your card, stats and badges."
                  : "Your card is hidden. Only you can see your stats."}
              </span>
            </span>
            {/* A real checkbox: it announces its state and works from the keyboard,
                which a styled div does not. */}
            <label className="set-switch">
              <input
                type="checkbox"
                checked={isPublic}
                disabled={busy}
                onChange={(e) => togglePublic(e.target.checked)}
              />
              <i aria-hidden="true" />
              <span className="sr-only">Public profile</span>
            </label>
          </div>

          {isPublic && (
            <div className="set-share">
              <label className="sr-only" htmlFor="set-link">Your public link</label>
              <input id="set-link" className="set-input mono" readOnly value={publicUrl} />
              <button type="button" className="btn btn-ghost btn-xs" onClick={copy}>
                {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
          )}
        </section>

        <section className="inf-group">
          <div className="inf-head">
            <h3><Mail aria-hidden="true" /> Email</h3>
            <p>Sign-in address</p>
          </div>
          <div className="inf-grid">
            <div>
              <label className="pcs-label" htmlFor="set-cur">Current</label>
              <input id="set-cur" className="set-input" value={email} disabled />
            </div>
            <div>
              <label className="pcs-label" htmlFor="set-new">New email</label>
              <input
                id="set-new"
                className="set-input"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
              />
            </div>
          </div>
          <div className="inf-bar">
            <button
              type="button"
              className="btn btn-gold btn-xs"
              onClick={changeEmail}
              disabled={busy || newEmail === email}
            >
              Update email
            </button>
          </div>
        </section>

        <section className="inf-group">
          <div className="inf-head">
            <h3><KeyRound aria-hidden="true" /> Password</h3>
            <p id="set-pw-hint">At least 6 characters</p>
          </div>
          <div className="inf-grid">
            <div className="inf-wide">
              <label className="pcs-label" htmlFor="set-pw">New password</label>
              <input
                id="set-pw"
                className="set-input"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 6 characters"
                autoComplete="new-password"
                aria-describedby="set-pw-hint"
              />
            </div>
          </div>
          <div className="inf-bar">
            <button
              type="button"
              className="btn btn-gold btn-xs"
              onClick={changePassword}
              disabled={busy || newPassword.length < 6}
            >
              Change password
            </button>
          </div>
        </section>

        <section className="inf-group">
          <div className="inf-head">
            <h3>Account</h3>
          </div>
          <div className="set-actions">
            <Link to="/profile" className="btn btn-ghost btn-xs">Back to dashboard</Link>
            <button type="button" className="btn btn-ghost btn-xs set-danger" onClick={signOut}>
              <LogOut aria-hidden="true" /> Sign out
            </button>
          </div>
        </section>

        <nav className="set-legal" aria-label="Legal">
          <p>Legal</p>
          <div>
            <Link to="/legal/privacy">Privacy</Link>
            <Link to="/legal/terms">Terms</Link>
            <Link to="/legal/waiver">Waiver</Link>
            <Link to="/legal/code-of-conduct">Code of Conduct</Link>
            <Link to="/legal/refund-policy">Refund Policy</Link>
          </div>
        </nav>
      </div>
    </NxPage>
  );
}
