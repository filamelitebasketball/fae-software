import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Badge } from "@/components/fae/Badge";
import { Button } from "@/components/fae/Button";
import { Icon } from "@/components/fae/Icon";
import { Modal } from "@/components/fae/Modal";
import { useToast } from "@/components/fae/Toast";
import { HOURS, SPORTS, SPORT_KEYS, formatHour, formatPeso, type SportKey } from "@/lib/constants";
import {
  deleteBooking,
  getBookingHistory,
  createEventBooking,
  getSchedule,
  importSheetWeek,
  saveBooking,
  type SheetBooking,
} from "@/lib/fae.functions";
import { cn } from "@/lib/utils";
import type { BookingRow } from "@/lib/fae.types";

/* ---------- date helpers (Asia/Manila) ---------- */

const DAY_MS = 86_400_000;
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** Today in Manila as YYYY-MM-DD. */
function manilaToday(): string {
  return new Date(Date.now() + 8 * 3600_000).toISOString().slice(0, 10);
}

/** Sunday of the week containing `iso`, as YYYY-MM-DD (matches the F.A.E. sheet, which starts Sunday). */
function weekStart(iso: string): string {
  const ms = Date.parse(`${iso}T00:00:00Z`);
  const dow = new Date(ms).getUTCDay();
  return new Date(ms - dow * DAY_MS).toISOString().slice(0, 10);
}

function addDays(iso: string, n: number): string {
  return new Date(Date.parse(`${iso}T00:00:00Z`) + n * DAY_MS).toISOString().slice(0, 10);
}

function shortDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

/** All courts across every sport, flattened for the court picker. */
const ALL_COURTS = SPORT_KEYS.flatMap((key) =>
  SPORTS[key].courts.map((c) => ({ sport: key, id: c.id, name: c.name, rate: c.nonMemberRate })),
);

const STATUS_OPTIONS = ["Confirmed", "Pending", "Paid - Cash", "Paid - GCash", "Paid - Other", "Unpaid", "Cancelled"];

function statusVariant(status: string | null): "gold" | "green" | "red" | "grey" {
  if (!status) return "grey";
  if (status.startsWith("Paid")) return "green";
  if (status === "Cancelled") return "red";
  if (status === "Pending" || status === "Unpaid") return "gold";
  return "grey";
}

/** Coach Jr's live booking sheet — prefilled so the counter never has to hunt for the link. */
const DEFAULT_SHEET_URL = "https://docs.google.com/spreadsheets/d/1aBfsyhUq6sjvdCVtgUDlbhu8UtsYZgTR/edit#gid=0";

/** Pull the file id and tab gid out of any Google Sheets URL. */
function parseSheetUrl(url: string): { sheetId: string; gid: string } | null {
  const id = /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/.exec(url)?.[1];
  if (!id) return null;
  const gid = /[#&?]gid=([0-9]+)/.exec(url)?.[1] ?? "0";
  return { sheetId: id, gid };
}

type Draft = {
  id?: string;
  sport: SportKey;
  courtId: string;
  date: string;
  startHour: number;
  hours: number;
  bookerName: string;
  contact: string;
  purpose: string;
  amount: number;
  status: string;
};

/**
 * Week board for the counter — mirrors the F.A.E. Google Sheet layout
 * (Sunday-first columns, hour rows, renter / amount / status per cell).
 */
export function ScheduleBoard() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [anchor, setAnchor] = useState(() => weekStart(manilaToday()));
  const [courtId, setCourtId] = useState(ALL_COURTS[0]?.id ?? "bb-full");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [sheetUrl, setSheetUrl] = useState(DEFAULT_SHEET_URL);
  const [preview, setPreview] = useState<{ weekLabel: string; bookings: SheetBooking[]; newCount: number; skippedLate: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [eventDraft, setEventDraft] = useState<{
    eventName: string;
    sport: SportKey;
    courtId: string;
    date: string;
    startHour: number;
    hours: number;
    amount: number;
    contact: string;
    purpose: string;
  } | null>(null);

  const court = ALL_COURTS.find((c) => c.id === courtId) ?? ALL_COURTS[0]!;
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(anchor, i)), [anchor]);
  const today = manilaToday();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["schedule-board", anchor],
    queryFn: () => getSchedule({ data: { start: anchor, days: 7 } }),
  });

  const { data: history } = useQuery({
    queryKey: ["schedule-history"],
    queryFn: () => getBookingHistory({ data: {} }),
    enabled: historyOpen,
  });

  /** Bookings for the selected court, keyed "date|hour" — every hour a booking spans points at it. */
  const cells = useMemo(() => {
    const map = new Map<string, BookingRow>();
    for (const b of data?.bookings ?? []) {
      if (b.court_id !== courtId || b.status === "Cancelled") continue;
      for (let h = b.start_hour; h < b.start_hour + b.hours; h++) map.set(`${b.date}|${h}`, b);
    }
    return map;
  }, [data, courtId]);

  const dayTotals = useMemo(
    () =>
      days.map((d) =>
        (data?.bookings ?? [])
          .filter((b) => b.date === d && b.court_id === courtId && b.status !== "Cancelled")
          .reduce((sum, b) => sum + Number(b.amount), 0),
      ),
    [days, data, courtId],
  );
  const weekTotal = dayTotals.reduce((a, b) => a + b, 0);

  function openNew(date: string, hour: number) {
    setDraft({
      sport: court.sport,
      courtId: court.id,
      date,
      startHour: hour,
      hours: 1,
      bookerName: "",
      contact: "",
      purpose: "",
      amount: court.rate,
      status: "Confirmed",
    });
  }

  function openEdit(b: BookingRow) {
    setDraft({
      id: b.id,
      sport: (b.sport as SportKey) ?? court.sport,
      courtId: b.court_id,
      date: b.date,
      startHour: b.start_hour,
      hours: b.hours,
      bookerName: b.booker_name ?? "",
      contact: b.contact ?? "",
      purpose: b.purpose ?? "",
      amount: Number(b.amount),
      status: b.status ?? "Confirmed",
    });
  }

  async function persist() {
    if (!draft) return;
    if (!draft.bookerName.trim()) {
      toast("Renter name is required.");
      return;
    }
    setSaving(true);
    try {
      await saveBooking({ data: { ...draft, status: draft.status as never } });
      toast(draft.id ? "Booking updated." : "Booking added.");
      setDraft(null);
      await refetch();
      void qc.invalidateQueries({ queryKey: ["schedule-history"] });
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not save booking.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(hard: boolean) {
    if (!draft?.id) return;
    setSaving(true);
    try {
      await deleteBooking({ data: { id: draft.id, hard } });
      toast(hard ? "Booking deleted." : "Booking cancelled.");
      setDraft(null);
      await refetch();
      void qc.invalidateQueries({ queryKey: ["schedule-history"] });
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not remove booking.");
    } finally {
      setSaving(false);
    }
  }

  async function saveEvent() {
    if (!eventDraft) return;
    if (!eventDraft.eventName.trim()) {
      toast("Event name is required.");
      return;
    }
    setSaving(true);
    try {
      const res = await createEventBooking({ data: eventDraft });
      toast(`Event booked · ${res.ref}`);
      setEventDraft(null);
      await refetch();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not book that event.");
    } finally {
      setSaving(false);
    }
  }

  async function runImport(commit: boolean) {
    const parsed = parseSheetUrl(sheetUrl);
    if (!parsed) {
      toast("That doesn't look like a Google Sheets link.");
      return;
    }
    setBusy(true);
    try {
      const res = await importSheetWeek({ data: { ...parsed, commit } });
      setPreview({
        weekLabel: res.weekLabel,
        bookings: res.bookings,
        newCount: res.newCount,
        skippedLate: res.skippedLate,
      });
      if (commit) {
        toast(`Imported ${res.imported} booking${res.imported === 1 ? "" : "s"}.`);
        setImportOpen(false);
        setPreview(null);
        await refetch();
        void qc.invalidateQueries({ queryKey: ["schedule-history"] });
      }
    } catch (err) {
      toast(err instanceof Error ? err.message : "Import failed.");
    } finally {
      setBusy(false);
    }
  }

  /** CSV shaped like the F.A.E. sheet: one row per hour, three columns per day. */
  function exportCsv() {
    const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const lines: string[] = [];
    lines.push([esc(`FAE ${court.name.toUpperCase()} — COURT RENTAL SCHEDULE`)].join(","));
    lines.push([esc(`Week of ${shortDate(anchor)}`)].join(","));
    lines.push(["", ...days.flatMap((d) => [esc(WEEKDAYS[new Date(`${d}T00:00:00Z`).getUTCDay()]!), "", ""])].join(","));
    lines.push(["", ...days.flatMap((d) => [esc(shortDate(d)), "", ""])].join(","));
    lines.push(["", ...days.flatMap(() => [esc("RENTER NAME"), esc("AMOUNT"), esc("STATUS")])].join(","));
    for (const h of HOURS) {
      const row: string[] = [esc(formatHour(h))];
      for (const d of days) {
        const b = cells.get(`${d}|${h}`);
        row.push(b ? esc(b.booker_name ?? "") : "", b && b.start_hour === h ? esc(Number(b.amount)) : "", b ? esc(b.status ?? "") : "");
      }
      lines.push(row.join(","));
    }
    lines.push([esc("TOTAL"), ...dayTotals.flatMap((t) => [esc(t), "", ""])].join(","));

    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `FAE_${court.id}_${anchor}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast("CSV exported.");
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setAnchor(addDays(anchor, -7))} aria-label="Previous week">
            <Icon name="arrow-right" size={14} className="rotate-180" />
          </Button>
          <div className="min-w-[190px] text-center">
            <p className="font-display text-base font-extrabold uppercase tracking-wide text-foreground">
              {shortDate(anchor)} – {shortDate(addDays(anchor, 6))}
            </p>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              {court.name} · {SPORTS[court.sport].label}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setAnchor(addDays(anchor, 7))} aria-label="Next week">
            <Icon name="arrow-right" size={14} />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setAnchor(weekStart(manilaToday()))}>
            Today
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={courtId}
            onChange={(e) => setCourtId(e.target.value)}
            className="rounded-lg border border-border bg-surface-2 px-3 py-2 font-mono text-[11px] uppercase tracking-wide text-foreground"
          >
            {ALL_COURTS.map((c) => (
              <option key={c.id} value={c.id}>
                {SPORTS[c.sport].label} · {c.name}
              </option>
            ))}
          </select>
          <Button variant="ghost" size="sm" onClick={() => setHistoryOpen(true)}>
            <Icon name="activity" size={14} />
            History
          </Button>
          <Button variant="ghost" size="sm" onClick={exportCsv}>
            <Icon name="external-link" size={14} />
            CSV
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              setEventDraft({
                eventName: "",
                sport: court.sport,
                courtId: court.id,
                date: days[0] ?? today,
                startHour: 18,
                hours: 3,
                amount: court.rate * 3,
                contact: "",
                purpose: "",
              })
            }
          >
            <Icon name="users" size={14} />
            New event
          </Button>
          <Button
            variant="gold"
            size="sm"
            onClick={() => {
              setPreview(null);
              setImportOpen(true);
            }}
          >
            <Icon name="calendar-clock" size={14} />
            Import sheet
          </Button>
        </div>
      </div>

      {/* Board */}
      <div className="overflow-x-auto rounded-xl border border-border bg-surface-1">
        <table className="w-full min-w-[900px] border-collapse">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 w-20 bg-surface-2 p-2 text-left font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Time
              </th>
              {days.map((d) => (
                <th
                  key={d}
                  className={cn(
                    "border-l border-border p-2 text-center",
                    d === today && "bg-gold/10",
                  )}
                >
                  <p className="font-display text-sm font-extrabold uppercase text-foreground">
                    {WEEKDAYS[new Date(`${d}T00:00:00Z`).getUTCDay()]!.slice(0, 3)}
                  </p>
                  <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                    {shortDate(d)}
                  </p>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {HOURS.map((h) => (
              <tr key={h} className="border-t border-border">
                <td className="sticky left-0 z-10 bg-surface-2 p-2 font-mono text-[10px] uppercase text-muted-foreground">
                  {formatHour(h)}
                </td>
                {days.map((d) => {
                  const b = cells.get(`${d}|${h}`);
                  const isStart = b?.start_hour === h;
                  return (
                    <td key={d} className="border-l border-border p-0 align-top">
                      <button
                        type="button"
                        onClick={() => (b ? openEdit(b) : openNew(d, h))}
                        className={cn(
                          "h-12 w-full px-2 text-left transition-colors",
                          b
                            ? "bg-surface-3 hover:bg-surface-4"
                            : "hover:bg-surface-2",
                        )}
                        style={b ? { borderLeft: `3px solid ${SPORTS[court.sport].acc}` } : undefined}
                      >
                        {b && isStart ? (
                          <>
                            <p className="truncate text-xs font-semibold text-foreground">{b.booker_name ?? "—"}</p>
                            <p className="font-mono text-[10px] text-muted-foreground">
                              {formatPeso(Number(b.amount))} · {b.status ?? "—"}
                            </p>
                          </>
                        ) : b ? (
                          <span className="font-mono text-[10px] text-muted-foreground">↑ cont.</span>
                        ) : null}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
            <tr className="border-t-2 border-goldline bg-surface-2">
              <td className="sticky left-0 z-10 bg-surface-2 p-2 font-mono text-[10px] uppercase tracking-[0.18em] text-gold">
                Total
              </td>
              {dayTotals.map((t, i) => (
                <td key={days[i]} className="border-l border-border p-2 text-center font-mono text-xs font-semibold text-foreground">
                  {t ? formatPeso(t) : "—"}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between px-1">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          {isLoading ? "Loading…" : "Click any slot to add or edit"}
        </p>
        <p className="font-mono text-xs text-muted-foreground">
          Week total <span className="font-semibold text-gold">{formatPeso(weekTotal)}</span>
        </p>
      </div>

      {/* Add / edit modal */}
      <Modal
        open={!!draft}
        onClose={() => setDraft(null)}
        title={draft?.id ? "Edit booking" : "Add booking"}
        subtitle={draft ? `${shortDate(draft.date)} · ${formatHour(draft.startHour)} · ${court.name}` : undefined}
      >
        {draft ? (
          <div className="space-y-4">
            <Field label="Renter name">
              <input
                autoFocus
                value={draft.bookerName}
                onChange={(e) => setDraft({ ...draft, bookerName: e.target.value })}
                className="fae-input"
                placeholder="Walk-in or team name"
              />
            </Field>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Contact">
                <input
                  value={draft.contact}
                  onChange={(e) => setDraft({ ...draft, contact: e.target.value })}
                  className="fae-input"
                  placeholder="Mobile number"
                />
              </Field>
              <Field label="Purpose">
                <input
                  value={draft.purpose}
                  onChange={(e) => setDraft({ ...draft, purpose: e.target.value })}
                  className="fae-input"
                  placeholder="Practice, league, event"
                />
              </Field>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Start">
                <select
                  value={draft.startHour}
                  onChange={(e) => setDraft({ ...draft, startHour: Number(e.target.value) })}
                  className="fae-input"
                >
                  {HOURS.map((h) => (
                    <option key={h} value={h}>
                      {formatHour(h)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Hours">
                <input
                  type="number"
                  min={1}
                  max={18}
                  value={draft.hours}
                  onChange={(e) => setDraft({ ...draft, hours: Math.max(1, Number(e.target.value) || 1) })}
                  className="fae-input"
                />
              </Field>
              <Field label="Amount">
                <input
                  type="number"
                  min={0}
                  value={draft.amount}
                  onChange={(e) => setDraft({ ...draft, amount: Number(e.target.value) || 0 })}
                  className="fae-input"
                />
              </Field>
            </div>

            <Field label="Status">
              <select
                value={draft.status}
                onChange={(e) => setDraft({ ...draft, status: e.target.value })}
                className="fae-input"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </Field>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
              <div className="flex gap-2">
                {draft.id ? (
                  <>
                    <Button variant="ghost" size="sm" onClick={() => void remove(false)} disabled={saving}>
                      Cancel booking
                    </Button>
                    <Button variant="danger" size="sm" onClick={() => void remove(true)} disabled={saving}>
                      Delete
                    </Button>
                  </>
                ) : null}
              </div>
              <Button variant="gold" onClick={() => void persist()} disabled={saving}>
                {saving ? "Saving…" : draft.id ? "Save changes" : "Add booking"}
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>

      {/* Event block-out */}
      <Modal
        open={!!eventDraft}
        onClose={() => setEventDraft(null)}
        title="Book an event"
        subtitle="Clinics, league nights, corporate bookings"
      >
        {eventDraft ? (
          <div className="space-y-4">
            <Field label="Event name">
              <input
                autoFocus
                value={eventDraft.eventName}
                onChange={(e) => setEventDraft({ ...eventDraft, eventName: e.target.value })}
                className="fae-input w-full"
                placeholder="NXGEN Finals Night"
              />
            </Field>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Court">
                <select
                  value={eventDraft.courtId}
                  onChange={(e) => {
                    const c = ALL_COURTS.find((x) => x.id === e.target.value)!;
                    setEventDraft({ ...eventDraft, courtId: c.id, sport: c.sport });
                  }}
                  className="fae-input w-full"
                >
                  {ALL_COURTS.map((c) => (
                    <option key={c.id} value={c.id}>
                      {SPORTS[c.sport].label} · {c.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Date">
                <input
                  type="date"
                  value={eventDraft.date}
                  onChange={(e) => setEventDraft({ ...eventDraft, date: e.target.value })}
                  className="fae-input w-full"
                />
              </Field>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Start">
                <select
                  value={eventDraft.startHour}
                  onChange={(e) => setEventDraft({ ...eventDraft, startHour: Number(e.target.value) })}
                  className="fae-input w-full"
                >
                  {HOURS.map((h) => (
                    <option key={h} value={h}>
                      {formatHour(h)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Hours">
                <input
                  type="number"
                  min={1}
                  max={18}
                  value={eventDraft.hours}
                  onChange={(e) =>
                    setEventDraft({ ...eventDraft, hours: Math.max(1, Number(e.target.value) || 1) })
                  }
                  className="fae-input w-full"
                />
              </Field>
              <Field label="Total charge">
                <input
                  type="number"
                  min={0}
                  value={eventDraft.amount}
                  onChange={(e) => setEventDraft({ ...eventDraft, amount: Number(e.target.value) || 0 })}
                  className="fae-input w-full"
                />
              </Field>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Contact">
                <input
                  value={eventDraft.contact}
                  onChange={(e) => setEventDraft({ ...eventDraft, contact: e.target.value })}
                  className="fae-input w-full"
                  placeholder="Organiser mobile"
                />
              </Field>
              <Field label="Notes">
                <input
                  value={eventDraft.purpose}
                  onChange={(e) => setEventDraft({ ...eventDraft, purpose: e.target.value })}
                  className="fae-input w-full"
                  placeholder="Setup needs, sponsors"
                />
              </Field>
            </div>

            <div className="flex justify-end border-t border-border pt-4">
              <Button variant="gold" onClick={() => void saveEvent()} disabled={saving}>
                {saving ? "Booking…" : "Book event"}
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>

      {/* Import from Google Sheet */}
      <Modal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        title="Import from Google Sheet"
        subtitle="Preview first — nothing is saved until you confirm"
        wide
      >
        <div className="space-y-4">
          <Field label="Sheet link (open the week tab you want, then copy the URL)">
            <input value={sheetUrl} onChange={(e) => setSheetUrl(e.target.value)} className="fae-input" />
          </Field>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => void runImport(false)} disabled={busy}>
              {busy && !preview ? "Reading…" : "Preview"}
            </Button>
            {preview ? (
              <Button variant="gold" size="sm" onClick={() => void runImport(true)} disabled={busy || preview.newCount === 0}>
                {preview.newCount === 0 ? "Nothing new to import" : `Import ${preview.newCount} booking${preview.newCount === 1 ? "" : "s"}`}
              </Button>
            ) : null}
          </div>

          {preview ? (
            <>
              <div className="flex flex-wrap items-center gap-3 rounded-lg border border-goldline bg-surface-2 p-3">
                <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-gold">
                  Week of {preview.weekLabel}
                </p>
                <Badge variant="green">{preview.newCount} new</Badge>
                {preview.bookings.length - preview.newCount > 0 ? (
                  <Badge variant="grey">{preview.bookings.length - preview.newCount} already imported</Badge>
                ) : null}
                {preview.skippedLate > 0 ? (
                  <Badge variant="gold">{preview.skippedLate} after-midnight skipped</Badge>
                ) : null}
              </div>

              <div className="max-h-[45vh] overflow-y-auto rounded-lg border border-border">
                <table className="w-full border-collapse text-left">
                  <thead className="sticky top-0 bg-surface-2">
                    <tr className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                      <th className="p-2">Date</th>
                      <th className="p-2">Time</th>
                      <th className="p-2">Renter</th>
                      <th className="p-2">Sport</th>
                      <th className="p-2 text-right">Amount</th>
                      <th className="p-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.bookings.map((b, i) => (
                      <tr
                        key={`${b.date}-${b.startHour}-${b.bookerName}-${i}`}
                        className={cn("border-t border-border text-sm", b.duplicate && "opacity-40")}
                      >
                        <td className="p-2 font-mono text-[11px] text-muted-foreground">{shortDate(b.date)}</td>
                        <td className="p-2 font-mono text-[11px] text-muted-foreground">
                          {formatHour(b.startHour)} ×{b.hours}h
                        </td>
                        <td className="p-2 text-foreground">
                          {b.bookerName}
                          {b.duplicate ? <span className="ml-2 font-mono text-[10px] text-muted-foreground">skip</span> : null}
                        </td>
                        <td className="p-2 font-mono text-[11px]" style={{ color: SPORTS[b.sport].acc }}>
                          {SPORTS[b.sport].label}
                        </td>
                        <td className="p-2 text-right font-mono text-xs text-foreground">{formatPeso(b.amount)}</td>
                        <td className="p-2">
                          <Badge variant={statusVariant(b.status)}>{b.status}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p className="font-mono text-[10px] leading-relaxed text-muted-foreground">
                Sport is guessed from the renter text, and every imported row is tagged
                <span className="text-foreground"> channel “Sheet import” </span>
                so you can find and fix them. Re-importing the same week is safe — matches are skipped.
              </p>
            </>
          ) : null}
        </div>
      </Modal>

      {/* Change history */}
      <Modal open={historyOpen} onClose={() => setHistoryOpen(false)} title="Change history" wide>
        <div className="space-y-2">
          {(history?.history ?? []).length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No booking changes logged yet.</p>
          ) : (
            (history?.history ?? []).map((row) => (
              <div key={row.id} className="rounded-lg border border-border bg-surface-2 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-foreground">{row.action}</p>
                  <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                    {row.created_at ? new Date(row.created_at).toLocaleString("en-PH") : ""}
                  </p>
                </div>
                {row.details ? <p className="mt-1 font-mono text-[11px] text-muted-foreground">{row.details}</p> : null}
                {row.before_after ? (
                  <p className="mt-2 break-words font-mono text-[11px] text-muted-foreground">{row.before_after}</p>
                ) : null}
                {row.actor_name ? (
                  <div className="mt-2">
                    <Badge variant="grey">{row.actor_name}</Badge>
                  </div>
                ) : null}
              </div>
            ))
          )}
        </div>
      </Modal>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}
