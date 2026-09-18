import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { RequireStaff } from "@/components/require-staff";
import { BackButton } from "@/components/back-button";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Trash2, Pencil } from "lucide-react";
import { SignedImage } from "@/components/signed-image";

export const Route = createFileRoute("/admin/players")({
  head: () => ({
    meta: [
      { title: "Player Registry — NXGEN Admin" },
      { name: "description", content: "Manage NXGEN player profiles, highlights and stats." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPlayersPage,
});

const DIVISIONS = ["Rising Stars", "Legacy", "3x3", "King of the Court"];

type Highlight = { title: string; url: string; description?: string };

type PlayerProfile = {
  id: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  photo_url: string | null;
  bio: string | null;
  position: string | null;
  jersey_number: string | null;
  division: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  date_of_birth: string | null;
  highlights: Highlight[];
  stats: Record<string, string | number>;
  admin_notes: string | null;
  updated_at: string;
};

function AdminPlayersPage() {
  const [players, setPlayers] = useState<PlayerProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [divisionFilter, setDivisionFilter] = useState<string>("all");
  const [editing, setEditing] = useState<PlayerProfile | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("updated_at", { ascending: false });
    if (error) toast.error(error.message);
    else setPlayers((data as unknown as PlayerProfile[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = players.filter((p) => {
    if (divisionFilter !== "all" && p.division !== divisionFilter) return false;
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      p.full_name?.toLowerCase().includes(q) ||
      p.position?.toLowerCase().includes(q) ||
      p.jersey_number?.toLowerCase().includes(q)
    );
  });

  return (
    <RequireStaff>
    <div className="adm-root">
      <div className="adm-wrap" style={{ maxWidth: 1100 }}>
        <div style={{ marginBottom: 20 }}><BackButton fallback="/" /></div>
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow" style={{ fontSize: 9 }}>Registry</p>
            <h1 className="display" style={{ fontSize: "clamp(1.4rem,3.5vw,2rem)", marginTop: 8 }}>Player Profiles</h1>
            <p style={{ fontSize: 12, color: "var(--silver-d)", marginTop: 4 }}>{players.length} players in the database.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Input
              placeholder="Search name, position, #"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-64"
            />
            <Select value={divisionFilter} onValueChange={setDivisionFilter}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All divisions</SelectItem>
                {DIVISIONS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
            <button type="button" className="btn btn-ghost btn-sm" onClick={load} disabled={loading}>Refresh</button>
          </div>
        </div>

        <div className="overflow-x-auto" style={{ border: "1px solid var(--line)", borderRadius: 12 }}>
          <table className="w-full text-sm">
            <thead style={{ background: "var(--s1)", color: "var(--silver-d)" }} className="text-xs uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 text-left">Player</th>
                <th className="px-4 py-3 text-left">Division</th>
                <th className="px-4 py-3 text-left">Pos</th>
                <th className="px-4 py-3 text-left">#</th>
                <th className="px-4 py-3 text-left">Highlights</th>
                <th className="px-4 py-3 text-left">Updated</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} className="border-t border-border">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <SignedImage
                        bucket="player-photos"
                        path={p.photo_url ?? p.avatar_url}
                        alt=""
                        className="h-10 w-10 rounded-full object-cover"
                        fallback={<div className="h-10 w-10 rounded-full bg-muted" />}
                      />
                      <div>
                        <div className="font-semibold">{p.full_name || "Unnamed player"}</div>
                        <div className="text-xs text-muted-foreground">{p.phone || "—"}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">{p.division || "—"}</td>
                  <td className="px-4 py-3">{p.position || "—"}</td>
                  <td className="px-4 py-3">{p.jersey_number || "—"}</td>
                  <td className="px-4 py-3">{Array.isArray(p.highlights) ? p.highlights.length : 0}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(p.updated_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-right">
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing(p)}>
                      <Pencil className="mr-2 h-3 w-3" />Edit
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-10 text-center" style={{ color: "var(--silver-d)" }}>No players match.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editing && (
        <EditPlayerDialog
          player={editing}
          onClose={() => setEditing(null)}
          onSaved={(updated) => {
            setPlayers((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
            setEditing(null);
          }}
        />
      )}
    </div>
    </RequireStaff>
  );
}


function EditPlayerDialog({
  player,
  onClose,
  onSaved,
}: {
  player: PlayerProfile;
  onClose: () => void;
  onSaved: (p: PlayerProfile) => void;
}) {
  const [form, setForm] = useState<PlayerProfile>({
    ...player,
    highlights: Array.isArray(player.highlights) ? player.highlights : [],
    stats: player.stats && typeof player.stats === "object" ? player.stats : {},
  });
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof PlayerProfile>(k: K, v: PlayerProfile[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const addHighlight = () =>
    set("highlights", [...form.highlights, { title: "", url: "", description: "" }]);
  const removeHighlight = (i: number) =>
    set("highlights", form.highlights.filter((_, idx) => idx !== i));
  const updateHighlight = (i: number, patch: Partial<Highlight>) =>
    set("highlights", form.highlights.map((h, idx) => (idx === i ? { ...h, ...patch } : h)));

  const statEntries = Object.entries(form.stats);
  const addStat = () => set("stats", { ...form.stats, "": "" });
  const updateStatKey = (oldKey: string, newKey: string) => {
    const next: Record<string, string | number> = {};
    Object.entries(form.stats).forEach(([k, v]) => {
      next[k === oldKey ? newKey : k] = v;
    });
    set("stats", next);
  };
  const updateStatValue = (key: string, value: string) =>
    set("stats", { ...form.stats, [key]: value });
  const removeStat = (key: string) => {
    const next = { ...form.stats };
    delete next[key];
    set("stats", next);
  };

  const save = async () => {
    setSaving(true);
    const { data, error } = await supabase
      .from("profiles")
      .update({
        full_name: form.full_name,
        phone: form.phone,
        photo_url: form.photo_url,
        bio: form.bio,
        position: form.position,
        jersey_number: form.jersey_number,
        division: form.division,
        height_cm: form.height_cm,
        weight_kg: form.weight_kg,
        date_of_birth: form.date_of_birth,
        highlights: form.highlights,
        stats: form.stats,
        admin_notes: form.admin_notes,
      })
      .eq("id", form.id)
      .select("*")
      .single();
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Player updated");
    onSaved(data as unknown as PlayerProfile);
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Player</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-2">
          <div><Label>Full name</Label><Input value={form.full_name ?? ""} onChange={(e) => set("full_name", e.target.value)} /></div>
          <div><Label>Phone</Label><Input value={form.phone ?? ""} onChange={(e) => set("phone", e.target.value)} /></div>
          <div>
            <Label>Division</Label>
            <Select value={form.division ?? ""} onValueChange={(v) => set("division", v)}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                {DIVISIONS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Position</Label><Input value={form.position ?? ""} onChange={(e) => set("position", e.target.value)} /></div>
          <div><Label>Jersey #</Label><Input value={form.jersey_number ?? ""} onChange={(e) => set("jersey_number", e.target.value)} /></div>
          <div><Label>Date of birth</Label><Input type="date" value={form.date_of_birth ?? ""} onChange={(e) => set("date_of_birth", e.target.value || null)} /></div>
          <div><Label>Height (cm)</Label><Input type="number" value={form.height_cm ?? ""} onChange={(e) => set("height_cm", e.target.value ? Number(e.target.value) : null)} /></div>
          <div><Label>Weight (kg)</Label><Input type="number" value={form.weight_kg ?? ""} onChange={(e) => set("weight_kg", e.target.value ? Number(e.target.value) : null)} /></div>
          <div className="md:col-span-2"><Label>Photo URL</Label><Input value={form.photo_url ?? ""} onChange={(e) => set("photo_url", e.target.value)} placeholder="https://..." /></div>
          <div className="md:col-span-2"><Label>Bio</Label><Textarea rows={3} value={form.bio ?? ""} onChange={(e) => set("bio", e.target.value)} /></div>
        </div>

        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between">
            <Label>Highlights</Label>
            <Button size="sm" variant="outline" onClick={addHighlight}><Plus className="mr-1 h-3 w-3" />Add</Button>
          </div>
          <div className="space-y-3">
            {form.highlights.map((h, i) => (
              <div key={i} className="grid gap-2 border border-border p-3 md:grid-cols-[1fr_1fr_auto]">
                <Input placeholder="Title (e.g. 30-pt game vs Legacy)" value={h.title} onChange={(e) => updateHighlight(i, { title: e.target.value })} />
                <Input placeholder="Video / photo URL" value={h.url} onChange={(e) => updateHighlight(i, { url: e.target.value })} />
                <Button size="icon" variant="ghost" onClick={() => removeHighlight(i)}><Trash2 className="h-4 w-4" /></Button>
                <Textarea rows={2} className="md:col-span-3" placeholder="Description" value={h.description ?? ""} onChange={(e) => updateHighlight(i, { description: e.target.value })} />
              </div>
            ))}
            {form.highlights.length === 0 && <p className="text-xs text-muted-foreground">No highlights yet.</p>}
          </div>
        </div>

        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between">
            <Label>Stats</Label>
            <Button size="sm" variant="outline" onClick={addStat}><Plus className="mr-1 h-3 w-3" />Add stat</Button>
          </div>
          <div className="space-y-2">
            {statEntries.map(([k, v], idx) => (
              <div key={idx} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                <Input placeholder="Stat (PPG)" value={k} onChange={(e) => updateStatKey(k, e.target.value)} />
                <Input placeholder="Value" value={String(v)} onChange={(e) => updateStatValue(k, e.target.value)} />
                <Button size="icon" variant="ghost" onClick={() => removeStat(k)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6">
          <Label>Admin notes (private)</Label>
          <Textarea rows={3} value={form.admin_notes ?? ""} onChange={(e) => set("admin_notes", e.target.value)} />
        </div>

        <DialogFooter className="mt-6">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save changes"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
