import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset password — LinkMePH" },
      { name: "description", content: "Set a new password for your LinkMePH account." },
      { property: "og:title", content: "Reset password — LinkMePH" },
      { property: "og:description", content: "Choose a new password and get back to your dashboard." },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<{ password?: string; confirm?: string }>({});

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const next: { password?: string; confirm?: string } = {};
    if (password.length < 8) next.password = "Use at least 8 characters.";
    if (password !== confirm) next.confirm = "Passwords do not match.";
    setErrors(next);
    if (Object.keys(next).length) return;
    toast.success("Password updated", { description: "You can now log in with your new password." });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary/40 px-4 py-10">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-6 flex justify-center"><Logo /></Link>
        <Card>
          <CardHeader><CardTitle className="text-2xl">Set a new password</CardTitle></CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={submit} noValidate>
              <div>
                <Label htmlFor="r-pass">New password</Label>
                <Input id="r-pass" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
                {errors.password ? <p className="mt-1 text-xs text-destructive">{errors.password}</p> : null}
              </div>
              <div>
                <Label htmlFor="r-confirm">Confirm new password</Label>
                <Input id="r-confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
                {errors.confirm ? <p className="mt-1 text-xs text-destructive">{errors.confirm}</p> : null}
              </div>
              <Button type="submit" className="w-full" size="lg">Update password</Button>
              <p className="text-center text-sm text-muted-foreground">
                <Link to="/login" className="text-brand-blue hover:underline">Back to log in</Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
