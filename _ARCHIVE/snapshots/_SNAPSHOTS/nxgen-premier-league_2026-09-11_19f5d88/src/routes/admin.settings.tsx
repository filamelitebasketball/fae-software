import { createFileRoute } from "@tanstack/react-router";
import { SITE_DEFAULTS, type SiteSettings, type Sponsor, type Faq } from "@/lib/site-settings";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { NxLoadError } from "@/components/nx-load-error";
import { BackButton } from "@/components/back-button";
import { RequireStaff } from "@/components/require-staff";
import { logAdminActivity } from "@/lib/admin-log";
import { toast } from "sonner";
import { Plus, Trash2, ArrowUp, ArrowDown } from "lucide-react";

export const Route = createFileRoute("/admin/settings")({
  head: () => ({
    meta: [
      { title: "Site Settings — Admin — NXGEN" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <RequireStaff adminOnly>
      <SettingsPage />
    </RequireStaff>
  ),
});


/**
 * The panel edits exactly the settings the site reads — same type, same
 * defaults, imported from @/lib/site-settings. Keeping a second copy here is
 * how the panel came to offer a Rising Stars fee of ₱35,000 while every page
 * on the site said ₱30,000.
 */
type Settings = SiteSettings;

const DIVISIONS = [
  { key: "rising-stars", label: "Rising Stars" },
  { key: "legacy", label: "Legacy" },
  { key: "3x3", label: "3x3" },
  { key: "kotc", label: "King of the Court" },
];

const SECTIONS = [
  { key: "divisions", label: "Divisions" },
  { key: "games", label: "Fixtures & Scores" },
  { key: "leaderboard", label: "Leaderboard" },
  { key: "sponsors", label: "Sponsors" },
  { key: "contact", label: "Contact" },
  { key: "livestream", label: "Livestream" },
  { key: "highlights", label: "Highlights" },
];

const DEFAULTS: Settings = SITE_DEFAULTS;


const TABS = [
  "General",
  "Registration",
  "Content",
  "Sponsors",
  "Social & Contact",
  "FAQ",
  "Sections",
] as const;
type Tab = (typeof TABS)[number];

const panel: React.CSSProperties = {
  background: "var(--s1)",
  border: "1px solid var(--line)",
  borderRadius: 14,
  padding: 20,
  display: "flex",
  flexDirection: "column",
  gap: 18,
};

const rowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 16,
  padding: "10px 0",
  borderBottom: "1px solid var(--line)",
};

const Toggle = ({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) => (
  <div style={rowStyle}>
    <div>
      <Label style={{ color: "var(--paint)", fontSize: 13 }}>{label}</Label>
      {hint && <p style={{ fontSize: 11, color: "var(--silver-d)", marginTop: 2 }}>{hint}</p>}
    </div>
    <Switch checked={checked} onCheckedChange={onChange} />
  </div>
);

const Field = ({ label, value, onChange, textarea }: { label: string; value: string; onChange: (v: string) => void; textarea?: boolean }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
    <Label style={{ color: "var(--silver-d)", fontSize: 11, letterSpacing: ".08em", textTransform: "uppercase", fontFamily: "var(--fm)" }}>{label}</Label>
    {textarea ? (
      <Textarea rows={3} value={value} onChange={(e) => onChange(e.target.value)} />
    ) : (
      <Input value={value} onChange={(e) => onChange(e.target.value)} />
    )}
  </div>
);

function SettingsPage() {
  const [values, setValues] = useState<Settings>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [tab, setTab] = useState<Tab>("General");

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from("site_settings").select("key,value");
      // A failed load left the form sitting on DEFAULTS while looking live, and
      // "Save changes" upserts all 27 keys at once — so one failed load
      // followed by one save quietly reset every setting on the site. Refuse to
      // show an editable form we could not populate.
      setLoadError(error?.message ?? null);
      if (error) toast.error(error.message);
      if (data) {
        const next: Settings = { ...DEFAULTS };
        const map = new Map(data.map((r) => [r.key, r.value as unknown]));
        const str = (k: keyof Settings) => {
          const v = map.get(k as string);
          if (v !== undefined && v !== null) (next as any)[k] = String(v);
        };
        const bool = (k: keyof Settings) => {
          const v = map.get(k as string);
          if (v !== undefined && v !== null) (next as any)[k] = Boolean(v);
        };
        const obj = (k: keyof Settings) => {
          const v = map.get(k as string);
          if (v && typeof v === "object") (next as any)[k] = { ...(next as any)[k], ...(v as object) };
        };
        const arr = (k: keyof Settings) => {
          const v = map.get(k as string);
          if (Array.isArray(v)) (next as any)[k] = v;
        };
        (
          ["livestream_url", "site_announcement", "hero_badge_text", "payment_note", "court_data_packages", "hero_headline", "hero_subheadline",
            "about_text", "social_instagram", "social_facebook", "social_youtube",
            "social_tiktok", "contact_email", "contact_phone", "venue_name", "venue_location"] as (keyof Settings)[]
        ).forEach(str);
        (["maintenance_mode", "gallery_visible", "archive_visible", "registration_open"] as (keyof Settings)[]).forEach(bool);
        (["division_open", "division_fees", "sections"] as (keyof Settings)[]).forEach(obj);
        (["sponsors", "faqs"] as (keyof Settings)[]).forEach(arr);
        setValues(next);
      }
      setLoading(false);
    })();
  }, []);

  const persist = async (rows: { key: string; value: unknown }[], label: string) => {
    const { error } = await supabase
      .from("site_settings")
      .upsert(rows as never[], { onConflict: "key" });
    if (error) {
      toast.error(error.message);
      return false;
    }
    void logAdminActivity("import", "updated", { label: `Site settings: ${label}` });
    return true;
  };

  /** Instant-save toggle / JSON field. */
  const saveNow = async (key: keyof Settings, value: unknown) => {
    setValues((v) => ({ ...v, [key]: value }) as Settings);
    const ok = await persist([{ key, value }], String(key));
    if (ok) toast.success("Saved");
  };

  const setField = (key: keyof Settings, value: unknown) => {
    setValues((v) => ({ ...v, [key]: value }) as Settings);
    setDirty(true);
  };

  const saveAll = async () => {
    setSaving(true);
    const rows = (Object.keys(values) as (keyof Settings)[]).map((k) => ({ key: k, value: values[k] }));
    const ok = await persist(rows, tab);
    setSaving(false);
    if (ok) {
      setDirty(false);
      toast.success("Settings saved");
    }
  };

  if (loadError) {
    return (
      <div className="adm-root">
        <div className="adm-wrap" style={{ maxWidth: 1100 }}>
          <div style={{ marginBottom: 20 }}>
            <BackButton fallback="/admin" />
          </div>
          <NxLoadError
            what="the site settings"
            detail={loadError}
            onRetry={() => window.location.reload()}
          />
          <p style={{ fontSize: 12, color: "var(--silver-d)", marginTop: 12, lineHeight: 1.7 }}>
            The form is hidden on purpose. Saving writes every setting at once, so
            editing a form that never loaded would overwrite the live values with
            defaults.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="adm-root">
      <div className="adm-wrap" style={{ maxWidth: 1100 }}>
        <div style={{ marginBottom: 20 }}>
          <BackButton fallback="/admin" />
        </div>
        <div style={{ marginBottom: 24 }}>
          <p className="eyebrow" style={{ fontSize: 9 }}>Admin</p>
          <h1 className="display" style={{ fontSize: "clamp(1.4rem,3.5vw,2rem)", marginTop: 8 }}>Site Control Panel</h1>
          <p style={{ fontSize: 12, color: "var(--silver-d)", marginTop: 4 }}>
            Every site-wide setting in one place. Toggles save instantly; text fields save with the button.
          </p>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
          {TABS.map((t) => (
            <button
              key={t}
              type="button"
              className={`btn btn-sm ${tab === t ? "btn-gold" : "btn-ghost"}`}
              onClick={() => setTab(t)}
            >
              {t}
            </button>
          ))}
        </div>

        {loading ? (
          <p style={{ fontSize: 12, color: "var(--silver-d)" }}>Loading…</p>
        ) : (
          <div style={panel}>
            {tab === "General" && (
              <>
                <Toggle label="Maintenance mode" hint="Show a maintenance notice site-wide." checked={values.maintenance_mode} onChange={(v) => saveNow("maintenance_mode", v)} />
                <Toggle label="Gallery visible" checked={values.gallery_visible} onChange={(v) => saveNow("gallery_visible", v)} />
                <Toggle label="Archive visible" checked={values.archive_visible} onChange={(v) => saveNow("archive_visible", v)} />
                <Field label="Livestream URL" value={values.livestream_url} onChange={(v) => setField("livestream_url", v)} />
                <Field label="Site announcement" value={values.site_announcement} onChange={(v) => setField("site_announcement", v)} textarea />
              </>
            )}

            {tab === "Registration" && (
              <>
                <Toggle label="Registration open" hint="Master switch for all divisions." checked={values.registration_open} onChange={(v) => saveNow("registration_open", v)} />
                {DIVISIONS.map((d) => (
                  <div key={d.key} style={rowStyle}>
                    <div style={{ flex: 1 }}>
                      <Label style={{ color: "var(--paint)", fontSize: 13 }}>{d.label}</Label>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
                        <span style={{ fontSize: 11, color: "var(--silver-d)" }}>Fee ₱</span>
                        <Input
                          type="number"
                          style={{ maxWidth: 130 }}
                          value={String(values.division_fees[d.key] ?? 0)}
                          onChange={(e) => setField("division_fees", { ...values.division_fees, [d.key]: Number(e.target.value) })}
                        />
                      </div>
                    </div>
                    <Switch
                      checked={values.division_open[d.key] ?? true}
                      onCheckedChange={(v) => saveNow("division_open", { ...values.division_open, [d.key]: v })}
                    />
                  </div>
                ))}
              </>
            )}

            {tab === "Content" && (
              <>
                <Field label="Hero Badge Text" value={values.hero_badge_text} onChange={(v) => setField("hero_badge_text", v)} />
                <Field label="Payment Note" value={values.payment_note} onChange={(v) => setField("payment_note", v)} textarea />
                <Field
                  label="Court Data Packages — one per line:  Label | Detail | Price | best"
                  value={values.court_data_packages}
                  onChange={(v) => setField("court_data_packages", v)}
                  textarea
                />
                <Field label="Hero headline" value={values.hero_headline} onChange={(v) => setField("hero_headline", v)} />
                <Field label="Hero sub-headline" value={values.hero_subheadline} onChange={(v) => setField("hero_subheadline", v)} />
                <Field label="About section" value={values.about_text} onChange={(v) => setField("about_text", v)} textarea />
              </>
            )}

            {tab === "Sponsors" && (
              <>
                {values.sponsors.length === 0 && (
                  <p style={{ fontSize: 12, color: "var(--silver-d)" }}>No sponsors yet.</p>
                )}
                {values.sponsors.map((s, i) => (
                  <div key={i} style={{ border: "1px solid var(--line)", borderRadius: 12, padding: 14, background: "var(--s2)", display: "flex", flexDirection: "column", gap: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                      <span style={{ fontSize: 11, fontFamily: "var(--fm)", color: "var(--gold)" }}>Sponsor {i + 1}</span>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <Switch
                          checked={s.active}
                          onCheckedChange={(v) => {
                            const next = values.sponsors.map((x, j) => (j === i ? { ...x, active: v } : x));
                            void saveNow("sponsors", next);
                          }}
                        />
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => saveNow("sponsors", values.sponsors.filter((_, j) => j !== i))}>
                          <Trash2 style={{ width: 14, height: 14 }} />
                        </button>
                      </div>
                    </div>
                    <Input placeholder="Name" value={s.name} onChange={(e) => setField("sponsors", values.sponsors.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
                    <Input placeholder="Logo URL" value={s.logo_url} onChange={(e) => setField("sponsors", values.sponsors.map((x, j) => (j === i ? { ...x, logo_url: e.target.value } : x)))} />
                    <Input placeholder="Website URL" value={s.website_url} onChange={(e) => setField("sponsors", values.sponsors.map((x, j) => (j === i ? { ...x, website_url: e.target.value } : x)))} />
                  </div>
                ))}
                <button type="button" className="btn btn-ghost btn-sm" style={{ alignSelf: "flex-start" }} onClick={() => setField("sponsors", [...values.sponsors, { name: "", logo_url: "", website_url: "", active: true }])}>
                  <Plus style={{ width: 14, height: 14, marginRight: 6 }} /> Add sponsor
                </button>
              </>
            )}

            {tab === "Social & Contact" && (
              <>
                <Field label="Instagram" value={values.social_instagram} onChange={(v) => setField("social_instagram", v)} />
                <Field label="Facebook" value={values.social_facebook} onChange={(v) => setField("social_facebook", v)} />
                <Field label="YouTube" value={values.social_youtube} onChange={(v) => setField("social_youtube", v)} />
                <Field label="TikTok" value={values.social_tiktok} onChange={(v) => setField("social_tiktok", v)} />
                <Field label="Contact email" value={values.contact_email} onChange={(v) => setField("contact_email", v)} />
                <Field label="Contact phone" value={values.contact_phone} onChange={(v) => setField("contact_phone", v)} />
                <Field label="Venue name" value={values.venue_name} onChange={(v) => setField("venue_name", v)} />
                <Field label="Venue location" value={values.venue_location} onChange={(v) => setField("venue_location", v)} />
              </>
            )}

            {tab === "FAQ" && (
              <>
                {values.faqs.length === 0 && <p style={{ fontSize: 12, color: "var(--silver-d)" }}>No FAQs yet.</p>}
                {values.faqs.map((f, i) => {
                  const move = (dir: -1 | 1) => {
                    const next = [...values.faqs];
                    const t = i + dir;
                    if (t < 0 || t >= next.length) return;
                    [next[i], next[t]] = [next[t], next[i]];
                    void saveNow("faqs", next);
                  };
                  return (
                    <div key={i} style={{ border: "1px solid var(--line)", borderRadius: 12, padding: 14, background: "var(--s2)", display: "flex", flexDirection: "column", gap: 10 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                        <span style={{ fontSize: 11, fontFamily: "var(--fm)", color: "var(--gold)" }}>FAQ {i + 1}</span>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button type="button" className="btn btn-ghost btn-sm" onClick={() => move(-1)}><ArrowUp style={{ width: 14, height: 14 }} /></button>
                          <button type="button" className="btn btn-ghost btn-sm" onClick={() => move(1)}><ArrowDown style={{ width: 14, height: 14 }} /></button>
                          <button type="button" className="btn btn-ghost btn-sm" onClick={() => saveNow("faqs", values.faqs.filter((_, j) => j !== i))}><Trash2 style={{ width: 14, height: 14 }} /></button>
                        </div>
                      </div>
                      <Input placeholder="Question" value={f.question} onChange={(e) => setField("faqs", values.faqs.map((x, j) => (j === i ? { ...x, question: e.target.value } : x)))} />
                      <Textarea rows={3} placeholder="Answer" value={f.answer} onChange={(e) => setField("faqs", values.faqs.map((x, j) => (j === i ? { ...x, answer: e.target.value } : x)))} />
                    </div>
                  );
                })}
                <button type="button" className="btn btn-ghost btn-sm" style={{ alignSelf: "flex-start" }} onClick={() => setField("faqs", [...values.faqs, { question: "", answer: "" }])}>
                  <Plus style={{ width: 14, height: 14, marginRight: 6 }} /> Add FAQ
                </button>
              </>
            )}

            {tab === "Sections" && (
              <>
                {SECTIONS.map((s) => (
                  <Toggle
                    key={s.key}
                    label={s.label}
                    hint="Show this section on the homepage."
                    checked={values.sections[s.key] ?? true}
                    onChange={(v) => saveNow("sections", { ...values.sections, [s.key]: v })}
                  />
                ))}
              </>
            )}

            <div style={{ display: "flex", alignItems: "center", gap: 12, paddingTop: 6 }}>
              <button type="button" className="btn btn-gold btn-sm" disabled={!dirty || saving} onClick={saveAll} style={{ opacity: !dirty || saving ? 0.5 : 1 }}>
                {saving ? "Saving…" : "Save changes"}
              </button>
              {dirty && <span style={{ fontSize: 11, color: "var(--silver-d)" }}>Unsaved changes</span>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
