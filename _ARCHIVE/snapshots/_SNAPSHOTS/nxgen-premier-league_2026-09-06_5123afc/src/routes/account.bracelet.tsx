import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { isProfileUnlocked, COMPLETION_UNLOCK } from "@/lib/profile-completion";
import { useMembershipTier } from "@/lib/use-membership-tier";
import { linkBracelet, setBraceletActive, unlinkBracelet } from "@/lib/bracelet.functions";

export const Route = createFileRoute("/account/bracelet")({
  head: () => ({
    meta: [
      { title: "Link Your Bracelet — NXGEN Premier League" },
      { name: "description", content: "Bind an RFID bracelet UID to your NXGEN player account." },
    ],
  }),
  component: BraceletPage,
});

type Bracelet = {
  id: string;
  uid: string;
  label: string | null;
  active: boolean;
  issued_at: string;
};

function BraceletPage() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const [bracelets, setBracelets] = useState<Bracelet[]>([]);
  const [uid, setUid] = useState("");
  const [label, setLabel] = useState("");
  const [saving, setSaving] = useState(false);
  const [scanning, setScanning] = useState(false);
  const { loading: tierLoading, refresh: refreshTier } = useMembershipTier();
  const doLink = useServerFn(linkBracelet);
  const doSetActive = useServerFn(setBraceletActive);
  const doUnlink = useServerFn(unlinkBracelet);

  const load = useCallback(async (uid: string) => {
    const { data, error } = await supabase
      .from("bracelets")
      .select("id,uid,label,active,issued_at")
      .eq("user_id", uid)
      .order("issued_at", { ascending: false });
    if (error) toast.error(error.message);
    else setBracelets(data ?? []);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) {
        navigate({ to: "/auth" });
        return;
      }
      const uid = data.session.user.id;
      // Gate: require profile completion
      const { data: prof } = await supabase.from("profiles")
        .select("full_name, phone, photo_url, bio, position, jersey_number, division, height_cm, weight_kg, date_of_birth")
        .eq("id", uid).maybeSingle();
      if (!isProfileUnlocked(prof)) {
        toast.error(`Complete your profile (${COMPLETION_UNLOCK}%+) to link a bracelet.`);
        navigate({ to: "/profile" });
        return;
      }
      setUserId(uid);
      load(uid).finally(() => setChecking(false));
    });
  }, [navigate, load]);

  const normalize = (raw: string) =>
    raw.trim().toUpperCase().replace(/[^0-9A-F]/g, "");

  const handleLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    setSaving(true);
    try {
      await doLink({ data: { uid, label: label.trim() || undefined } });
      refreshTier();
      toast.success("Bracelet linked — you're now a Full Member. Staff will activate it after verification.");
      setUid("");
      setLabel("");
      load(userId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not link that bracelet.");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (b: Bracelet) => {
    try {
      await doSetActive({ data: { id: b.id, active: !b.active } });
      if (userId) load(userId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update that bracelet.");
    }
  };

  const unlink = async (b: Bracelet) => {
    if (!confirm(`Unlink bracelet ${b.uid}?`)) return;
    try {
      await doUnlink({ data: { id: b.id } });
      refreshTier();
      toast.success("Bracelet unlinked");
      if (userId) load(userId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not unlink that bracelet.");
    }
  };

  // Web NFC (Chrome on Android)
  const scanNFC = async () => {
    const NDEFReader = (window as unknown as { NDEFReader?: new () => {
      scan: () => Promise<void>;
      addEventListener: (t: string, cb: (e: { serialNumber?: string }) => void) => void;
    } }).NDEFReader;
    if (!NDEFReader) {
      toast.error("Web NFC not supported on this device. Enter the UID manually.");
      return;
    }
    try {
      setScanning(true);
      const reader = new NDEFReader();
      await reader.scan();
      toast.message("Tap your bracelet to the back of the phone…");
      reader.addEventListener("reading", (event) => {
        if (event.serialNumber) {
          setUid(event.serialNumber.replace(/:/g, "").toUpperCase());
          toast.success("Bracelet detected");
        }
        setScanning(false);
      });
    } catch (err) {
      setScanning(false);
      toast.error((err as Error).message);
    }
  };

  const writeTapUrl = async (b: Bracelet) => {
    const NDEFReader = (window as unknown as { NDEFReader?: new () => {
      write: (msg: { records: Array<{ recordType: string; data: string }> }) => Promise<void>;
    } }).NDEFReader;
    if (!NDEFReader) return toast.error("Web NFC write requires Chrome on Android.");
    const url = `${window.location.origin}/t/${b.uid}`;
    try {
      const writer = new NDEFReader();
      toast.message("Tap the bracelet now to write the tap URL…");
      await writer.write({ records: [{ recordType: "url", data: url }] });
      toast.success("Tap URL written to bracelet");
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  if (checking || tierLoading) {
    return <div className="min-h-screen grid place-items-center text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="min-h-screen bg-background py-16 px-6">
      <div className="mx-auto max-w-2xl space-y-10">
        <div>
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">← Back to site</Link>
          <h1 className="mt-4 text-3xl font-bold tracking-tight">Link your bracelet</h1>
          <p className="mt-2 text-muted-foreground">
            Bind an RFID/NFC bracelet UID to your account for venue check-in and stat tracking.
            Scan with a compatible phone or enter the UID printed on your bracelet.
          </p>
        </div>

        <form onSubmit={handleLink} className="space-y-4 rounded-lg border border-border bg-card p-6">
          <div className="space-y-2">
            <Label htmlFor="uid">Bracelet UID</Label>
            <div className="flex gap-2">
              <Input
                id="uid"
                value={uid}
                onChange={(e) => setUid(e.target.value)}
                placeholder="e.g. 04A1B2C3D4E5"
                autoComplete="off"
                required
              />
              <Button type="button" variant="outline" onClick={scanNFC} disabled={scanning}>
                {scanning ? "Scanning…" : "Scan NFC"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Hex characters only. NFC scanning works in Chrome on Android.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="label">Label (optional)</Label>
            <Input
              id="label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Primary band, Backup"
              maxLength={50}
            />
          </div>

          <Button type="submit" disabled={saving} className="w-full">
            {saving ? "Linking…" : "Link bracelet"}
          </Button>
        </form>

        <div className="space-y-3">
          <h2 className="text-xl font-semibold">Your bracelets</h2>
          {bracelets.length === 0 ? (
            <p className="text-sm text-muted-foreground">No bracelets linked yet.</p>
          ) : (
            <ul className="divide-y divide-border rounded-lg border border-border bg-card">
              {bracelets.map((b) => (
                <li key={b.id} className="flex items-center justify-between gap-4 p-4">
                  <div className="min-w-0">
                    <p className="font-mono text-sm">{b.uid}</p>
                    <p className="text-xs text-muted-foreground">
                      {b.label ?? "No label"} · {b.active ? "Active" : "Pending staff activation"} ·{" "}
                      {new Date(b.issued_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 shrink-0">
                    <Button size="sm" variant="outline" onClick={() => writeTapUrl(b)}>
                      Write Tap URL
                    </Button>
                    {b.active && (
                      <Button size="sm" variant="outline" onClick={() => toggleActive(b)}>
                        Disable
                      </Button>
                    )}
                    <Button size="sm" variant="destructive" onClick={() => unlink(b)}>
                      Unlink
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
