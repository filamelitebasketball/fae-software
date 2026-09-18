import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BackButton } from "@/components/back-button";
import { SignedImage } from "@/components/signed-image";
import { toast } from "sonner";
import { Upload, Send, Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/account/team")({
  head: () => ({
    meta: [
      { title: "My Team Draft — NXGEN" },
      { name: "description", content: "Coaches: draft your team roster and submit for admin approval." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: TeamDraftPage,
});

const DIVISIONS = ["Rising Stars", "Legacy", "3x3", "King of the Court"];

type Team = {
  id: string;
  name: string;
  division: string;
  logo_url: string | null;
  slug: string;
  status: string;
  coach_id: string | null;
  submitted_by: string | null;
  rejection_reason: string | null;
};

type RosterPlayer = {
  id: string;
  name: string;
  jersey_number: string | null;
  position: string | null;
  photo_url: string | null;
  team_id: string | null;
  division: string;
};

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 60) || `team-${Date.now()}`;
}

function TeamDraftPage() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [team, setTeam] = useState<Team | null>(null);
  const [roster, setRoster] = useState<RosterPlayer[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [newPlayer, setNewPlayer] = useState({ name: "", jersey_number: "", position: "" });

  const load = useCallback(async (uid: string) => {
    setLoading(true);
    const { data: t } = await supabase
      .from("teams")
      .select("id,name,division,logo_url,slug,status,coach_id,submitted_by,rejection_reason")
      .or(`coach_id.eq.${uid},submitted_by.eq.${uid}`)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (t) {
      setTeam(t as Team);
      const { data: r } = await supabase
        .from("players")
        .select("id,name,jersey_number,position,photo_url,team_id,division")
        .eq("team_id", t.id)
        .order("jersey_number");
      setRoster((r as RosterPlayer[]) ?? []);
    } else {
      setTeam({ id: "", name: "", division: DIVISIONS[0], logo_url: null, slug: "", status: "draft", coach_id: uid, submitted_by: uid, rejection_reason: null });
      setRoster([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      const uid = data.session?.user.id;
      if (!uid) { navigate({ to: "/auth" }); return; }
      setUserId(uid);
      await load(uid);
    })();
  }, [navigate, load]);

  const readOnly = !!team && (team.status === "approved" || team.status === "pending");

  const uploadLogo = async (file: File) => {
    if (!userId) return;
    setUploading(true);
    const ext = file.name.split(".").pop() || "png";
    const path = `${userId}/team-logo-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("player-photos").upload(path, file, { upsert: true, contentType: file.type });
    setUploading(false);
    if (error) return toast.error(error.message);
    setTeam((t) => t && { ...t, logo_url: path });
    toast.success("Logo uploaded");
  };

  const saveDraft = async (submit = false) => {
    if (!team || !userId) return;
    if (!team.name.trim()) return toast.error("Team name is required");
    setSaving(true);
    const payload = {
      name: team.name.trim(),
      division: team.division,
      logo_url: team.logo_url,
      slug: team.slug || slugify(team.name),
      status: submit ? "pending" : "draft",
      coach_id: userId,
      submitted_by: userId,
    };
    let id = team.id;
    if (id) {
      const { error } = await supabase.from("teams").update(payload).eq("id", id);
      if (error) { setSaving(false); return toast.error(error.message); }
    } else {
      const { data, error } = await supabase.from("teams").insert(payload).select("id").single();
      if (error || !data) { setSaving(false); return toast.error(error?.message ?? "Failed"); }
      id = data.id;
      setTeam((t) => t && { ...t, id });
    }
    setSaving(false);
    toast.success(submit ? "Submitted for admin approval" : "Draft saved");
    await load(userId);
  };

  const addPlayer = async () => {
    if (!team?.id) return toast.error("Save the team draft first");
    if (!newPlayer.name.trim()) return toast.error("Player name required");
    const { error } = await supabase.from("players").insert({
      name: newPlayer.name.trim(),
      jersey_number: newPlayer.jersey_number || null,
      position: newPlayer.position || null,
      team_id: team.id,
      division: team.division,
    });
    if (error) return toast.error(error.message);
    setNewPlayer({ name: "", jersey_number: "", position: "" });
    if (userId) await load(userId);
  };

  const removePlayer = async (id: string) => {
    const { error } = await supabase.from("players").delete().eq("id", id);
    if (error) return toast.error(error.message);
    if (userId) await load(userId);
  };

  if (loading || !team) {
    return <div className="min-h-screen grid place-items-center text-muted-foreground text-sm">Loading…</div>;
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto max-w-4xl px-4 py-8 space-y-6">
        <BackButton fallback="/profile" />
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tight">My Team Draft</h1>
            <p className="text-sm text-muted-foreground">Coaches build their roster here. Submit for admin approval when ready.</p>
          </div>
          <Badge variant={team.status === "approved" ? "default" : team.status === "pending" ? "secondary" : team.status === "rejected" ? "destructive" : "outline"}>
            {team.status.toUpperCase()}
          </Badge>
        </div>

        {team.status === "rejected" && team.rejection_reason && (
          <div className="border border-destructive/60 bg-destructive/10 p-3 text-sm">
            <strong>Rejected:</strong> {team.rejection_reason}
          </div>
        )}

        <div className="border border-border bg-card p-6 space-y-4">
          <div className="flex items-center gap-4">
            <div className="h-20 w-20 border border-border bg-background grid place-items-center overflow-hidden">
              <SignedImage
                bucket="player-photos"
                path={team.logo_url}
                alt="Team logo"
                className="h-full w-full object-contain"
                fallback={<span className="text-xs text-muted-foreground">No logo</span>}
              />
            </div>
            {!readOnly && (
              <label className="inline-flex">
                <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadLogo(e.target.files[0])} />
                <Button asChild size="sm" variant="outline" disabled={uploading}>
                  <span><Upload className="mr-2 h-3 w-3" />{uploading ? "Uploading…" : "Upload logo"}</span>
                </Button>
              </label>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Team name *</Label>
              <Input value={team.name} disabled={readOnly} onChange={(e) => setTeam({ ...team, name: e.target.value })} placeholder="e.g. Aguila Legends" />
            </div>
            <div>
              <Label>Division *</Label>
              <Select value={team.division} onValueChange={(v) => !readOnly && setTeam({ ...team, division: v })}>
                <SelectTrigger disabled={readOnly}><SelectValue /></SelectTrigger>
                <SelectContent>{DIVISIONS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          {!readOnly && (
            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" onClick={() => saveDraft(false)} disabled={saving}>Save draft</Button>
              <Button onClick={() => saveDraft(true)} disabled={saving}><Send className="mr-2 h-4 w-4" />Submit for approval</Button>
            </div>
          )}
        </div>

        <div className="border border-border bg-card p-6 space-y-4">
          <h2 className="text-lg font-bold uppercase">Roster ({roster.length})</h2>

          {roster.length === 0 ? (
            <p className="text-sm text-muted-foreground">No players yet.</p>
          ) : (
            <ul className="divide-y divide-border border border-border">
              {roster.map((p) => (
                <li key={p.id} className="flex items-center gap-3 px-3 py-2">
                  <SignedImage
                    bucket="player-photos"
                    path={p.photo_url}
                    alt={p.name}
                    className="h-10 w-10 rounded-full object-cover"
                    fallback={<div className="h-10 w-10 rounded-full bg-muted" />}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate">{p.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {p.jersey_number ? `#${p.jersey_number}` : ""}{p.position ? ` · ${p.position}` : ""}
                    </div>
                  </div>
                  <Link to="/players/$playerId" params={{ playerId: p.id }} className="text-xs underline">View</Link>
                  {!readOnly && (
                    <Button size="sm" variant="ghost" onClick={() => removePlayer(p.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}

          {!readOnly && team.id && (
            <div className="grid gap-2 md:grid-cols-[1fr_100px_140px_auto] items-end pt-2 border-t border-border">
              <div>
                <Label>Player name</Label>
                <Input value={newPlayer.name} onChange={(e) => setNewPlayer({ ...newPlayer, name: e.target.value })} />
              </div>
              <div>
                <Label>Jersey #</Label>
                <Input value={newPlayer.jersey_number} onChange={(e) => setNewPlayer({ ...newPlayer, jersey_number: e.target.value })} />
              </div>
              <div>
                <Label>Position</Label>
                <Input value={newPlayer.position} onChange={(e) => setNewPlayer({ ...newPlayer, position: e.target.value })} placeholder="Guard, Forward…" />
              </div>
              <Button onClick={addPlayer}><Plus className="mr-1 h-4 w-4" />Add</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
