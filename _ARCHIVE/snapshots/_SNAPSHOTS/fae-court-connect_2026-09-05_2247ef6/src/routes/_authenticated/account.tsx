import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Badge } from "@/components/fae/Badge";
import { Button } from "@/components/fae/Button";
import { Footer } from "@/components/fae/Footer";
import { Icon } from "@/components/fae/Icon";
import { useToast } from "@/components/fae/Toast";
import { SendPaymentModal } from "@/components/fae/Payments";
import { WifiPanel } from "@/components/fae/Wifi";
import { supabase } from "@/integrations/supabase/client";
import { formatHour, formatPeso, SPORTS, type SportKey } from "@/lib/constants";
import { HOLD_GRACE_MINUTES, cancelBooking, depositDue, getMyBookings, getMyProfile, getMyTabs, holdRemainingMs } from "@/lib/fae.functions";
import type { BookingRow, TabItem } from "@/lib/fae.types";

export const Route = createFileRoute("/_authenticated/account")({
  head: () => ({
    meta: [
      { title: "My account — F.A.E. Court" },
      { name: "description", content: "Your F.A.E. Court bookings, counter tab and membership." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AccountPage,
});

/** Deposit still owed on a booking, after any verified deposit payments. */
function depositLeft(b: BookingRow): number {
  return Math.max(0, depositDue(Number(b.amount ?? 0)) - Number(b.deposit_paid ?? 0));
}

function slotStartMs(b: BookingRow): number {
  return Date.parse(`${b.date}T00:00:00+08:00`) + (b.start_hour ?? 0) * 3600_000;
}

function AccountPage() {
  const [payFor, setPayFor] = useState<BookingRow | null>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: profile } = useQuery({ queryKey: ["my-profile"], queryFn: () => getMyProfile({ data: undefined }) });
  const { data: bookingsData } = useQuery({
    queryKey: ["my-bookings"],
    queryFn: () => getMyBookings({ data: undefined }),
  });
  const { data: tabsData } = useQuery({ queryKey: ["my-tabs"], queryFn: () => getMyTabs({ data: undefined }) });

  const bookings: BookingRow[] = bookingsData?.bookings ?? [];
  const member = profile?.member ?? bookingsData?.member ?? null;

  const active = bookings.filter((b) => b.status !== "Cancelled");
  const upcoming = active.filter((b) => slotStartMs(b) > Date.now());
  const hoursBooked = active.reduce((sum, b) => sum + (b.hours ?? 0), 0);
  const lifetimeSpend = active.reduce((sum, b) => sum + (b.amount ?? 0), 0);

  const onCancel = async (booking: BookingRow) => {
    try {
      await cancelBooking({ data: { id: booking.id } });
      toast(`Cancelled ${booking.ref}.`);
      queryClient.invalidateQueries({ queryKey: ["my-bookings"] });
      queryClient.invalidateQueries({ queryKey: ["availability"] });
    } catch (error) {
      toast(error instanceof Error ? error.message : "Could not cancel this booking.");
    }
  };

  const signOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  const memberSince = member?.joined_at
    ? new Date(member.joined_at).toLocaleDateString("en-PH", { month: "short", year: "numeric" })
    : "—";

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b border-border bg-surface-1 pt-16">
        <div className="h-px w-full bg-gold/40" />
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-8 sm:px-6">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-display text-3xl font-black uppercase tracking-tight text-foreground">
                {member?.name ?? "Member"}
              </h1>
              {member?.tier === "member" ? <Badge variant="gold">Member</Badge> : null}
              {profile?.isAdmin ? <Badge variant="blue">Admin</Badge> : null}
            </div>
            <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              Member since {memberSince} · {member?.provider ?? "Email"} sign-in
            </p>
          </div>
          <div className="flex gap-3">
            {profile?.isAdmin ? (
              <Button variant="gold" size="sm" onClick={() => navigate({ to: "/admin" })}>
                Admin panel
              </Button>
            ) : null}
            <Button variant="ghost" size="sm" onClick={signOut}>
              <Icon name="sign-out" size={14} />
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            { label: "Upcoming bookings", value: String(upcoming.length) },
            { label: "Hours booked", value: String(hoursBooked) },
            { label: "Lifetime spend", value: formatPeso(lifetimeSpend) },
            { label: "Membership", value: member?.tier === "member" ? "Member" : "Non-member" },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl border border-border bg-surface-2 p-5">
              <p className="font-display text-2xl font-extrabold text-foreground">{stat.value}</p>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-10 sm:px-6">
        <h2 className="font-display text-xl font-extrabold uppercase tracking-wide text-foreground">My bookings</h2>
        <div className="mt-5 space-y-3">
          {bookings.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-surface-1 p-10 text-center">
              <p className="text-sm text-muted-foreground">No bookings yet — the floor is waiting.</p>
              <Button variant="gold" size="sm" className="mt-4" onClick={() => navigate({ to: "/book" })}>
                Book a court
              </Button>
            </div>
          ) : (
            bookings.map((b) => {
              const sport = SPORTS[(b.sport ?? "basketball") as SportKey];
              const court = sport?.courts.find((c) => c.id === b.court_id);
              const start = slotStartMs(b);
              const cancelled = b.status === "Cancelled";
              const paidDeposit = Number(b.deposit_paid ?? 0) > 0;
              // Unpaid holds can always be dropped — that is the escape hatch for a double-booking.
              const cancellable = !cancelled && (!paidDeposit || start - Date.now() > 6 * 3600_000);
              const holdMs = holdRemainingMs(b.created_at ?? null, Number(b.deposit_paid ?? 0));
              return (
                <div key={b.id} className="flex flex-wrap items-center gap-4 rounded-xl border border-border bg-surface-2 p-4">
                  <span
                    className="flex h-10 w-10 items-center justify-center rounded-lg"
                    style={{ color: sport?.acc, backgroundColor: `${sport?.acc}14` }}
                  >

                    <Icon name={sport?.icon ?? "basketball"} size={19} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {court?.name ?? b.court_id} ·{" "}
                      {new Date(start).toLocaleDateString("en-PH", { weekday: "short", month: "short", day: "numeric" })}{" "}
                      · {formatHour(b.start_hour ?? 0)}–{formatHour((b.start_hour ?? 0) + (b.hours ?? 1))}
                    </p>
                    <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      {b.ref} · {formatPeso(b.amount ?? 0)}
                      {depositLeft(b) > 0 ? (
                        <span className="ml-2 text-gold">
                          {formatPeso(depositLeft(b))} deposit due to reserve
                        </span>
                      ) : (
                        <span className="ml-2 text-green-400">Deposit received</span>
                      )}
                      {!cancelled && !paidDeposit && (
                        <span className="ml-2 text-orange-400">
                          {holdMs > 0
                            ? `hold ${Math.ceil(holdMs / 60_000)} min left`
                            : "hold lapsed · slot open to whoever pays first"}
                        </span>
                      )}
                    </p>
                  </div>
                  <Badge variant={cancelled ? "grey" : "gold"}>{b.status ?? "Reserved"}</Badge>
                  {!cancelled ? (
                    <Button variant="gold" size="sm" onClick={() => setPayFor(b)}>
                      Send proof
                    </Button>
                  ) : null}
                  {!cancelled ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={!cancellable}
                      onClick={() => onCancel(b)}
                      title={cancellable ? "Cancel booking" : "Deposit paid — free cancellation ends 6 hours before"}
                    >
                      Cancel
                    </Button>
                  ) : null}
                </div>
              );
            })
          )}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-24 sm:px-6">
        <h2 className="font-display text-xl font-extrabold uppercase tracking-wide text-foreground">Counter tab</h2>
        <div className="mt-5 rounded-xl border border-border bg-surface-2 p-6">
          {(tabsData?.tabs ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nothing on your tab. Charge drinks, food and gear at the counter and settle before you leave.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {(tabsData?.tabs ?? []).map((tab) => {
                const items = ((tab.items as unknown) as TabItem[]) ?? [];
                return (
                  <li key={tab.id} className="py-3">
                    <div className="flex items-center justify-between gap-4">
                      <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                        Opened{" "}
                        {new Date(tab.created_at ?? "").toLocaleDateString("en-PH", { month: "short", day: "numeric" })}
                      </p>
                      <span className="font-display text-lg font-extrabold text-gold">
                        {formatPeso(Number(tab.total))}
                      </span>
                    </div>
                    <p className="mt-1.5 text-sm text-muted-foreground">
                      {items.map((i) => `${i.qty}× ${i.name}`).join(" · ") || "No items yet"}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-24 sm:px-6">
        <h2 className="font-display text-xl font-extrabold uppercase tracking-wide text-foreground">
          WiFi at the court
        </h2>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">
          Order a WiFi pass for the F.A.E. internet cafe. Pay at the counter and staff switch it on.
        </p>
        <div className="mt-5">
          <WifiPanel />
        </div>
      </section>

      <SendPaymentModal
        booking={payFor}
        open={!!payFor}
        onClose={() => setPayFor(null)}
        onDone={() => queryClient.invalidateQueries({ queryKey: ["my-bookings"] })}
      />

      <Footer />
    </main>
  );
}
