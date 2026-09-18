/**
 * Parent portal — one page per guardian for every minor they look after.
 *
 * All of this existed already, scattered: managed_players holds the child, the
 * consent flow lives at /consent/$token, and My Account had a squeezed "Players
 * on this account" strip. A parent's actual question is "is my child cleared to
 * play, and what do they still need from me", and that was the one view nobody
 * had.
 *
 * Read-only on purpose. Adding and removing children stays on My Account, so
 * there is one place that writes and this page cannot half-delete a child.
 */

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { NxPage } from "@/components/nx-shell";
import { NxLoadError } from "@/components/nx-load-error";
import { SignedImage } from "@/components/signed-image";
import { toast } from "sonner";
import { ShieldCheck, ShieldAlert, Copy, IdCard, Users } from "lucide-react";

export const Route = createFileRoute("/account/minors")({
  head: () => ({
    meta: [
      { title: "Parent Portal — NXGEN Premier League" },
      { name: "description", content: "Consent status, division and player cards for the minors you look after." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: MinorsPage,
});

type Child = {
  id: string;
  full_name: string;
  date_of_birth: string | null;
  division: string | null;
  team_name: string | null;
  jersey_number: string | null;
  position: string | null;
  photo_url: string | null;
  status: string;
  is_minor: boolean | null;
  consent_status: string | null;
  consent_token: string | null;
  guardian_full_name: string | null;
  guardian_consent_at: string | null;
};

/** Whole years — the only part of an age anyone asks about. */
function ageOf(dob: string | null): number | null {
  if (!dob) return null;
  const [y, m, d] = dob.split("-").map(Number);
  if (!y || !m || !d) return null;
  const now = new Date();
  let age = now.getFullYear() - y;
  if (now.getMonth() + 1 < m || (now.getMonth() + 1 === m && now.getDate() < d)) age -= 1;
  return age >= 0 && age < 130 ? age : null;
}

const consentLink = (token: string | null) =>
  token && typeof window !== "undefined" ? `${window.location.origin}/consent/${token}` : null;

const isSigned = (c: Child) => c.consent_status === "signed" || c.consent_status === "approved";

function MinorsPage() {
  const navigate = useNavigate();
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data: sess } = await supabase.auth.getSession();
    if (!sess.session) { navigate({ to: "/auth" }); return; }

    setLoading(true);
    const { data, error } = await supabase
      .from("managed_players")
      .select("id, full_name, date_of_birth, division, team_name, jersey_number, position, photo_url, status, is_minor, consent_status, consent_token, guardian_full_name, guardian_consent_at")
      .eq("parent_user_id", sess.session.user.id)
      .order("full_name");
    // An empty list after a failed read would tell a parent they have no
    // children on the account, which is a very different thing.
    setLoadError(error?.message ?? null);
    setChildren((data as Child[]) ?? []);
    setLoading(false);
  }, [navigate]);

  useEffect(() => { load(); }, [load]);

  const copyConsent = async (c: Child) => {
    const url = consentLink(c.consent_token);
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Consent link copied — send it to the parent or guardian.");
    } catch {
      toast.error("Could not copy the link");
    }
  };

  const needsConsent = children.filter((c) => c.is_minor && !isSigned(c));

  return (
    <NxPage
      eyebrow="Parent Portal"
      title="My Players"
      intro="Everyone you look after in the league — what they are cleared for, and anything still outstanding."
    >
      <div className="acc-wrap">
        <nav className="acc-jump" aria-label="Account sections">
          <Link to="/account" className="btn btn-ghost btn-xs">
            <Users aria-hidden="true" /> My account
          </Link>
          <Link to="/register" className="btn btn-ghost btn-xs">Register another player</Link>
        </nav>

        {loading ? (
          <p className="hub-loading" role="status">Loading…</p>
        ) : loadError ? (
          <NxLoadError what="your players" detail={loadError} onRetry={load} />
        ) : children.length === 0 ? (
          <section className="inf-group">
            <p className="acc-sub">
              No players linked to this account yet. Add them from{" "}
              <Link to="/account">My Account</Link>, or <Link to="/register">register a player</Link>.
            </p>
          </section>
        ) : (
          <>
            {needsConsent.length > 0 && (
              <section className="inf-group acc-consent">
                <p className="acc-consent-k">
                  {needsConsent.length} waiting on your signature
                </p>
                <p className="acc-sub">
                  A minor cannot play, and their profile and stats stay hidden, until a parent or
                  guardian signs the waiver and media consent. Use the link on each card below.
                </p>
              </section>
            )}

            <ul className="acc-list mn-list">
              {children.map((c) => {
                const age = ageOf(c.date_of_birth);
                const signed = isSigned(c);
                const url = consentLink(c.consent_token);
                return (
                  <li key={c.id} className="inf-group mn-card">
                    <div className="mn-head">
                      <span className="mn-photo">
                        <SignedImage
                          bucket="player-photos"
                          path={c.photo_url}
                          alt=""
                          className="h-full w-full object-cover"
                          fallback={
                            <span className="mn-initials">
                              {c.full_name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
                            </span>
                          }
                        />
                      </span>
                      <span className="mn-who">
                        <span className="acc-row-t">{c.full_name}</span>
                        <span className="acc-sub">
                          {[
                            age != null ? `${age} years old` : null,
                            c.division,
                            c.team_name,
                            c.jersey_number ? `#${c.jersey_number}` : null,
                            c.position,
                          ].filter(Boolean).join(" · ") || "Details pending"}
                        </span>
                      </span>
                      <span className={`badge ${c.status === "approved" || c.status === "active" ? "bgn" : "bs"}`}>
                        {c.status === "approved" ? "Approved" : c.status === "active" ? "Active" : "Pending payment"}
                      </span>
                    </div>

                    {c.is_minor && (
                      <div className={`mn-consent${signed ? " ok" : ""}`}>
                        {signed ? (
                          <>
                            <ShieldCheck aria-hidden="true" />
                            <span>
                              Consent signed{c.guardian_full_name ? ` by ${c.guardian_full_name}` : ""}
                              {c.guardian_consent_at
                                ? ` on ${new Date(c.guardian_consent_at).toLocaleDateString("en-PH", { day: "numeric", month: "long", year: "numeric" })}`
                                : ""}.
                            </span>
                          </>
                        ) : (
                          <>
                            <ShieldAlert aria-hidden="true" />
                            <span>Waiver and media consent not signed yet.</span>
                            {url && (
                              <span className="mn-consent-acts">
                                <a href={url} target="_blank" rel="noreferrer" className="btn btn-gold btn-xs">
                                  Open consent form
                                </a>
                                <button type="button" className="btn btn-ghost btn-xs" onClick={() => copyConsent(c)}>
                                  <Copy aria-hidden="true" /> Copy link
                                </button>
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    )}

                    <div className="acc-row-actions">
                      <Link to="/card/$playerId" params={{ playerId: c.id }} className="btn btn-ghost btn-xs">
                        <IdCard aria-hidden="true" /> Player card
                      </Link>
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>
    </NxPage>
  );
}
