import { SITE_URL } from "@/lib/site-url";
import { createFileRoute, useNavigate, Link, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { z } from "zod";

export const Route = createFileRoute("/auth")({
  validateSearch: z.object({ redirect: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Sign in or register — NXGEN Premier League" },
      { name: "description", content: "Sign in or create an NXGEN account to register for a division." },
      { property: "og:title", content: "Sign in or register — NXGEN Premier League" },
      { property: "og:description", content: "Sign in or create an NXGEN account to register for a division." },
      { property: "og:url", content: `${SITE_URL}/auth` },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/auth` }],
  }),
  component: AuthPage,
});

async function postAuthDestination(explicit?: string): Promise<string> {
  if (explicit && explicit.startsWith("/")) return explicit;
  // Set before an OAuth hop, read after the provider sends the browser back.
  try {
    const parked = sessionStorage.getItem(RETURN_KEY);
    sessionStorage.removeItem(RETURN_KEY);
    if (parked && parked.startsWith("/")) return parked;
  } catch {
    /* private mode */
  }
  return "/profile";
}

/**
 * NOTE: The verification email subject must be set in the backend
 * Auth → Email Templates settings to:
 * "Your NXGEN Premier League Verification Code"
 */
const SIGNUP_META = { source: "nxgen-premier-league" };

const PROVIDER_LABEL: Record<string, string> = { google: "Google", apple: "Apple" };
/** Post-login destination, parked here so redirect_uri can stay a bare path. */
const RETURN_KEY = "nxgen_post_auth";

const COUNTRY_CODES = [
  { code: "+63", label: "🇵🇭 PH +63" },
  { code: "+1", label: "🇺🇸 US/CA +1" },
  { code: "+44", label: "🇬🇧 UK +44" },
  { code: "+61", label: "🇦🇺 AU +61" },
  { code: "+65", label: "🇸🇬 SG +65" },
  { code: "+81", label: "🇯🇵 JP +81" },
  { code: "+82", label: "🇰🇷 KR +82" },
  { code: "+86", label: "🇨🇳 CN +86" },
  { code: "+91", label: "🇮🇳 IN +91" },
  { code: "+971", label: "🇦🇪 AE +971" },
  { code: "+966", label: "🇸🇦 SA +966" },
  { code: "+852", label: "🇭🇰 HK +852" },
  { code: "+60", label: "🇲🇾 MY +60" },
  { code: "+62", label: "🇮🇩 ID +62" },
  { code: "+66", label: "🇹🇭 TH +66" },
  { code: "+64", label: "🇳🇿 NZ +64" },
  { code: "+49", label: "🇩🇪 DE +49" },
  { code: "+33", label: "🇫🇷 FR +33" },
  { code: "+39", label: "🇮🇹 IT +39" },
  { code: "+34", label: "🇪🇸 ES +34" },
  { code: "+31", label: "🇳🇱 NL +31" },
  { code: "+47", label: "🇳🇴 NO +47" },
  { code: "+46", label: "🇸🇪 SE +46" },
  { code: "+41", label: "🇨🇭 CH +41" },
  { code: "+7", label: "🇷🇺 RU +7" },
  { code: "+55", label: "🇧🇷 BR +55" },
  { code: "+52", label: "🇲🇽 MX +52" },
  { code: "+27", label: "🇿🇦 ZA +27" },
  { code: "+234", label: "🇳🇬 NG +234" },
  { code: "+20", label: "🇪🇬 EG +20" },
  { code: "+90", label: "🇹🇷 TR +90" },
  { code: "+", label: "Other +" },
];

const CARD = "rounded-lg border border-border bg-card p-8";

function AuthPage() {
  const navigate = useNavigate();
  const { redirect } = useSearch({ from: "/auth" });
  const [loading, setLoading] = useState(false);
  const [useOtpInstead, setUseOtpInstead] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState("");

  // Sign in
  const [signInEmail, setSignInEmail] = useState("");
  const [signInPassword, setSignInPassword] = useState("");

  // Sign up
  const [suFullName, setSuFullName] = useState("");
  const [suEmail, setSuEmail] = useState("");
  const [suDial, setSuDial] = useState("+63");
  const [suPhone, setSuPhone] = useState("");
  const [suPassword, setSuPassword] = useState("");

  // OTP
  const [otpEmail, setOtpEmail] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");

  useEffect(() => {
    // A provider that refuses hands the reason back on the URL rather than
    // through the SDK, and it used to land as a silent bounce to the form.
    const q = new URLSearchParams(window.location.search);
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const err = q.get("error_description") ?? q.get("error") ?? hash.get("error_description") ?? hash.get("error");
    if (err) toast.error(decodeURIComponent(err.replace(/\+/g, " ")));

    (async () => {
      /**
       * Top-level sign-in is a full page redirect: the SDK sends the browser to
       * the broker and returns, so nothing in it ever sees the tokens coming
       * back. supabase-js picks them up only out of the hash. When the broker
       * puts them on the query string instead the page reloads signed out —
       * a login that looks like it simply did nothing.
       */
      const access_token = q.get("access_token");
      const refresh_token = q.get("refresh_token");
      if (access_token && refresh_token) {
        const { error } = await supabase.auth.setSession({ access_token, refresh_token });
        // Strip the tokens off the address bar either way; a browser history
        // entry holding a refresh token is worth more than the retry it buys.
        window.history.replaceState({}, "", window.location.pathname);
        if (error) {
          toast.error(error.message);
          return;
        }
      }

      const { data } = await supabase.auth.getSession();
      if (data.session) navigate({ to: (await postAuthDestination(redirect)) as any });
    })();
  }, [navigate, redirect]);

  const goNext = async () => {
    const dest = await postAuthDestination(redirect);
    navigate({ to: dest as any });
  };

  const fullPhone = () => (suPhone.trim() ? `${suDial}${suPhone.replace(/[^0-9]/g, "")}` : "");

  const handleResetPassword = async () => {
    const email = resetEmail || signInEmail;
    if (!email) return toast.error("Enter your email first");
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth?reset=true`,
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Password reset link sent — check your email.");
    setShowReset(false);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: signInEmail, password: signInPassword });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Welcome back");
    goNext();
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const phone = fullPhone();
    const { error } = await supabase.auth.signUp({
      email: suEmail,
      password: suPassword,
      options: {
        emailRedirectTo: `${window.location.origin}/auth?verified=true`,
        data: { full_name: suFullName, phone, ...SIGNUP_META },
      },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    // The code always goes to the exact address typed above.
    setOtpEmail(suEmail);
    setOtpCode("");
    setOtpSent(true);
    toast.success(`We sent a 6-digit code to ${suEmail}`);
  };

  /**
   * Where the provider sends the browser back to.
   *
   * Deliberately a bare path with no query of its own: the broker appends its
   * own parameters, and a redirect_uri already carrying `?redirect=…` is one
   * string concatenation away from arriving as
   * `/auth?redirect=%2Fprofile?access_token=…`, which nothing can parse. The
   * destination rides in sessionStorage instead.
   */
  const authReturnUrl = () => {
    const returnTo = redirect && redirect.startsWith("/") ? redirect : "/profile";
    try {
      sessionStorage.setItem(RETURN_KEY, returnTo);
    } catch {
      /* private mode — goNext falls back to /profile */
    }
    return `${window.location.origin}/auth`;
  };

  const handleOAuth = async (provider: "google" | "apple") => {
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth(provider, { redirect_uri: authReturnUrl() });
    if (result.error) {
      setLoading(false);
      // The SDK's own message is the useful part, and this threw it away. It is
      // the difference between "Google sign-in failed" and "Popup was blocked"
      // or "This flow is not supported in Preview mode. Please open the app in
      // a new tab to sign in." — messages that say what to do next.
      toast.error(`${PROVIDER_LABEL[provider]}: ${result.error.message}`);
      return;
    }
    if (result.redirected) return;
    goNext();
  };

  const sendOtpTo = async (email: string) => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth?verified=true`,
        data: SIGNUP_META,
      },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return false;
    }
    toast.success(`We sent a 6-digit code to ${email}`);
    setOtpEmail(email);
    setOtpCode("");
    setOtpSent(true);
    return true;
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    await sendOtpTo(otpEmail || signInEmail);
  };

  const handleVerifyOtp = async () => {
    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({ email: otpEmail, token: otpCode, type: "email" });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("You're in");
    goNext();
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-md flex flex-col gap-6">
        <Link to="/" className="inline-block text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground hover:text-foreground">
          ← Back to NXGEN
        </Link>

        <div>
          <h1 className="text-4xl font-black uppercase tracking-tight mb-3">Join the League</h1>
          <p className="text-muted-foreground text-sm">
            New here? Create an account, then pick your division. Already have one? Sign in.
          </p>
        </div>

        <div className={CARD}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Button onClick={() => handleOAuth("google")} disabled={loading} variant="outline" size="lg">
              Continue with Google
            </Button>
            <Button onClick={() => handleOAuth("apple")} disabled={loading} variant="outline" size="lg" className="bg-foreground text-background hover:bg-foreground/90 hover:text-background">
              <svg viewBox="0 0 24 24" className="mr-2 h-4 w-4" fill="currentColor" aria-hidden><path d="M16.365 1.43c0 1.14-.42 2.222-1.243 3.014-.83.8-2.19 1.42-3.317 1.33-.145-1.104.42-2.29 1.23-3.06.87-.83 2.34-1.44 3.33-1.28zM20.5 17.09c-.55 1.28-.82 1.86-1.53 2.99-.99 1.58-2.39 3.55-4.13 3.56-1.55.02-1.95-1.01-4.05-1-2.1.01-2.54 1.02-4.09 1-1.74-.01-3.07-1.79-4.06-3.37C-.02 17.09-.29 12.36 1.36 9.7c1.17-1.88 3.02-2.98 4.76-2.98 1.77 0 2.88 1.03 4.34 1.03 1.42 0 2.29-1.03 4.34-1.03 1.56 0 3.21.85 4.39 2.32-3.86 2.12-3.23 7.63.31 8.05z"/></svg>
              Continue with Apple
            </Button>
          </div>
          <p className="mt-6 text-[10px] text-center text-muted-foreground uppercase tracking-widest leading-relaxed">
            By continuing you accept our <a href="/legal/terms" className="underline">Terms</a>, <a href="/legal/waiver" className="underline">Waiver</a> & <a href="/legal/privacy" className="underline">Privacy</a>.
          </p>
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-3 text-muted-foreground">Or with email</span>
          </div>
        </div>

        <Tabs defaultValue="signin" onValueChange={() => { setOtpSent(false); setUseOtpInstead(false); }}>
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="signin">Sign In</TabsTrigger>
            <TabsTrigger value="signup">Create Account</TabsTrigger>
          </TabsList>

          <TabsContent value="signin" className="mt-6">
            <div className={CARD}>
              {otpSent && useOtpInstead ? (
                <OtpVerify
                  email={otpEmail}
                  code={otpCode}
                  setCode={setOtpCode}
                  onVerify={handleVerifyOtp}
                  loading={loading}
                  onChangeEmail={() => { setOtpSent(false); }}
                  onResend={() => sendOtpTo(otpEmail)}
                />
              ) : useOtpInstead ? (
                <form onSubmit={handleSendOtp} className="flex flex-col gap-6">
                  <p className="text-sm text-muted-foreground">We'll email you a 6-digit code — no password needed.</p>
                  <div className="grid gap-2">
                    <Label htmlFor="auth-otp-email">Email</Label>
                    <Input id="auth-otp-email" type="email" required value={otpEmail} onChange={(e) => setOtpEmail(e.target.value)} />
                  </div>
                  <Button type="submit" disabled={loading} className="w-full">Send Code</Button>
                  <button type="button" onClick={() => setUseOtpInstead(false)} className="w-full text-xs text-muted-foreground hover:text-foreground underline">
                    Use password instead
                  </button>
                </form>
              ) : (
                <form onSubmit={handleSignIn} className="flex flex-col gap-6">
                  <div className="grid gap-2">
                    <Label htmlFor="auth-signin-email">Email</Label>
                    <Input id="auth-signin-email" type="email" required value={signInEmail} onChange={(e) => setSignInEmail(e.target.value)} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="auth-signin-password">Password</Label>
                    <Input id="auth-signin-password" type="password" required value={signInPassword} onChange={(e) => setSignInPassword(e.target.value)} />
                    <button type="button" onClick={() => { setResetEmail(resetEmail || signInEmail); setShowReset((v) => !v); }} className="mt-1 self-start text-xs text-muted-foreground hover:text-foreground underline">
                      Forgot Password?
                    </button>
                  </div>

                  {showReset && (
                    <div className="grid gap-3 rounded-md border border-border p-5">
                      <Label htmlFor="auth-reset-email">Reset email</Label>
                      <Input id="auth-reset-email" type="email" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} />
                      <Button type="button" variant="outline" disabled={loading} className="w-full" onClick={handleResetPassword}>
                        Send Reset Link
                      </Button>
                    </div>
                  )}

                  <Button type="submit" disabled={loading} className="w-full">Sign In</Button>
                  <button type="button" onClick={() => { setOtpEmail(signInEmail); setUseOtpInstead(true); }} className="w-full text-xs text-muted-foreground hover:text-foreground underline">
                    Email me a code instead
                  </button>
                </form>
              )}
            </div>
          </TabsContent>

          <TabsContent value="signup" className="mt-6">
            <div className={CARD}>
              {!otpSent ? (
                <form onSubmit={handleSignUp} className="flex flex-col gap-6">
                  <div className="grid gap-2">
                    <Label htmlFor="auth-su-name">Full name</Label>
                    <Input id="auth-su-name" required value={suFullName} onChange={(e) => setSuFullName(e.target.value)} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="auth-su-email">Email</Label>
                    <Input id="auth-su-email" type="email" required value={suEmail} onChange={(e) => setSuEmail(e.target.value)} />
                    <p className="text-xs text-muted-foreground">Your verification code is sent to this exact address.</p>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="auth-su-phone">Phone (optional)</Label>
                    <div className="flex gap-2">
                      <select
                        aria-label="Country code"
                        value={suDial}
                        onChange={(e) => setSuDial(e.target.value)}
                        className="h-10 w-[140px] shrink-0 rounded-md border border-input bg-background px-2 text-sm"
                      >
                        {COUNTRY_CODES.map((c) => (
                          <option key={c.label} value={c.code}>{c.label}</option>
                        ))}
                      </select>
                      <Input
                        id="auth-su-phone"
                        type="tel"
                        inputMode="tel"
                        placeholder="Phone number"
                        className="min-w-0 flex-1"
                        value={suPhone}
                        onChange={(e) => setSuPhone(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="auth-su-password">Password</Label>
                    <Input id="auth-su-password" type="password" required minLength={6} value={suPassword} onChange={(e) => setSuPassword(e.target.value)} />
                  </div>

                  <Button type="submit" disabled={loading} className="w-full">Create Account</Button>
                  <p className="text-center text-xs text-muted-foreground">After signup we'll take you straight to division registration.</p>
                </form>
              ) : (
                <OtpVerify
                  email={otpEmail}
                  code={otpCode}
                  setCode={setOtpCode}
                  onVerify={handleVerifyOtp}
                  loading={loading}
                  onChangeEmail={() => setOtpSent(false)}
                  onResend={() => sendOtpTo(otpEmail)}
                />
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function OtpVerify({
  email, code, setCode, onVerify, loading, onChangeEmail, onResend,
}: {
  email: string;
  code: string;
  setCode: (c: string) => void;
  onVerify: () => void;
  loading: boolean;
  onChangeEmail?: () => void;
  onResend?: () => void;
}) {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-2">
        <p className="text-sm text-muted-foreground">We sent a 6-digit code to</p>
        <Input value={email} readOnly disabled aria-label="Email the code was sent to" className="text-muted-foreground" />
      </div>
      <div className="flex justify-center">
        <InputOTP maxLength={6} value={code} onChange={setCode}>
          <InputOTPGroup>
            {[0, 1, 2, 3, 4, 5].map((i) => <InputOTPSlot key={i} index={i} />)}
          </InputOTPGroup>
        </InputOTP>
      </div>
      <Button onClick={onVerify} disabled={loading || code.length !== 6} className="w-full">Verify</Button>
      <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
        {onResend && (
          <button type="button" onClick={onResend} disabled={loading} className="underline hover:text-foreground">
            Resend code
          </button>
        )}
        {onChangeEmail && (
          <button type="button" onClick={onChangeEmail} className="underline hover:text-foreground">
            Change email
          </button>
        )}
      </div>
    </div>
  );
}

