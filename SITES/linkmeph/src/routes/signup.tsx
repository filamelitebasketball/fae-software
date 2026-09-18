import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Sign up — Create your LinkMePH account" },
      { name: "description", content: "Create a free LinkMePH account for your digital card, sports passes and creative orders." },
      { property: "og:title", content: "Sign up — LinkMePH" },
      { property: "og:description", content: "One account for your LinkMe Card, live sports and creative services." },
    ],
  }),
  component: Signup,
});

type Errors = { name?: string; email?: string; password?: string; confirm?: string };

function Signup() {
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });
  const [errors, setErrors] = useState<Errors>({});

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const next: Errors = {};
    if (!form.name.trim()) next.name = "Please enter your full name.";
    if (!/^\S+@\S+\.\S+$/.test(form.email)) next.email = "Enter a valid email address.";
    if (form.password.length < 8) next.password = "Use at least 8 characters.";
    if (form.password !== form.confirm) next.confirm = "Passwords do not match.";
    setErrors(next);
    if (Object.keys(next).length) return;
    toast.success("Account created (demo)", { description: "Real sign-up is connected next." });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary/40 px-4 py-10">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-6 flex justify-center"><Logo /></Link>
        <Card>
          <CardHeader><CardTitle className="text-2xl">Create your account</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-2">
              <Button variant="outline" onClick={() => toast("Google sign-up connects after launch")}>Continue with Google</Button>
              <Button variant="outline" onClick={() => toast("Facebook sign-up connects after launch")}>Continue with Facebook</Button>
            </div>
            <div className="flex items-center gap-3">
              <Separator className="flex-1" /><span className="text-xs text-muted-foreground">or</span><Separator className="flex-1" />
            </div>
            <form className="space-y-4" onSubmit={submit} noValidate>
              <div>
                <Label htmlFor="s-name">Full name</Label>
                <Input id="s-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                {errors.name ? <p className="mt-1 text-xs text-destructive">{errors.name}</p> : null}
              </div>
              <div>
                <Label htmlFor="s-email">Email</Label>
                <Input id="s-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                {errors.email ? <p className="mt-1 text-xs text-destructive">{errors.email}</p> : null}
              </div>
              <div>
                <Label htmlFor="s-pass">Password</Label>
                <Input id="s-pass" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
                {errors.password ? <p className="mt-1 text-xs text-destructive">{errors.password}</p> : null}
              </div>
              <div>
                <Label htmlFor="s-confirm">Confirm password</Label>
                <Input id="s-confirm" type="password" value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} />
                {errors.confirm ? <p className="mt-1 text-xs text-destructive">{errors.confirm}</p> : null}
              </div>
              <Button type="submit" className="w-full" size="lg">Create account</Button>
            </form>
            <p className="text-center text-sm text-muted-foreground">
              Already have an account? <Link to="/login" className="font-medium text-brand-blue hover:underline">Log in</Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
