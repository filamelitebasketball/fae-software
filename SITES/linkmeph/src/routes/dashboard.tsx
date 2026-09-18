import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { PageHeader, PageShell } from "@/components/PageShell";
import { ProfileCard, downloadVCard } from "@/components/ProfileCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { analytics, creativeOrders, demoProfile, leads, myPasses, themes, type ProfileTheme } from "@/data/linkmeph";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Account Dashboard — LinkMePH" },
      { name: "description", content: "Manage your LinkMe Card and analytics, live sports passes and creative service orders in one dashboard." },
      { property: "og:title", content: "Account Dashboard — LinkMePH" },
      { property: "og:description", content: "One place for your card, analytics, passes and creative orders." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const [profile, setProfile] = useState(demoProfile);
  const [theme, setTheme] = useState<ProfileTheme>(demoProfile.theme);

  return (
    <PageShell>
      <PageHeader eyebrow="Your account" title="Dashboard" description="LinkMe Card, live sports passes and creative orders — all in one place." />

      <section className="mx-auto max-w-6xl px-4 py-10">
        <Tabs defaultValue="card">
          <TabsList className="flex-wrap">
            <TabsTrigger value="card">Card & analytics</TabsTrigger>
            <TabsTrigger value="profile">Edit profile</TabsTrigger>
            <TabsTrigger value="passes">Sports passes</TabsTrigger>
            <TabsTrigger value="orders">Creative orders</TabsTrigger>
          </TabsList>

          <TabsContent value="card" className="mt-6 space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: "Profile views", value: analytics.views },
                { label: "Link clicks", value: analytics.clicks },
                { label: "Card taps", value: analytics.taps },
                { label: "Leads captured", value: analytics.leads },
              ].map((s) => (
                <Card key={s.label}>
                  <CardContent className="p-5">
                    <p className="text-xs uppercase tracking-widest text-muted-foreground">{s.label}</p>
                    <p className="mt-2 font-display text-3xl font-bold">{s.value.toLocaleString()}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card>
              <CardHeader><CardTitle className="text-base">Last 7 days</CardTitle></CardHeader>
              <CardContent>
                <div className="flex h-44 items-end gap-3">
                  {analytics.daily.map((d) => (
                    <div key={d.day} className="flex flex-1 flex-col items-center gap-2">
                      <div className="flex w-full flex-1 items-end gap-1">
                        <div className="brand-gradient w-full rounded-t" style={{ height: `${(d.views / 550) * 100}%` }} />
                        <div className="w-full rounded-t bg-primary/70" style={{ height: `${(d.clicks / 550) * 100}%` }} />
                        <div className="w-full rounded-t bg-brand-cyan" style={{ height: `${(d.taps / 550) * 100}%` }} />
                      </div>
                      <span className="text-xs text-muted-foreground">{d.day}</span>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-xs text-muted-foreground">Views · Clicks · Taps</p>
              </CardContent>
            </Card>

            <div className="grid gap-5 lg:grid-cols-2">
              <Card>
                <CardHeader><CardTitle className="text-base">Top links</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {analytics.topLinks.map((l) => (
                    <div key={l.label}>
                      <div className="flex justify-between text-sm"><span>{l.label}</span><span className="text-muted-foreground">{l.clicks}</span></div>
                      <div className="mt-1 h-2 rounded-full bg-muted">
                        <div className="brand-gradient h-2 rounded-full" style={{ width: `${(l.clicks / 344) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-base">Captured leads</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {leads.map((l) => (
                    <div key={l.id} className="rounded-xl border border-border p-3">
                      <p className="text-sm font-semibold">{l.name}</p>
                      <p className="text-xs text-muted-foreground">{l.phone} · {l.date}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{l.note}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="profile" className="mt-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader><CardTitle className="text-base">Edit your public card</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div><Label htmlFor="p-name">Name</Label><Input id="p-name" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} /></div>
                  <div><Label htmlFor="p-title">Title</Label><Input id="p-title" value={profile.title} onChange={(e) => setProfile({ ...profile, title: e.target.value })} /></div>
                  <div><Label htmlFor="p-company">Company</Label><Input id="p-company" value={profile.company} onChange={(e) => setProfile({ ...profile, company: e.target.value })} /></div>
                  <div><Label htmlFor="p-bio">Bio</Label><Textarea id="p-bio" rows={3} value={profile.bio} onChange={(e) => setProfile({ ...profile, bio: e.target.value })} /></div>
                  <div>
                    <Label>Theme</Label>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      {themes.map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setTheme(t.id)}
                          className={`rounded-xl border p-3 text-left text-sm ${theme === t.id ? "border-primary bg-primary/5" : "border-border"}`}
                        >
                          <span className="font-semibold">{t.name}</span>
                          <span className="block text-xs text-muted-foreground">{t.description}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={() => toast.success("Profile saved (demo)")}>Save changes</Button>
                    <Button variant="outline" onClick={() => downloadVCard(profile)}>Download my vCard</Button>
                    <Button asChild variant="ghost"><Link to="/p/$slug" params={{ slug: profile.slug }}>View public page</Link></Button>
                  </div>
                </CardContent>
              </Card>

              <div>
                <p className="mb-3 text-xs uppercase tracking-widest text-muted-foreground">Live preview</p>
                <ProfileCard profile={profile} theme={theme} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="passes" className="mt-6 space-y-3">
            {myPasses.map((p) => (
              <Card key={p.id}>
                <CardContent className="flex flex-wrap items-center justify-between gap-3 p-5">
                  <div>
                    <p className="text-sm font-semibold">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.detail}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={p.status === "Used" ? "secondary" : "default"}>{p.status}</Badge>
                    <span className="text-sm text-muted-foreground">₱{p.price}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
            <Button asChild variant="outline"><Link to="/my-passes">Open My Passes</Link></Button>
          </TabsContent>

          <TabsContent value="orders" className="mt-6 space-y-3">
            {creativeOrders.map((o) => (
              <Card key={o.id}>
                <CardContent className="flex flex-wrap items-center justify-between gap-3 p-5">
                  <div>
                    <p className="text-sm font-semibold">{o.package}</p>
                    <p className="text-xs text-muted-foreground">{o.id} · Submitted {o.submitted} · {o.note}</p>
                  </div>
                  <Badge variant={o.status === "Delivered" ? "default" : o.status === "In Progress" ? "secondary" : "outline"}>
                    {o.status}
                  </Badge>
                </CardContent>
              </Card>
            ))}
            <Button asChild variant="outline"><Link to="/creative-services">Start a new request</Link></Button>
          </TabsContent>
        </Tabs>
      </section>
    </PageShell>
  );
}
