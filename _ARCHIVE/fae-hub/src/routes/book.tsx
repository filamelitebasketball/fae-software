import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/fae/AuthProvider";
import { Badge } from "@/components/fae/Badge";
import { Button } from "@/components/fae/Button";
import { Footer } from "@/components/fae/Footer";
import { Icon } from "@/components/fae/Icon";
import { Modal } from "@/components/fae/Modal";
import { useToast } from "@/components/fae/Toast";
import { formatHour, formatPeso, HOURS, isMember as tierIsMember, PEAK, SPORTS, type SportKey } from "@/lib/constants";
import { groupContiguous, hasPeakHour, priceHours } from "@/lib/booking-utils";
import { createBooking, ensureMemberProfile, getAvailability, getMyProfile } from "@/lib/fae.functions";
import type { BookingResult } from "@/lib/fae.types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/book")({
  validateSearch: (search: Record<string, unknown>) => {
    const s = search["sport"];
    return typeof s === "string" && s in SPORTS ? { sport: s as SportKey } : {};
  },
  head: () => ({
    meta: [
      { title: "Book a court — F.A.E. Court Lipa City" },
      {
        name: "description",
        content:
          "Reserve basketball, volleyball or pickleball at F.A.E. Court, Lipa City. Slots run on the hour, pay at the counter, free cancellation up to 6 hours before.",
      },
      { property: "og:title", content: "Book a court — F.A.E. Court Lipa City" },
      {
        property: "og:description",
        content: "Reserve basketball, volleyball or pickleball by the hour at F.A.E. Court, Lipa City.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BookPage,
});

function toIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const WEEKDAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const DRAFT_KEY = "fae.bookingDraft";

interface Draft {
  sport: SportKey;
  courtId: string;
  date: string;
  hours: number[];
}

function BookPage() {
  const { sport: sportParam } = Route.useSearch();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [sport, setSport] = useState<SportKey>(sportParam ?? "basketball");
  const [courtId, setCourtId] = useState<string>(SPORTS[sportParam ?? "basketball"].courts[0]!.id);
  const [date, setDate] = useState<string>(() => toIso(new Date()));
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [confirmation, setConfirmation] = useState<BookingResult[] | null>(null);

  // Restore an in-progress draft (e.g. after the auth detour).
  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const draft = JSON.parse(raw) as Draft;
      if (draft.sport in SPORTS) {
        setSport(draft.sport);
        const court = SPORTS[draft.sport].courts.find((c) => c.id === draft.courtId);
        setCourtId(court?.id ?? SPORTS[draft.sport].courts[0]!.id);
        setDate(draft.date);
        setSelected(new Set(draft.hours));
      }
    } catch {
      /* ignore malformed draft */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist the draft so an auth redirect doesn't lose it.
  useEffect(() => {
    try {
      window.sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ sport, courtId, date, hours: [...selected] }));
    } catch {
      /* storage full — non-fatal */
    }
  }, [sport, courtId, date, selected]);

  const { data: availability, refetch } = useQuery({
    queryKey: ["availability", courtId, date],
    queryFn: () => getAvailability({ data: { courtId, date } }),
  });
  const taken = useMemo(() => new Set(availability?.taken ?? []), [availability]);

  const days = useMemo(() => {
    const out: { iso: string; day: number; weekday: string; isToday: boolean }[] = [];
    const now = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
      out.push({ iso: toIso(d), day: d.getDate(), weekday: WEEKDAYS[d.getDay()] ?? "", isToday: i === 0 });
    }
    return out;
  }, []);

  const nowHour = new Date().getHours();
  const isToday = date === toIso(new Date());

  const pickSport = (key: SportKey) => {
    setSport(key);
    setCourtId(SPORTS[key].courts[0]!.id);
    setSelected(new Set());
  };

  const toggleHour = (hour: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(hour)) next.delete(hour);
      else next.add(hour);
      return next;
    });
  };

  const { data: profile } = useQuery({
    queryKey: ["my-profile"],
    queryFn: () => getMyProfile({ data: undefined }),
    enabled: !!user,
  });

  const selectedHours = useMemo(() => [...selected].sort((a, b) => a - b), [selected]);
  const isMember = tierIsMember(profile?.member?.tier);
  const subtotal = selectedHours.length ? priceHours(sport, courtId, selectedHours, isMember) : 0;
  const total = subtotal;
  const peak = hasPeakHour(selectedHours);
  const court = SPORTS[sport].courts.find((c) => c.id === courtId) ?? SPORTS[sport].courts[0]!;


  const reserve = async () => {
    if (!selectedHours.length) return;
    if (!user) {
      toast("Sign in to lock in your slot — your picks are saved.");
      navigate({ to: "/auth", search: { returnTo: "/book" } });
      return;
    }
    setSubmitting(true);
    try {
      await ensureMemberProfile({ data: {} });
      const result = await createBooking({ data: { sport, courtId, date, hours: selectedHours } });
      setConfirmation(result.bookings);
      setSelected(new Set());
      window.sessionStorage.removeItem(DRAFT_KEY);
      queryClient.invalidateQueries({ queryKey: ["availability"] });
      queryClient.invalidateQueries({ queryKey: ["my-bookings"] });
      refetch();
    } catch (error) {
      toast(error instanceof Error ? error.message : "Booking failed — try again.");
      refetch();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-background pb-40 pt-28">
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <h1 className="font-display text-4xl font-black uppercase tracking-tight text-foreground sm:text-5xl">
          Book a court
        </h1>
        <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
          F.A.E. Court · Lipa City · slots run on the hour
        </p>

        {/* Step 1 — Sport */}
        <Step index={1} title="Sport">
          <div className="flex flex-wrap gap-2.5">
            {(Object.keys(SPORTS) as SportKey[]).map((key) => {
              const s = SPORTS[key];
              const active = key === sport;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => pickSport(key)}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg border px-4 py-2.5 text-sm font-semibold transition-all",
                    active
                      ? "border-transparent text-primary-foreground"
                      : "border-border bg-surface-2 text-muted-foreground hover:border-goldline hover:text-foreground",
                  )}
                  style={active ? { backgroundColor: s.acc } : undefined}
                >
                  <Icon name={s.icon} size={17} />
                  {s.label}
                </button>

              );
            })}
          </div>
        </Step>

        {/* Step 2 — Surface */}
        <Step index={2} title="Surface">
          <div className="flex flex-wrap gap-2.5">
            {SPORTS[sport].courts.map((c) => {
              const active = c.id === courtId;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setCourtId(c.id);
                    setSelected(new Set());
                  }}
                  className={cn(
                    "rounded-lg border px-4 py-2.5 text-sm font-semibold transition-all",
                    active
                      ? "border-goldline bg-gold/10 text-foreground"
                      : "border-border bg-surface-2 text-muted-foreground hover:border-goldline hover:text-foreground",
                  )}
                >
                  {c.name} <span className="ml-1 font-mono text-xs text-gold">· {formatPeso(isMember ? c.memberRate : c.nonMemberRate)}/hr</span>
                </button>

              );
            })}
          </div>
        </Step>

        {/* Step 3 — Date */}
        <Step index={3} title="Date">
          <div className="scrollbar-hide -mx-1 flex gap-2.5 overflow-x-auto px-1 pb-1">
            {days.map((d) => {
              const active = d.iso === date;
              return (
                <button
                  key={d.iso}
                  type="button"
                  onClick={() => {
                    setDate(d.iso);
                    setSelected(new Set());
                  }}
                  className={cn(
                    "flex w-[68px] shrink-0 flex-col items-center rounded-lg border px-3 py-3 transition-all",
                    active
                      ? "border-goldline bg-gold/10"
                      : "border-border bg-surface-2 hover:border-goldline",
                  )}
                >
                  <span className={cn("font-display text-xl font-extrabold", active ? "text-gold" : "text-foreground")}>
                    {d.day}
                  </span>
                  <span className="mt-1 font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
                    {d.isToday ? "Today" : d.weekday}
                  </span>
                </button>
              );
            })}
          </div>
        </Step>

        {/* Step 4 — Time */}
        <Step index={4} title="Time">
          <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-6">
            {HOURS.map((hour) => {
              const isTaken = taken.has(hour);
              const isPast = isToday && hour <= nowHour;
              const disabled = isTaken || isPast;
              const active = selected.has(hour);
              return (
                <button
                  key={hour}
                  type="button"
                  disabled={disabled}
                  onClick={() => toggleHour(hour)}
                  className={cn(
                    "rounded-lg border px-2 py-3 text-center font-mono text-xs transition-all",
                    disabled
                      ? "cursor-not-allowed border-border bg-surface-1 text-muted-foreground/40 line-through"
                      : active
                        ? "border-transparent font-semibold text-primary-foreground"
                        : "border-border bg-surface-2 text-foreground hover:border-goldline",
                  )}
                  style={active && !disabled ? { backgroundColor: SPORTS[sport].acc } : undefined}
                >
                  {formatHour(hour)}
                  {hour >= PEAK.start && PEAK.enabled && !disabled ? <span className="block text-[8px] opacity-70">PEAK</span> : null}
                  {isTaken ? <span className="block text-[8px] no-underline">TAKEN</span> : null}
                </button>

              );
            })}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm border border-border bg-surface-2" /> Free
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: SPORTS[sport].acc }} /> Selected
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-surface-1" /> Taken
            </span>
            {PEAK.enabled ? <span className="text-gold">Peak after 6PM +{PEAK.uplift * 100}%</span> : null}
          </div>

        </Step>
      </div>

      {/* Sticky summary */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-goldline bg-surface-1/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-4 sm:px-6">
          <div className="min-w-0 flex-1">
            {selectedHours.length ? (
              <>
                <p className="truncate text-sm font-semibold text-foreground">
                  {SPORTS[sport].label} · {court.name} ·{" "}
                  {new Date(`${date}T00:00:00`).toLocaleDateString("en-PH", { month: "short", day: "numeric" })}
                </p>
                <p className="mt-0.5 truncate font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  {selectedHours.map(formatHour).join(", ")}
                  {peak ? " · incl. peak +" + PEAK.uplift * 100 + "%" : ""}
                </p>

              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                {SPORTS[sport].label} · {court.name} — pick at least one hour below
              </p>
            )}
          </div>
          <div className="text-right">
            <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">Total</p>
            <p className="font-display text-xl font-extrabold text-gold">{formatPeso(total)}</p>
          </div>
          <Button variant="gold" onClick={reserve} disabled={!selectedHours.length || submitting || authLoading}>
            {submitting
              ? "Reserving…"
              : selectedHours.length
                ? `Reserve ${selectedHours.length} hour${selectedHours.length > 1 ? "s" : ""}`
                : "Pick a time"}
          </Button>
        </div>
      </div>

      {/* Confirmation */}
      <Modal
        open={!!confirmation}
        onClose={() => setConfirmation(null)}
        title="Court reserved"
        subtitle="Show your reference at the counter when you arrive."
      >
        {confirmation ? (
          <div>
            {confirmation.map((b) => (
              <div key={b.ref} className="mb-3 rounded-lg border border-border bg-surface-3 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-foreground">
                    {court.name} · {new Date(`${b.date}T00:00:00`).toLocaleDateString("en-PH", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                  <Badge variant="gold">{b.ref}</Badge>
                </div>
                <p className="mt-1.5 font-mono text-[11px] text-muted-foreground">
                  {formatHour(b.startHour)} – {formatHour(b.startHour + b.hours)} · {formatPeso(b.amount)}
                </p>
              </div>
            ))}
            <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
              Pay at counter. Free cancellation up to 6 hours before your slot.
            </p>
            <div className="mt-5 flex gap-3">
              <Button variant="gold" className="flex-1" onClick={() => navigate({ to: "/account" })}>
                View my bookings
              </Button>
              <Button variant="ghost" onClick={() => setConfirmation(null)}>
                Done
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>

      <div className="mt-24">
        <Footer />
      </div>
    </main>
  );
}

function Step({ index, title, children }: { index: number; title: string; children: React.ReactNode }) {
  return (
    <section className="mt-12">
      <div className="mb-4 flex items-center gap-3">
        <span className="flex h-7 w-7 items-center justify-center rounded-md border border-goldline bg-gold/10 font-mono text-[11px] font-medium text-gold">
          {index}
        </span>
        <h2 className="font-display text-lg font-extrabold uppercase tracking-wide text-foreground">{title}</h2>
      </div>
      {children}
    </section>
  );
}
