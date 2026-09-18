import { SITE_HOST, SITE_URL as SITE } from "@/lib/site-url";
/**
 * The badge wall.
 *
 * Every family shows the tier you hold and the exact requirement for the next
 * one, and every earned tier can be posted on its own — that is the whole point
 * of copying 2K's structure rather than just its look. A locked tier is drawn
 * with the same weight as an earned one; it is distinguished by an outline and
 * a stated requirement, never by fading it out, because low-contrast "locked"
 * styling is unreadable and tells the player nothing.
 */

import { useMemo, useState } from "react";
import {
  Flame, Zap, HandHelping, CalendarCheck, Rows2, Rows3, Medal, Shapes,
  Trophy, Lock, ChevronDown,
} from "lucide-react";
import { evaluateAll, totalEarned, shareCaption, TIER_LABEL, type Achievement, type Ctx, type Tier } from "@/lib/achievements";
import { BallBasketball, HandGrab, HandStop, Stopwatch, type BadgeIcon } from "./nx-badge-icons";
import { NxShareSheet, type SharePayload } from "./nx-share-sheet";

/**
 * Every badge gets the closest thing to a picture of the feat itself, because
 * the icon is the only part of a card read at a glance. A ball for scoring, a
 * closing fist for boards, an open palm for a rejection, a running clock for
 * the closer. Two- and three-row marks for the double and triple double keep
 * that pair reading as siblings and state the number they measure.
 */
const ICONS: Record<string, BadgeIcon> = {
  BallBasketball, HandGrab, HandHelping, Zap, HandStop, CalendarCheck,
  Rows2, Rows3, Medal, Flame, Stopwatch, Shapes,
};

const TIER_HEX: Record<Tier, string> = {
  bronze: "#C87F3A",
  silver: "#C2C7D4",
  gold: "#C9A227",
  hof: "#E8C468",
};


/* ---------------- shareable card painter ---------------- */

function hexPath(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i - Math.PI / 2;
    const x = cx + r * Math.cos(a);
    const y = cy + r * Math.sin(a);
    i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
  }
  ctx.closePath();
}

function fitText(ctx: CanvasRenderingContext2D, text: string, max: number, start: number, weight: string, family: string) {
  let size = start;
  do {
    ctx.font = `${weight} ${size}px ${family}`;
    if (ctx.measureText(text).width <= max) break;
    size -= 4;
  } while (size > 18);
  return size;
}

const DISPLAY = "Archivo, 'Segoe UI', system-ui, sans-serif";
const MONO = "'JetBrains Mono', ui-monospace, monospace";

export function drawAchievement(
  ctx: CanvasRenderingContext2D,
  a: Achievement,
  playerName: string,
  division: string | null | undefined,
) {
  const S = 1080;
  const accent = TIER_HEX[a.tier];

  ctx.fillStyle = "#050507";
  ctx.fillRect(0, 0, S, S);

  const glow = ctx.createRadialGradient(S / 2, 430, 40, S / 2, 430, 560);
  glow.addColorStop(0, `${accent}2E`);
  glow.addColorStop(1, "#05050700");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, S, S);

  ctx.strokeStyle = `${accent}44`;
  ctx.lineWidth = 2;
  ctx.strokeRect(40, 40, S - 80, S - 80);

  ctx.textAlign = "center";

  ctx.fillStyle = "#8F94A4";
  ctx.font = `500 22px ${MONO}`;
  ctx.letterSpacing = "8px";
  ctx.fillText("NXGEN PREMIER LEAGUE", S / 2, 120);

  ctx.fillStyle = accent;
  ctx.font = `600 24px ${MONO}`;
  ctx.letterSpacing = "10px";
  ctx.fillText("ACHIEVEMENT UNLOCKED", S / 2, 190);
  ctx.letterSpacing = "0px";

  // Medallion
  const cx = S / 2;
  const cy = 430;
  hexPath(ctx, cx, cy, 168);
  ctx.fillStyle = "#0C0C11";
  ctx.fill();
  ctx.strokeStyle = accent;
  ctx.lineWidth = 6;
  ctx.stroke();
  hexPath(ctx, cx, cy, 146);
  ctx.strokeStyle = `${accent}55`;
  ctx.lineWidth = 2;
  ctx.stroke();

  const value = a.decimals ? a.target.toFixed(a.decimals) : String(a.target);
  ctx.fillStyle = "#F0F2F5";
  ctx.font = `900 ${value.length > 2 ? 92 : 112}px ${DISPLAY}`;
  ctx.fillText(value, cx, cy + 24);

  ctx.fillStyle = accent;
  ctx.font = `600 20px ${MONO}`;
  ctx.letterSpacing = "6px";
  ctx.fillText(TIER_LABEL[a.tier].toUpperCase(), cx, cy + 96);
  ctx.letterSpacing = "0px";

  // Name of the badge
  const labelSize = fitText(ctx, a.label, S - 200, 78, "900", DISPLAY);
  ctx.fillStyle = "#F0F2F5";
  ctx.font = `900 ${labelSize}px ${DISPLAY}`;
  ctx.fillText(a.label, cx, 706);

  ctx.fillStyle = "#B8BCC8";
  ctx.font = `400 30px ${DISPLAY}`;
  ctx.fillText(a.requirement, cx, 758);

  // Who
  ctx.strokeStyle = "#FFFFFF1A";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(240, 820);
  ctx.lineTo(S - 240, 820);
  ctx.stroke();

  const nameSize = fitText(ctx, playerName, S - 220, 54, "800", DISPLAY);
  ctx.fillStyle = "#F0F2F5";
  ctx.font = `800 ${nameSize}px ${DISPLAY}`;
  ctx.fillText(playerName, cx, 892);

  if (division) {
    ctx.fillStyle = "#8F94A4";
    ctx.font = `500 24px ${MONO}`;
    ctx.letterSpacing = "5px";
    ctx.fillText(division.toUpperCase(), cx, 936);
    ctx.letterSpacing = "0px";
  }

  ctx.fillStyle = "#5A5F6E";
  ctx.font = `400 22px ${MONO}`;
  ctx.fillText(SITE_HOST, cx, 1010);
}

/* ---------------- UI ---------------- */

function TierPip({ t, on }: { t: Tier; on: boolean }) {
  return (
    <span
      className={`ac-pip${on ? " on" : ""}`}
      style={on ? { background: TIER_HEX[t], borderColor: TIER_HEX[t] } : undefined}
      title={`${TIER_LABEL[t]}${on ? " earned" : " locked"}`}
    />
  );
}

export function NxAchievements({
  ctx,
  playerName,
  division,
  playerId,
}: {
  ctx: Ctx;
  playerName: string;
  division?: string | null;
  playerId?: string | null;
}) {
  const states = useMemo(() => evaluateAll(ctx), [ctx]);
  const { earned, total } = totalEarned(states);
  const [open, setOpen] = useState<string | null>(null);

  const url = playerId ? `${SITE}/card/${playerId}` : SITE;

  return (
    <section className="ac-wrap" aria-labelledby="ac-h">
      <div className="ac-head">
        <h3 id="ac-h" className="ac-title">Achievements</h3>
        <span className="ac-count">
          <b>{earned}</b> of {total} unlocked
        </span>
      </div>

      <div className="ac-grid">
        {states.map((s) => {
          const Icon = ICONS[s.family.icon] ?? Trophy;
          const shown = s.highest ?? s.next ?? s.tiers[0];
          const isOpen = open === s.family.id;
          const accent = s.highest ? TIER_HEX[s.highest.tier] : undefined;
          return (
            <div key={s.family.id} className={`ac-card${s.highest ? " got" : ""}`}>
              <button
                type="button"
                className="ac-trigger"
                aria-expanded={isOpen}
                onClick={() => setOpen(isOpen ? null : s.family.id)}
              >
                <span className="ac-ico" style={accent ? { color: accent, borderColor: `${accent}66` } : undefined}>
                  {s.highest ? <Icon aria-hidden="true" /> : <Lock aria-hidden="true" />}
                </span>
                <span className="ac-body">
                  <span className="ac-name">{s.family.label}</span>
                  <span className="ac-state">
                    {s.highest ? TIER_LABEL[s.highest.tier] : "Locked"}
                    {s.next ? ` · next ${s.next.requirement}` : " · maxed"}
                  </span>
                  <span className="ac-pips">
                    {s.tiers.map((t) => (
                      <TierPip key={t.tier} t={t.tier} on={t.earned} />
                    ))}
                  </span>
                  {s.next && (
                    <span className="ac-bar" aria-hidden="true">
                      <i style={{ width: `${Math.round(s.next.progress * 100)}%`, background: TIER_HEX[s.next.tier] }} />
                    </span>
                  )}
                  <span className="sr-only">
                    {s.highest
                      ? `${TIER_LABEL[s.highest.tier]} earned.`
                      : "Not yet earned."}
                    {s.next
                      ? ` Next tier needs ${s.next.requirement}. Currently ${
                          s.next.decimals ? s.next.current.toFixed(s.next.decimals) : Math.round(s.next.current)
                        }.`
                      : " Every tier earned."}
                  </span>
                </span>
                <ChevronDown className={`ac-chev${isOpen ? " open" : ""}`} aria-hidden="true" />
              </button>

              {isOpen && (
                <div className="ac-open">
                  <ul className="ac-tiers">
                    {s.tiers.map((t) => (
                      <li key={t.tier} className={t.earned ? "on" : ""}>
                        <span className="ac-tl" style={{ color: t.earned ? TIER_HEX[t.tier] : undefined }}>
                          {TIER_LABEL[t.tier]}
                        </span>
                        <span className="ac-tr">{t.requirement}</span>
                        {t.earned ? <Check /> : <span className="ac-todo">{Math.round(t.progress * 100)}%</span>}
                      </li>
                    ))}
                  </ul>
                  {s.highest ? (
                    <NxShareSheet
                      compact
                      payload={
                        {
                          title: `${playerName} — ${s.highest.label} ${TIER_LABEL[s.highest.tier]}`,
                          caption: shareCaption(s.highest, playerName, division),
                          url,
                          draw: (c) => drawAchievement(c, s.highest!, playerName, division),
                        } satisfies SharePayload
                      }
                    />
                  ) : (
                    <p className="ac-hint">Unlock {shown.requirement} to share this one.</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Check() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}
