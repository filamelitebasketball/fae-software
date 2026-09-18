import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { BackButton } from "@/components/back-button";
import { RequireStaff } from "@/components/require-staff";
import { SignedImage } from "@/components/signed-image";
import { logAdminActivity } from "@/lib/admin-log";
import { ImageIcon, Trash2, Upload } from "lucide-react";

export const Route = createFileRoute("/admin/gallery")({
  head: () => ({
    meta: [
      { title: "Gallery Uploads — NXGEN Admin" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <RequireStaff>
      <AdminGallery />
    </RequireStaff>
  ),
});

type Photo = {
  id: string;
  title: string | null;
  caption: string | null;
  division: string | null;
  game_night: string | null;
  image_path: string;
};

const DIVISIONS = ["Rising Stars", "Legacy", "3x3", "King of the Court"];

function AdminGallery() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [files, setFiles] = useState<FileList | null>(null);
  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [division, setDivision] = useState("");
  const [gameNight, setGameNight] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const { data } = await supabase
      .from("gallery_photos")
      .select("id, title, caption, division, game_night, image_path")
      .order("game_night", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });
    setPhotos((data as Photo[]) ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  async function upload() {
    if (!files || files.length === 0) {
      toast.error("Choose at least one photo");
      return;
    }
    setBusy(true);
    const { data: auth } = await supabase.auth.getUser();
    let ok = 0;
    for (const file of Array.from(files)) {
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${gameNight || "undated"}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("gallery")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) {
        toast.error(`Upload failed: ${upErr.message}`);
        continue;
      }
      const { error } = await supabase.from("gallery_photos").insert({
        title: title || null,
        caption: caption || null,
        division: division || null,
        game_night: gameNight || null,
        image_path: path,
        uploaded_by: auth.user?.id ?? null,
      });
      if (error) toast.error(error.message);
      else ok += 1;
    }
    if (ok) {
      await logAdminActivity("import", "created", {
        label: `${ok} gallery photo(s)`,
        details: [division, gameNight].filter(Boolean).join(" · ") || null,
      });
      toast.success(`${ok} photo(s) published`);
      setFiles(null);
      setTitle("");
      setCaption("");
      load();
    }
    setBusy(false);
  }

  async function remove(p: Photo) {
    if (!confirm("Delete this photo?")) return;
    await supabase.storage.from("gallery").remove([p.image_path]);
    const { error } = await supabase.from("gallery_photos").delete().eq("id", p.id);
    if (error) return toast.error(error.message);
    await logAdminActivity("import", "deleted", { id: p.id, label: p.title ?? p.image_path });
    toast.success("Photo deleted");
    load();
  }

  const inputCls = "w-full border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground";

  return (
    <div className="adm-root">
      <div className="adm-wrap" style={{ maxWidth: 1100 }}>
        <div style={{ marginBottom: 20 }}><BackButton fallback="/admin" /></div>
        <div style={{ marginBottom: 24 }}>
          <p className="eyebrow" style={{ fontSize: 9 }}>Admin</p>
          <h1 className="display" style={{ fontSize: "clamp(1.4rem,3.5vw,2rem)", marginTop: 8 }}>Gallery Uploads</h1>
          <p style={{ fontSize: 12, color: "var(--silver-d)", marginTop: 4 }}>
            Upload game night photos. They appear publicly on <Link to="/gallery" className="underline">/gallery</Link>.
          </p>
        </div>

        <section style={{ background: "var(--s1)", border: "1px solid var(--line)", borderRadius: 14, padding: 20 }}>
          <h2 className="text-xs font-black uppercase tracking-widest">New upload</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="text-xs uppercase tracking-widest text-muted-foreground">
              Game night
              <input type="date" value={gameNight} onChange={(e) => setGameNight(e.target.value)} className={`mt-1 ${inputCls}`} />
            </label>
            <label className="text-xs uppercase tracking-widest text-muted-foreground">
              Division
              <select value={division} onChange={(e) => setDivision(e.target.value)} className={`mt-1 ${inputCls}`}>
                <option value="">— None —</option>
                {DIVISIONS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </label>
            <label className="text-xs uppercase tracking-widest text-muted-foreground">
              Title (optional)
              <input value={title} onChange={(e) => setTitle(e.target.value)} className={`mt-1 ${inputCls}`} placeholder="Opening Night" />
            </label>
            <label className="text-xs uppercase tracking-widest text-muted-foreground">
              Caption (optional)
              <input value={caption} onChange={(e) => setCaption(e.target.value)} className={`mt-1 ${inputCls}`} placeholder="Game 3 highlights" />
            </label>
          </div>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => setFiles(e.target.files)}
            className="mt-4 block w-full text-sm text-muted-foreground file:mr-3 file:border file:border-border file:bg-card file:px-3 file:py-2 file:text-xs file:font-bold file:uppercase file:tracking-widest file:text-foreground"
          />
          <button
            type="button"
            onClick={upload}
            disabled={busy}
            className="btn btn-gold btn-sm mt-4"
          >
            <Upload className="h-4 w-4" />
            {busy ? "Uploading…" : "Publish photos"}
          </button>
        </section>

        <section className="mt-10">
          <h2 className="eyebrow" style={{ fontSize: 9 }}>Published ({photos.length})</h2>
          {photos.length === 0 ? (
            <p className="mt-3" style={{ fontSize: 13, color: "var(--silver-d)" }}>No photos yet.</p>
          ) : (
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {photos.map((p) => (
                <div key={p.id} style={{ background: "var(--s1)", border: "1px solid var(--line)", borderRadius: 12, overflow: "hidden" }}>
                  <div className="aspect-square overflow-hidden" style={{ background: "var(--s2)" }}>
                    <SignedImage
                      bucket="gallery"
                      path={p.image_path}
                      alt={p.title ?? "Gallery photo"}
                      className="h-full w-full object-cover"
                      fallback={<div className="grid h-full w-full place-items-center"><ImageIcon className="h-5 w-5" style={{ color: "var(--silver-d)" }} /></div>}
                    />
                  </div>
                  <div className="flex items-center justify-between gap-2 p-2">
                    <span className="truncate text-[10px] uppercase tracking-widest" style={{ color: "var(--silver-d)" }}>
                      {p.game_night ?? "Undated"}{p.division ? ` · ${p.division}` : ""}
                    </span>
                    <button type="button" onClick={() => remove(p)} aria-label="Delete photo" style={{ color: "var(--silver-d)" }}>
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
