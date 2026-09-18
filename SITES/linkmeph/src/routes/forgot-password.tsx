import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Forgot password — LinkMePH" },
      { name: "description", content: "Reset your LinkMePH account password with a secure email link." },
      { property: "og:title", content: "Forgot password — LinkMePH" },
      { property: "og:description", content: "Send yourself a password reset link." },
    ],
  }),
  component: ForgotPassword,
});

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setError("Enter a valid email address.");
      return;
    }
    setError("");
    setSent(true);
    toast.success("Reset link sent", { description: "Check your inbox for the reset email." });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary/40 px-4 py-10">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-6 flex justify-center"><Logo /></Link>
        <Card>
          <CardHeader><CardTitle className="text-2xl">Forgot your password?</CardTitle></CardHeader>
          <CardContent>
            {sent ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  If an account exists for <span className="font-medium text-foreground">{email}</span>, we sent a
                  reset link. It expires in 60 minutes.
                </p>
                <Button asChild className="w-full"><Link to="/login">Back to log in</Link></Button>
              </div>
            ) : (
              <form className="space-y-4" onSubmit={submit} noValidate>
                <p className="text-sm text-muted-foreground">Enter your email and we'll send a reset link.</p>
                <div>
                  <Label htmlFor="f-email">Email</Label>
                  <Input id="f-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                  {error ? <p className="mt-1 text-xs text-destructive">{error}</p> : null}
                </div>
                <Button type="submit" className="w-full" size="lg">Send reset link</Button>
                <p className="text-center text-sm text-muted-foreground">
                  <Link to="/login" className="text-brand-blue hover:underline">Back to log in</Link>
                </p>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
