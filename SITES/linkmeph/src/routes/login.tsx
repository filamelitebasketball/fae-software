import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Log in — LinkMePH Account" },
      { name: "description", content: "Log in to manage your LinkMe Card, sports passes and creative orders." },
      { property: "og:title", content: "Log in — LinkMePH" },
      { property: "og:description", content: "Access your LinkMePH account dashboard." },
    ],
  }),
  component: Login,
});

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const next: { email?: string; password?: string } = {};
    if (!/^\S+@\S+\.\S+$/.test(email)) next.email = "Enter a valid email address.";
    if (password.length < 8) next.password = "Password must be at least 8 characters.";
    setErrors(next);
    if (Object.keys(next).length) return;
    toast.success("Signed in (demo)", { description: "Real authentication is connected next." });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary/40 px-4 py-10">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-6 flex justify-center"><Logo /></Link>
        <Card>
          <CardHeader><CardTitle className="text-2xl">Welcome back</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-2">
              <Button variant="outline" onClick={() => toast("Google sign-in connects after launch")}>Continue with Google</Button>
              <Button variant="outline" onClick={() => toast("Facebook sign-in connects after launch")}>Continue with Facebook</Button>
            </div>
            <div className="flex items-center gap-3">
              <Separator className="flex-1" /><span className="text-xs text-muted-foreground">or</span><Separator className="flex-1" />
            </div>
            <form className="space-y-4" onSubmit={submit} noValidate>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" />
                {errors.email ? <p className="mt-1 text-xs text-destructive">{errors.email}</p> : null}
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
                {errors.password ? <p className="mt-1 text-xs text-destructive">{errors.password}</p> : null}
              </div>
              <div className="flex justify-end">
                <Link to="/forgot-password" className="text-xs text-brand-blue hover:underline">Forgot password?</Link>
              </div>
              <Button type="submit" className="w-full" size="lg">Log in</Button>
            </form>
            <p className="text-center text-sm text-muted-foreground">
              No account yet? <Link to="/signup" className="font-medium text-brand-blue hover:underline">Sign up</Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
