import { SITE_URL } from "@/lib/site-url";
import { createFileRoute } from "@tanstack/react-router";
import { useSiteSettings } from "@/lib/site-settings";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SignedImage } from "@/components/signed-image";
import { ImageIcon, X } from "lucide-react";
import { NxPage } from "@/components/nx-shell";
import { NxLaunchNotice } from "@/components/nx-launch-notice";

export const Route = createFileRoute("/gallery")({
  head: () => ({
    meta: [
      { title: "Photo Gallery — NXGEN Premier League" },
      { name: "description", content: "Photos and highlights from every NXGEN game night at F.A.E. Court." },
      { property: "og:title", content: "NXGEN Photo Gallery" },
      { property: "og:description", content: "Courtside photos from every NXGEN game night, organised by division and date." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/gallery` }],
  }),
  component: GalleryPage,
});

type Photo = {
  id: string;
  title: string | null;
  caption: string | null;
  division: string | null;
  game_night: string | null;
  image_path: string;
  created_at: string;
};

const DIVISIONS = ["Rising Stars", "Legacy", "3x3", "King of the Court"];

function formatNight(d: string | null) {
  if (!d) return "Undated";
  return new Date(`${d}T00:00:00`).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

function GalleryPage() {
  const settings = useSiteSettings();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [division, setDivision] = useState("All");
  const [groupBy, setGroupBy] = useState<"night" | "division">("night");
  const [lightbox, setLightbox] = useState<Photo | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("gallery_photos")
        .select("id, title, caption, division, game_night, image_path, created_at")
        .order("game_night", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false });
      setPhotos((data as Photo[]) ?? []);
      setLoading(false);
    })();
  }, []);

  const groups = useMemo(() => {
    const visible = photos.filter((p) => (division === "All" ? true : p.division === division));
    const map = new Map<string, Photo[]>();
    visible.forEach((p) => {
      const key = groupBy === "night" ? formatNight(p.game_night) : (p.division ?? "Unassigned");
      map.set(key, [...(map.get(key) ?? []), p]);
    });
    return Array.from(map.entries());
  }, [photos, division, groupBy]);

  // Hidden from the public while the admin has the gallery switched off.
  if (!settings.gallery_visible) {
    return (
      <NxPage eyebrow="Gallery" title="Photo Gallery">
        <p style={{ color: "var(--silver-d)", fontSize: 14 }}>
          The gallery is closed for now. It reopens once game-night photos are ready.
        </p>
      </NxPage>
    );
  }

  return (
    <NxPage
      eyebrow="Courtside"
      title="Gallery"
      intro="Photos from every NXGEN game night. Viewing only — nothing here is for sale."
    >
      <div className="tab-row" role="tablist" style={{ flexWrap: "wrap", width: "auto" }}>
        {["All", ...DIVISIONS].map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setDivision(d)}
            className={`tab-btn${division === d ? " on" : ""}`}
          >
            {d}
          </button>
        ))}
      </div>

      <div className="tab-row" role="tablist" style={{ flexWrap: "wrap", width: "auto", marginTop: -18 }}>
        {(["night", "division"] as const).map((g) => (
          <button
            key={g}
            type="button"
            onClick={() => setGroupBy(g)}
            className={`tab-btn${groupBy === g ? " on" : ""}`}
          >
            Group by {g === "night" ? "game night" : "division"}
          </button>
        ))}
      </div>

      {loading ? (
        <p style={{ color: "var(--silver-d)", fontSize: 14 }}>Loading…</p>
      ) : groups.length === 0 ? (
        <div style={{ marginTop: 20 }}>
          <NxLaunchNotice title="Gallery" />
        </div>
      ) : (
        groups.map(([label, items]) => (
          <section key={label} style={{ marginTop: 40 }}>
            <p className="eyebrow" style={{ marginBottom: 16 }}>{label}</p>
            <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(2, 1fr)" }}
                 className="gallery-grid">
              {items.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setLightbox(p)}
                  className="group"
                  style={{ position: "relative", aspectRatio: "1", overflow: "hidden", border: "1px solid var(--line)", borderRadius: 6, background: "var(--s1)", cursor: "pointer", padding: 0 }}
                >
                  <SignedImage
                    bucket="gallery"
                    path={p.image_path}
                    alt={p.title ?? p.caption ?? "NXGEN game night photo"}
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                    fallback={<div className="grid h-full w-full place-items-center"><ImageIcon className="h-5 w-5" style={{ color: "var(--silver-d)" }} /></div>}
                  />
                </button>
              ))}
            </div>
          </section>
        ))
      )}

      {lightbox && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 999, display: "grid", placeItems: "center", background: "rgba(5,5,7,.95)", padding: 24 }}
          role="dialog"
          aria-modal="true"
          onClick={() => setLightbox(null)}
        >
          <button
            type="button"
            aria-label="Close photo"
            onClick={() => setLightbox(null)}
            className="btn btn-ghost btn-sm"
            style={{ position: "absolute", right: 24, top: 24 }}
          >
            <X className="h-4 w-4" />
          </button>
          <figure style={{ maxHeight: "100%", width: "100%", maxWidth: 720 }} onClick={(e) => e.stopPropagation()}>
            <SignedImage
              bucket="gallery"
              path={lightbox.image_path}
              alt={lightbox.title ?? lightbox.caption ?? "NXGEN game night photo"}
              className="max-h-[75vh] w-full object-contain"
            />
            {(lightbox.title || lightbox.caption) && (
              <figcaption style={{ marginTop: 12, fontSize: 13, color: "var(--silver-d)" }}>
                {lightbox.title && <span style={{ fontWeight: 800, textTransform: "uppercase", color: "var(--paint)" }}>{lightbox.title}. </span>}
                {lightbox.caption}
              </figcaption>
            )}
          </figure>
        </div>
      )}
    </NxPage>
  );
}
