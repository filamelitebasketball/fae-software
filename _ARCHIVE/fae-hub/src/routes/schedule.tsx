import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { SPORTS, SPORT_KEYS, HOURS, FAE_CONTACT, formatHour, type SportKey } from "@/lib/constants";
import { getAvailability } from "@/lib/fae.functions";
import { Icon } from "@/components/fae/Icon";
import { Footer } from "@/components/fae/Footer";

export const Route = createFileRoute("/schedule")({
  component: SchedulePage,
});

function toDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function SchedulePage() {
  const today = useMemo(() => new Date(), []);
  const [dayOffset, setDayOffset] = useState(0);
  const [sport, setSport] = useState<SportKey>("basketball");

  const selectedDate = useMemo(() => {
    const d = new Date(today);
    d.setDate(d.getDate() + dayOffset);
    return d;
  }, [today, dayOffset]);

  const dateStr = toDateStr(selectedDate);
  const courts = SPORTS[sport].courts;

  const days = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [today]);

  return (
    <main className="min-h-screen bg-background pt-20">
      <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <h1 className="font-display text-3xl font-black tracking-tight text-foreground sm:text-4xl">
          Court schedule
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Live availability for all courts. Pick a sport and day to see open slots.
        </p>

        {/* Sport tabs */}
        <div className="mt-8 flex gap-2">
          {SPORT_KEYS.map((k) => (
            <button
              key={k}
              onClick={() => setSport(k)}
              className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-semibold transition-all ${
                sport === k
                  ? "border-goldline bg-surface-2 text-foreground"
                  : "border-border bg-surface-1 text-muted-foreground hover:border-goldline hover:text-foreground"
              }`}
            >
              <Icon name={SPORTS[k].icon} size={16} strokeWidth={1.8} />
              {SPORTS[k].label}
            </button>
          ))}
        </div>

        {/* Day selector */}
        <div className="mt-6 flex gap-1.5 overflow-x-auto pb-1">
          {days.map((d, i) => {
            const label = d.toLocaleDateString("en-PH", { weekday: "short" });
            const num = d.getDate();
            return (
              <button
                key={i}
                onClick={() => setDayOffset(i)}
                className={`flex min-w-[52px] flex-col items-center gap-0.5 rounded-lg border px-3 py-2 text-xs transition-all ${
                  dayOffset === i
                    ? "border-goldline bg-surface-2 text-foreground"
                    : "border-border text-muted-foreground hover:border-goldline"
                }`}
              >
                <span className="font-mono uppercase">{label}</span>
                <span className="text-base font-bold">{num}</span>
              </button>
            );
          })}
        </div>

        {/* Court grids */}
        <div className="mt-8 space-y-8">
          {courts.map((court) => (
            <CourtGrid key={court.id} courtId={court.id} courtName={court.name} date={dateStr} sportAcc={SPORTS[sport].acc} />
          ))}
        </div>

        <div className="mt-10 rounded-xl border border-border bg-surface-1 p-6">
          <div className="flex items-start gap-3">
            <Icon name="help-circle" size={20} className="mt-0.5 shrink-0 text-gold" />
            <div>
              <h3 className="text-sm font-semibold text-foreground">Want to book?</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Create a free account and head to the{" "}
                <a href="/book" className="text-gold underline underline-offset-2 hover:text-foreground">
                  booking page
                </a>{" "}
                to reserve your slot. Questions? Call us at{" "}
                <a
                  href={`tel:${FAE_CONTACT.phone.replace(/\s/g, "")}`}
                  className="text-gold underline underline-offset-2 hover:text-foreground"
                >
                  {FAE_CONTACT.phone}
                </a>
                .
              </p>
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}

function CourtGrid({
  courtId,
  courtName,
  date,
  sportAcc,
}: {
  courtId: string;
  courtName: string;
  date: string;
  sportAcc: string;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ["schedule", courtId, date],
    queryFn: () => getAvailability({ data: { courtId, date } }),
    staleTime: 60_000,
  });

  const taken = data?.taken ?? [];

  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold text-foreground">{courtName}</h3>
      <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-9 lg:grid-cols-12">
        {HOURS.map((h) => {
          const booked = taken.includes(h);
          return (
            <div
              key={h}
              className={`flex flex-col items-center justify-center rounded-md border py-2 text-xs transition-all ${
                isLoading
                  ? "animate-pulse border-border bg-surface-1"
                  : booked
                    ? "border-border bg-surface-2 text-muted-foreground line-through opacity-50"
                    : "border-border bg-surface-1 text-foreground"
              }`}
              style={!isLoading && !booked ? { borderColor: sportAcc + "44" } : undefined}
            >
              <span className="font-mono font-medium">{formatHour(h)}</span>
              {!isLoading && (
                <span className={`mt-0.5 text-[9px] uppercase tracking-wider ${booked ? "text-muted-foreground" : "text-gold"}`}>
                  {booked ? "Taken" : "Open"}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
