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
      { property: "og:url", content: "https://nxgenpremierleague.lovable.app/auth" },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: "https://nxgenpremierleague.lovable.app/auth" }],
  }),
  component: AuthPage,
});

async function postAuthDestination(explicit?: string): Promise<string> {
  if (explicit && explicit.startsWith("/")) return explicit;
  return "/profile";
}

/**
 * NOTE: The verification email subject must be set in the backend
 * Auth → Email Templates settings to:
 * "Your NXGEN Premier League Verification Code"
 */
const SIGNUP_META = { source: "nxgen-premier-league" };

const PROVIDER_LABEL: Record<string, string> = { google: "Google", apple: "Apple" };

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
    supabase.auth.getSession().then(async ({ data }) => {
      if (data.session) navigate({ to: (await postAuthDestination(redirect)) as any });
    });
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

  const authReturnUrl = () => {
    const returnTo = redirect && redirect.startsWith("/") ? redirect : "/profile";
    return `${window.location.origin}/auth?redirect=${encodeURIComponent(returnTo)}`;
  };

  const handleOAuth = async (provider: "google" | "apple") => {
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth(provider, { redirect_uri: authReturnUrl() });
    if (result.error) {
      setLoading(false);
      toast.error(`${PROVIDER_LABEL[provider]} sign-in failed`);
      return;
    }
    if (result.redirected) return;
    goNext();
  };

  /**
   * Facebook does not go through Lovable's OAuth broker — that only brokers
   * Google, Apple and Microsoft — so it talks to Supabase Auth directly. It
   * needs a Facebook app configured in the backend's auth settings.
   *
   * signInWithOAuth builds the authorize URL on the client and returns no error
   * when the provider is switched off; it just sends the browser there, and
   * Supabase answers with a raw JSON page reading "provider is not enabled".
   * That is what a player would see the day the app credentials lapse, so ask
   * the endpoint first and keep them on a page that can explain itself.
   */
  const facebookUnavailable = () =>
    toast.error("Facebook sign-in isn't switched on yet — use Google, Apple or your email.");

  const handleFacebook = async () => {
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "facebook",
      options: { redirectTo: authReturnUrl(), skipBrowserRedirect: true },
    });
    if (error || !data?.url) {
      setLoading(false);
      facebookUnavailable();
      return;
    }
    try {
      // A live provider answers with a redirect, which reads as an opaque
      // response here. A disabled one answers 400.
      const res = await fetch(data.url, { redirect: "manual" });
      if (res.status === 400) {
        setLoading(false);
        facebookUnavailable();
        return;
      }
    } catch {
      // A network hiccup is not proof the provider is down — let the real
      // navigation have its go rather than blocking a working sign-in.
    }
    window.location.assign(data.url);
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
          {/* Facebook first and full width: in Lipa it is the account nearly
              every player already has, so it is the fastest way in. */}
          <Button
            onClick={handleFacebook}
            disabled={loading}
            size="lg"
            className="w-full bg-[#1877F2] text-white hover:bg-[#1877F2]/90 hover:text-white"
          >
            <svg viewBox="0 0 24 24" className="mr-2 h-4 w-4" fill="currentColor" aria-hidden>
              <path d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.24 2.68.24v2.96h-1.51c-1.49 0-1.96.93-1.96 1.89v2.26h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07z" />
            </svg>
            Continue with Facebook
          </Button>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
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

