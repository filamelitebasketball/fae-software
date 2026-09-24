import { useRef, useState } from "react";
import { ArrowRight, Award, Brain, Hand, Layers, Medal, Rocket, Share2, Shield, Star, Target, Trophy, X, Zap } from "lucide-react";
import { site, type Art, type Player } from "@/site";

/**
 * Player roster as athletic ID cards, filterable by position / batch / division, with a
 * native <dialog> profile (Esc, focus and backdrop handled by the browser). While the
 * roster is empty it shows the card a new player earns, plus the badge and medal catalog.
 */

const ART = { target: Target, shield: Shield, zap: Zap, hand: Hand, share: Share2, brain: Brain, layers: Layers, rocket: Rocket, trophy: Trophy, medal: Medal, star: Star, award: Award };
const KEYS = ["position", "batch", "division"] as const;

function Chip({ name, medal }: { name: string; medal?: boolean }) {
  const art: Art = (medal ? site.medals : site.badges).find((b) => b.name === name)?.art ?? (medal ? "medal" : "award");
  const Icon = ART[art];
  return <span className={medal ? "chip-b medal" : "chip-b"}><Icon aria-hidden="true" />{name}</span>;
}

function Chips({ p }: { p: Player }) {
  if (!p.badges?.length && !p.medals?.length) return null;
  return (
    <span className="id-chips">
      {p.badges?.map((b) => <Chip key={b} name={b} />)}
      {p.medals?.map((m) => <Chip key={m} name={m} medal />)}
    </span>
  );
}

function CardBody({ p }: { p: Player }) {
  return (
    <>
      <span className="id-top"><img src={site.logo} alt="" /><span>{site.sport} · {p.batch}</span></span>
      <span className="id-photo">
        {p.photo ? <img src={p.photo} alt="" loading="lazy" decoding="async" /> : <span className="id-num-bg" aria-hidden="true">{p.number}</span>}
      </span>
      <span className="id-name">{p.name}</span>
      <span className="id-meta"><b>#{p.number}</b><span>{p.position}</span><span>{p.height}</span></span>
      <span className="id-div">{p.division}</span>
      <Chips p={p} />
    </>
  );
}

export function Roster() {
  const [filter, setFilter] = useState({ position: "", batch: "", division: "" });
  const [sel, setSel] = useState<Player | null>(null);
  const [shot, setShot] = useState(0);
  const dlg = useRef<HTMLDialogElement>(null);
  const all = site.roster;
  const list = all.filter((p) => KEYS.every((k) => !filter[k] || p[k] === filter[k]));
  const shots = sel ? [sel.photo, ...(sel.gallery ?? [])].filter((s): s is string => !!s) : [];
  const open = (p: Player) => { setSel(p); setShot(0); dlg.current?.showModal(); };

  return (
    <>
      <section id="roster" className="section" style={{ background: "var(--sec-b)" }}>
        <div className="container">
          <div className="tc sec-head">
            <p className="eyebrow r3">Player roster</p>
            <h2 className="display r3 d1">{all.length ? "Meet the squad" : "Earn your card"}</h2>
            <p className="sec-intro r3 d2">
              {all.length
                ? "Every FilAmElite player gets an athletic ID card. Filter by position, batch or division, then tap a card for the full profile."
                : "Every FilAmElite player gets an athletic ID card, stacked with the badges and medals they earn. Enroll, train and claim yours. Cards go public only with a parent's OK."}
            </p>
          </div>

          {all.length > 0 && (
            <div className="ros-filters r3">
              {KEYS.map((k) => (
                <label key={k}>
                  <span>{k}</span>
                  <select value={filter[k]} onChange={(e) => setFilter({ ...filter, [k]: e.target.value })}>
                    <option value="">All</option>
                    {[...new Set(all.map((p) => p[k]))].sort().map((v) => <option key={v}>{v}</option>)}
                  </select>
                </label>
              ))}
            </div>
          )}

          {all.length > 0 && (
          <p className="ros-count" role="status">
            {list.length ? `Showing ${list.length} of ${all.length} players` : "No players match those filters."}
          </p>
        )}

        <div className={all.length ? "id-grid" : "id-grid solo"}>
            {all.length === 0 && (
              <a className="id-card sample nx3d" href="#enroll">
                <CardBody p={site.rosterSample} />
                <span className="id-cta">Claim your card <ArrowRight aria-hidden="true" /></span>
              </a>
            )}
            {list.map((p) => (
              <button type="button" key={p.name + p.number} className="id-card nx3d" aria-haspopup="dialog" onClick={() => open(p)}>
                <CardBody p={p} />
              </button>
            ))}
            </div>

          <div className="earn">
            <p className="earn-h r3">Training badges · one for every clinic module you complete</p>
            <div className="earn-grid">
              {site.badges.map((b) => {
                const Icon = ART[b.art];
                return (
                  <div className="earn-tile nx3d" key={b.name}>
                    <span className="earn-ico"><Icon aria-hidden="true" /></span>
                    <strong>{b.name}</strong>
                    <small>{b.from}</small>
                  </div>
                );
              })}
            </div>
            <p className="earn-h r3">Tournament medals</p>
            <div className="earn-grid medals">
              {site.medals.map((m) => {
                const Icon = ART[m.art];
                return (
                  <div className="earn-tile nx3d" key={m.name}>
                    <span className="earn-ico"><Icon aria-hidden="true" /></span>
                    <strong>{m.name}</strong>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Outside the <section>: the scene reveal (opacity/transform on section children) must never touch it. */}
      <dialog
        ref={dlg}
        className="pdlg"
        aria-label={sel ? `${sel.name} profile` : "Player profile"}
        onClick={(e) => { if (e.target === dlg.current) dlg.current.close(); }}
        onClose={() => setSel(null)}
      >
        {sel && (
          <div className="pdlg-body">
            <button type="button" className="pdlg-x" aria-label="Close profile" onClick={() => dlg.current?.close()}><X aria-hidden="true" /></button>
            <div className="pdlg-media">
              {shots.length > 0 ? (
                <figure className="pdlg-main"><img src={shots[shot]} alt={`${sel.name}, photo ${shot + 1} of ${shots.length}`} decoding="async" /></figure>
              ) : (
                <div className="pdlg-main id-photo"><span className="id-num-bg" aria-hidden="true">{sel.number}</span></div>
              )}
              {shots.length > 1 && (
                <div className="pdlg-thumbs">
                  {shots.map((s, i) => (
                    <button type="button" key={s} aria-label={`Photo ${i + 1}`} aria-current={i === shot} onClick={() => setShot(i)}>
                      <img src={s} alt="" loading="lazy" decoding="async" />
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="pdlg-info">
              <p className="eyebrow">{site.sport} · {sel.batch}</p>
              <h3 className="display">{sel.name}</h3>
              <dl className="pdlg-stats">
                <div><dt>Number</dt><dd>#{sel.number}</dd></div>
                <div><dt>Position</dt><dd>{sel.position}</dd></div>
                <div><dt>Height</dt><dd>{sel.height}</dd></div>
                <div><dt>Division</dt><dd>{sel.division}</dd></div>
              </dl>
              <Chips p={sel} />
            </div>
          </div>
        )}
      </dialog>
    </>
  );
}
