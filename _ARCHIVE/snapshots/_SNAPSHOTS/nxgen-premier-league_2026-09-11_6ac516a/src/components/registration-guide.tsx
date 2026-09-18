import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Pencil, Send, Check, AlertCircle, RotateCcw } from "lucide-react";

export type GuideCaptured = {
  registration_type: string | null;
  division: string | null;
  team_name: string | null;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  date_of_birth: string | null;
  position: string | null;
  jersey_number: string | null;
  age_tier: string | null;
  roster_size: number | null;
  roster: Array<{ full_name: string; jersey_number?: string; date_of_birth?: string }>;
  preferred_game_day: string | null;
  heard_about: string | null;
  fee_php: number | null;
  complete: boolean;
};

const EMPTY: GuideCaptured = {
  registration_type: null, division: null, team_name: null, full_name: null,
  email: null, phone: null, date_of_birth: null, position: null, jersey_number: null,
  age_tier: null, roster_size: null, roster: [], preferred_game_day: null,
  heard_about: null, fee_php: null, complete: false,
};

const FEES: Record<string, number> = {
  "Rising Stars": 30000,
  Legacy: 35000,
  "3x3": 8000,
  "King of the Court": 2000,
};

const OPENER =
  "Welcome to NXGEN. I'll get you signed up in about two minutes. First — are you registering a team, joining an existing team as a player, or entering King of the Court solo?";

const MAX_TURNS = 40;
const STORE_KEY = "nxgen-setup-guide-v1";

type Msg = { role: "user" | "assistant"; content: string };

const peso = (n: number) => new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 }).format(n);

function splitState(raw: string) {
  const i = raw.indexOf("<state>");
  if (i === -1) return { text: raw, state: null as Partial<GuideCaptured> | null };
  const text = raw.slice(0, i).trim();
  const m = raw.match(/<state>([\s\S]*?)(<\/state>|$)/);
  let state: Partial<GuideCaptured> | null = null;
  if (m) {
    try { state = JSON.parse(m[1].trim()); } catch { state = null; }
  }
  return { text, state };
}

export function RegistrationGuide({ onFallback }: { onFallback: (prefill: GuideCaptured) => void }) {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Msg[]>([{ role: "assistant", content: OPENER }]);
  const [captured, setCaptured] = useState<GuideCaptured>(EMPTY);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [streaming, setStreaming] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  // restore
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.messages) && parsed.messages.length) setMessages(parsed.messages);
      if (parsed.captured) setCaptured({ ...EMPTY, ...parsed.captured });
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    try { localStorage.setItem(STORE_KEY, JSON.stringify({ messages, captured })); } catch { /* ignore */ }
  }, [messages, captured]);

  useEffect(() => {
    endRef.current?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      block: "end",
    });
  }, [messages, streaming]);

  const send = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    if (messages.length >= MAX_TURNS) {
      setError("This session has reached its message limit. You can finish on the standard form.");
      return;
    }
    setError(null);
    const next: Msg[] = [...messages, { role: "user", content: trimmed }];
    setMessages(next);
    setInput("");
    setBusy(true);
    setStreaming("");

    try {
      const res = await fetch("/api/registration-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      if (res.status === 429) throw new Error("busy");
      if (res.status === 402) throw new Error("credits");
      if (!res.ok || !res.body) throw new Error("down");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let full = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data:")) continue;
          const data = line.slice(5).trim();
          if (!data || data === "[DONE]") continue;
          try {
            const json = JSON.parse(data);
            const delta = json.choices?.[0]?.delta?.content;
            if (delta) {
              full += delta;
              setStreaming(splitState(full).text);
            }
          } catch { /* partial chunk */ }
        }
      }

      const { text: visible, state } = splitState(full);
      setStreaming("");
      setMessages([...next, { role: "assistant", content: visible || "…" }]);
      if (state) {
        setCaptured((prev) => {
          const merged = { ...prev, ...state } as GuideCaptured;
          if (!Array.isArray(merged.roster)) merged.roster = [];
          if (merged.division && !merged.fee_php) merged.fee_php = FEES[merged.division] ?? null;
          return merged;
        });
      }
    } catch (e) {
      const kind = e instanceof Error ? e.message : "down";
      setStreaming("");
      setError(
        kind === "busy"
          ? "The guide is getting a lot of traffic right now. Try again in a moment, or switch to the Manual Form."
          : kind === "credits"
            ? "The guide is temporarily unavailable. You can finish on the Manual Form — nothing you've entered is lost."
            : "The guide is unavailable right now — here's the standard form.",
      );
      if (kind === "down") onFallback(captured);
    } finally {
      setBusy(false);
    }
  }, [busy, messages, captured, onFallback]);

  const fee = captured.fee_php ?? (captured.division ? FEES[captured.division] ?? null : null);

  const reset = () => {
    localStorage.removeItem(STORE_KEY);
    setMessages([{ role: "assistant", content: OPENER }]);
    setCaptured(EMPTY);
    setError(null);
  };

  const requiredMissing = (() => {
    const miss: string[] = [];
    if (!captured.division) miss.push("division");
    if (!captured.full_name) miss.push("full name");
    if (!captured.email) miss.push("email");
    if (!captured.phone) miss.push("mobile number");
    if (captured.registration_type === "team" && !captured.team_name) miss.push("team name");
    return miss;
  })();

  const submit = async () => {
    if (requiredMissing.length) { toast.error(`Still missing: ${requiredMissing.join(", ")}`); return; }
    setSubmitting(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSubmitting(false); navigate({ to: "/auth" }); return; }

    const isCoach = captured.registration_type === "team";
    const division = captured.division!;
    const notes = [
      isCoach ? null : "Unassigned — Pending Team Placement",
      captured.preferred_game_day ? `Preferred game day: ${captured.preferred_game_day}` : null,
      captured.heard_about ? `Heard about NXGEN: ${captured.heard_about}` : null,
      captured.age_tier ? `Age tier: ${captured.age_tier}` : null,
      "Submitted via NXGEN Setup Guide",
    ].filter(Boolean).join(" · ");

    const row = {
      user_id: user.id,
      division,
      full_name: captured.full_name!,
      email: captured.email!,
      phone: captured.phone!,
      date_of_birth: captured.date_of_birth || null,
      position: captured.position || null,
      jersey_size: null as string | null,
      jersey_number: captured.jersey_number ? parseInt(captured.jersey_number) : null,
      team_name: isCoach ? captured.team_name : null,
      notes,
      applicant_type: isCoach ? "coach" : "player",
    };

    const { data: inserted, error: insErr } = await supabase.from("registrations").insert([row]).select("id, division");
    if (insErr) { setSubmitting(false); toast.error(insErr.message); return; }

    if (isCoach && inserted?.length && captured.roster.length) {
      const memberRows = inserted.flatMap((reg) =>
        captured.roster.filter((m) => m.full_name?.trim()).map((m) => ({
          registration_id: reg.id,
          coach_user_id: user.id,
          team_name: captured.team_name!,
          division: reg.division,
          full_name: m.full_name.trim(),
          jersey_number: m.jersey_number?.trim() || null,
        })),
      );
      if (memberRows.length) {
        const { error: rErr } = await supabase.from("registration_roster_members").insert(memberRows);
        if (rErr) toast.error(`Team saved, but roster failed: ${rErr.message}`);
      }
    }

    await supabase.from("profiles").update({
      full_name: captured.full_name,
      phone: captured.phone,
      division,
      position: captured.position || null,
      jersey_number: captured.jersey_number || null,
      date_of_birth: captured.date_of_birth || null,
    }).eq("id", user.id);

    localStorage.removeItem(STORE_KEY);
    setSubmitting(false);
    toast.success(
      `Registration submitted — ${division}${fee ? ` · ${peso(fee)} due 10 days before Opening Night` : ""}.`,
    );
    navigate({ to: "/profile" });
  };

  const field = (key: keyof GuideCaptured, label: string, value: string | null) => (
    <div className="flex items-start justify-between gap-3 border-b border-border py-2 last:border-0">
      <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">{label}</span>
      {editing === key ? (
        <Input
          autoFocus
          aria-label={`Edit ${label}`}
          defaultValue={value ?? ""}
          className="h-7 max-w-[55%] text-xs"
          onBlur={(e) => { setCaptured((p) => ({ ...p, [key]: e.target.value || null })); setEditing(null); }}
          onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); if (e.key === "Escape") setEditing(null); }}
        />
      ) : (
        <button
          type="button"
          onClick={() => setEditing(key as string)}
          className="reveal-up is-revealed group flex items-center gap-1.5 text-right text-xs font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={`${label}: ${value ?? "not set"} — edit`}
        >
          <span className={value ? "" : "text-muted-foreground font-normal"}>{value ?? "—"}</span>
          <Pencil className="h-3 w-3 opacity-40 group-hover:opacity-100" />
        </button>
      )}
    </div>
  );

  const summary = (
    <div className="tilt-card border border-border bg-card p-5">
      <p className="section-label mb-3">Your Registration</p>
      {field("division", "Division", captured.division)}
      {field("registration_type", "Entry", captured.registration_type)}
      {field("team_name", "Team", captured.team_name)}
      {field("full_name", "Name", captured.full_name)}
      {field("email", "Email", captured.email)}
      {field("phone", "Mobile", captured.phone)}
      {field("date_of_birth", "Birthdate", captured.date_of_birth)}
      {field("age_tier", "Age tier", captured.age_tier)}
      {field("position", "Position", captured.position)}
      {field("jersey_number", "Jersey #", captured.jersey_number)}
      {field("preferred_game_day", "Game day", captured.preferred_game_day)}
      <div className="flex items-center justify-between gap-3 border-t border-border pt-3 mt-2">
        <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Roster</span>
        <span className="text-xs font-semibold">{captured.roster_size ?? captured.roster.length ?? 0}</span>
      </div>
      <div className="mt-2 flex items-center justify-between gap-3">
        <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Total fee</span>
        <span className="text-sm font-black text-primary">{fee ? peso(fee) : "—"}</span>
      </div>
      {fee ? <p className="mt-2 text-[10px] text-muted-foreground">Due 10 days before Opening Night.</p> : null}
    </div>
  );

  return (
    <div className="grid gap-6 md:grid-cols-[1fr_300px]">
      <div className="min-w-0">
        <p className="section-label mb-3">Guided Registration</p>
        <div
          className="border border-border bg-card p-4 md:p-5"
          style={{ backdropFilter: "blur(10px)" }}
        >
          <div
            className="max-h-[52vh] space-y-3 overflow-y-auto pr-1"
            role="log"
            aria-live="polite"
            aria-label="Setup guide conversation"
          >
            {messages.map((m, i) => (
              <div
                key={i}
                className={`reveal-up is-revealed max-w-[85%] rounded-md border px-3.5 py-2.5 text-sm leading-relaxed ${
                  m.role === "user"
                    ? "ml-auto border-[var(--gold-border)] text-[var(--gold-light)]"
                    : "border-border text-muted-foreground"
                }`}
                style={m.role === "user" ? { background: "rgba(201,162,39,0.12)" } : { background: "var(--card-bg)" }}
              >
                {m.content}
              </div>
            ))}
            {streaming ? (
              <div className="reveal-up is-revealed max-w-[85%] rounded-md border border-border px-3.5 py-2.5 text-sm leading-relaxed text-muted-foreground" style={{ background: "var(--card-bg)" }}>
                {streaming}
              </div>
            ) : busy ? (
              <div className="flex items-center gap-1.5 px-1 py-2" aria-label="Guide is typing">
                {[0, 1, 2].map((d) => (
                  <span key={d} className="guide-dot" style={{ animationDelay: `${d * 160}ms` }} />
                ))}
              </div>
            ) : null}
            <div ref={endRef} />
          </div>

          {error ? (
            <div className="mt-3 flex items-start gap-2 border border-border bg-background p-3 text-xs text-muted-foreground">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>
                {error}{" "}
                <button type="button" onClick={() => onFallback(captured)} className="underline text-foreground">
                  Switch to Manual Form
                </button>
              </span>
            </div>
          ) : null}

          <form
            onSubmit={(e) => { e.preventDefault(); void send(input); }}
            className="mt-4 flex items-center gap-2"
          >
            <label htmlFor="guide-input" className="sr-only">Your answer</label>
            <Input
              id="guide-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your answer…"
              autoComplete="off"
              disabled={busy}
            />
            <Button type="submit" size="icon" disabled={busy || !input.trim()} aria-label="Send answer">
              <Send className="h-4 w-4" />
            </Button>
            <button
              type="button"
              onClick={reset}
              aria-label="Restart the guide"
              className="border border-border p-2 text-muted-foreground transition hover:text-foreground"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          </form>
        </div>

        {(captured.complete || requiredMissing.length === 0) && captured.division ? (
          <div className="reveal-up is-revealed mt-6 border border-border bg-card p-5">
            <p className="section-label mb-2">Review &amp; Submit</p>
            <p className="text-sm text-muted-foreground">
              {captured.full_name} · {captured.division}
              {captured.team_name ? ` · ${captured.team_name}` : ""} — total due{" "}
              <strong className="text-foreground">{fee ? peso(fee) : "—"}</strong>, payable 10 days before Opening Night.
            </p>
            <Button onClick={submit} disabled={submitting} size="lg" className="mt-4 w-full rounded-full">
              {submitting ? "Submitting…" : <>Submit Registration <Check className="ml-2 h-4 w-4" /></>}
            </Button>
            <p className="mt-2 text-center text-[10px] text-muted-foreground">Nothing is saved until you press submit.</p>
          </div>
        ) : null}
      </div>

      <aside className="md:sticky md:top-24 md:self-start">
        <div className="md:hidden">
          <button
            type="button"
            onClick={() => setSummaryOpen((v) => !v)}
            aria-expanded={summaryOpen}
            className="w-full border border-border bg-card px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground"
          >
            Your Registration {fee ? `· ${peso(fee)}` : ""} {summaryOpen ? "▲" : "▼"}
          </button>
          {summaryOpen ? <div className="mt-3">{summary}</div> : null}
        </div>
        <div className="hidden md:block">{summary}</div>
      </aside>
    </div>
  );
}
