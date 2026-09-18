import { createFileRoute } from "@tanstack/react-router";
import { Clock, Upload } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { PageHeader, PageShell } from "@/components/PageShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { creativePackages, sampleWork } from "@/data/linkmeph";

export const Route = createFileRoute("/creative-services")({
  head: () => ({
    meta: [
      { title: "Creative Services — Video & Photo Editing | LinkMePH" },
      {
        name: "description",
        content:
          "Reels and short-form video editing, photo retouching and carousel design for social media marketing. Per-piece pricing or monthly retainers.",
      },
      { property: "og:title", content: "Creative Services — Video & Photo Editing" },
      { property: "og:description", content: "Social-ready reels, retouched photos and branded carousels from LinkMePH." },
    ],
  }),
  component: CreativeServices,
});

function CreativeServices() {
  const [form, setForm] = useState({ name: "", email: "", pkg: creativePackages[0]!.id, driveLink: "", brief: "" });
  type FormErrors = { name?: string; email?: string; brief?: string };
  const [errors, setErrors] = useState<FormErrors>({});

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const next: FormErrors = {};
    if (!form.name.trim()) next.name = "Please enter your name.";
    if (!/^\S+@\S+\.\S+$/.test(form.email)) next.email = "Enter a valid email address.";
    if (!form.brief.trim()) next.brief = "Tell us what you need edited.";
    setErrors(next);
    if (Object.keys(next).length) return;
    toast.success("Request submitted", { description: "Track it under Creative Orders in your dashboard." });
    setForm({ ...form, driveLink: "", brief: "" });
  };

  return (
    <PageShell>
      <PageHeader
        eyebrow="Creative Services"
        title="Video & photo editing for social media"
        description="Send us your raw clips and photos — we return scroll-stopping reels, clean product shots and on-brand carousels ready to post."
      />

      <section className="mx-auto max-w-6xl px-4 py-12">
        <h2 className="text-2xl font-bold">Packages & pricing</h2>
        <div className="mt-6 grid gap-5 md:grid-cols-3">
          {creativePackages.map((p) => (
            <Card key={p.id}>
              <CardHeader>
                <CardTitle>{p.name}</CardTitle>
                <p className="text-sm text-muted-foreground">{p.tagline}</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-3xl font-bold text-primary">₱{p.perPiece.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">per piece</p>
                </div>
                <Separator />
                <div>
                  <p className="text-lg font-semibold">₱{p.retainer.toLocaleString()}<span className="text-sm font-normal text-muted-foreground"> / month</span></p>
                  <p className="text-xs text-muted-foreground">{p.retainerNote}</p>
                </div>
                <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" /> {p.turnaround}</Badge>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  {p.includes.map((i) => <li key={i}>• {i}</li>)}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-12">
        <h2 className="text-2xl font-bold">Sample work</h2>
        <p className="mt-2 text-sm text-muted-foreground">Before and after from recent client projects.</p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {sampleWork.map((s) => (
            <Card key={s.id} className="overflow-hidden">
              <div className="grid grid-cols-2">
                <div className="flex aspect-square items-center justify-center bg-muted p-3 text-center text-xs text-muted-foreground">
                  Before<br />{s.before}
                </div>
                <div className="brand-gradient flex aspect-square items-center justify-center p-3 text-center text-xs text-primary-foreground">
                  After<br />{s.after}
                </div>
              </div>
              <CardContent className="p-4">
                <p className="text-sm font-semibold">{s.title}</p>
                <Badge variant="secondary" className="mt-2">{s.category}</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 pb-16">
        <Card>
          <CardHeader>
            <CardTitle>Start a request</CardTitle>
            <p className="text-sm text-muted-foreground">
              Upload your raw files or paste a Google Drive link. We confirm scope and turnaround before any payment.
            </p>
          </CardHeader>
          <CardContent>
            <form className="space-y-5" onSubmit={submit} noValidate>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="cs-name">Your name</Label>
                  <Input id="cs-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                  {errors.name ? <p className="mt-1 text-xs text-destructive">{errors.name}</p> : null}
                </div>
                <div>
                  <Label htmlFor="cs-email">Email</Label>
                  <Input id="cs-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                  {errors.email ? <p className="mt-1 text-xs text-destructive">{errors.email}</p> : null}
                </div>
              </div>

              <div>
                <Label htmlFor="cs-pkg">Package</Label>
                <select
                  id="cs-pkg"
                  value={form.pkg}
                  onChange={(e) => setForm({ ...form, pkg: e.target.value })}
                  className="mt-2 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  {creativePackages.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} — ₱{p.perPiece} / piece</option>
                  ))}
                </select>
                <p className="mt-2 text-xs text-muted-foreground">
                  Turnaround: {creativePackages.find((p) => p.id === form.pkg)?.turnaround}
                </p>
              </div>

              <div>
                <Label htmlFor="cs-files">Upload raw files</Label>
                <label
                  htmlFor="cs-files"
                  className="mt-2 flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground hover:bg-secondary/50"
                >
                  <Upload className="h-5 w-5" />
                  Drop videos or photos here (file uploads go live after launch)
                </label>
                <input id="cs-files" type="file" multiple className="sr-only" />
              </div>

              <div>
                <Label htmlFor="cs-drive">…or paste a Google Drive link</Label>
                <Input id="cs-drive" value={form.driveLink} onChange={(e) => setForm({ ...form, driveLink: e.target.value })} placeholder="https://drive.google.com/…" />
              </div>

              <div>
                <Label htmlFor="cs-brief">What do you need?</Label>
                <Textarea id="cs-brief" rows={4} value={form.brief} onChange={(e) => setForm({ ...form, brief: e.target.value })} placeholder="Describe the vibe, deadline, captions, brand colors…" />
                {errors.brief ? <p className="mt-1 text-xs text-destructive">{errors.brief}</p> : null}
              </div>

              <Button type="submit" size="lg" className="w-full">Submit request</Button>
            </form>
          </CardContent>
        </Card>
      </section>
    </PageShell>
  );
}
