"""Test scoreboard: scoreboard + phone scoring for DinkCut IO (formerly Highlight Studio IO), parked for a future version.

Pulled out of the app in v3.5 (it did not hold up at the court). Everything the v3.2-v3.4 scoreboard used lives here:
USA Pickleball scoring engine, the burned-in board renderer (Broadcast / Compact / Score call), the phone scoring
page on the venue WiFi, and the tap-to-rally clock alignment. Standalone: numpy, Pillow, imageio-ffmpeg only.

    python scoreboard.py        runs the self check

How to plug it back into ../source/dinkcut_io.py: see README.md in this folder.
"""
import datetime, functools, http.server, json, os, re, socket, subprocess, threading, time, urllib.parse
from pathlib import Path

import numpy as np
import imageio_ffmpeg
from PIL import Image, ImageDraw, ImageFont

FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()
NOWIN = subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0
SETTINGS = Path(os.environ.get("APPDATA") or Path.home()) / "HighlightStudioIO" / "settings.json"
SCORING = ("Side-out doubles", "Side-out singles", "Rally scoring")
SB_STYLES = ("Broadcast", "Compact", "Score call")
GAME_TO, SIDES = ("11", "15", "21"), ("Team A", "Team B")
SB_SOURCES = ("Phone at the court", "Tap after the match")
SB_DEFAULTS = dict(sb=False, sb_style="Broadcast", sb_fmt="Side-out doubles", sb_to="11", sb_first="Team A",
                   team_a="Team A", team_b="Team B", sb_server=True, sb_games=True, sb_src="Phone at the court")
SB_CHOICES = {"sb_style": SB_STYLES, "sb_fmt": SCORING, "sb_to": GAME_TO, "sb_first": SIDES, "sb_src": SB_SOURCES}

def lan_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("10.255.255.255", 1))           # picks the WiFi/LAN interface; nothing is sent
        return s.getsockname()[0]
    except OSError:
        return "127.0.0.1"
    finally:
        s.close()


# ---------------------------------------------------------------- points
def point_chains(hits, gap=2.5, active=None):
    """Every burst of hits closer than `gap` s, even a single one (a missed serve still decides a point): [(first, last, hits)]."""
    out = []
    for t in sorted(t for t in hits if active is None or active(t)):
        if out and t - out[-1][1] <= gap:
            out[-1] = (out[-1][0], t, out[-1][2] + 1)
        else:
            out.append((t, t, 1))
    return out


# ---------------------------------------------------------------- scoring + scoreboard
SB_RGB = dict(bg=(9, 9, 11, 248), line=(36, 36, 43, 255), field=(24, 24, 29, 255), ink=(244, 246, 246, 255),
              dim=(186, 189, 193, 255), muted=(142, 145, 150, 255), red=(232, 20, 20, 255), cyan=(95, 224, 224, 255))  # LINKMEIO

def score_states(winners, fmt=SCORING[0], to=11, first=0):
    """USA Pickleball scoring. winners: 0 (team A), 1 (team B) or None (not a point) per rally, in order.
    Returns (before, after) per rally; a state is dict(p=points, g=games, sv=serving team, sn=server number or 0, won=team|None).
    Side-out doubles starts 0-0-2 and only the serving team scores; a game is to `to`, win by 2;
    the team that received first serves first in the next game."""
    dbl = fmt == SCORING[0]
    p, g, sv, sn, opener = [0, 0], [0, 0], first, (2 if dbl else 0), first
    snap = lambda won=None: dict(p=p[:], g=g[:], sv=sv, sn=sn, won=won)
    out = []
    for w in winners:
        before = snap()
        if w is not None:
            if fmt == SCORING[2] or w == sv:      # rally scoring: every rally scores; side-out: only the serving team
                p[w] += 1
                sv = w
            elif dbl and sn == 1:
                sn = 2
            else:
                sv, sn = w, (1 if dbl else 0)
        if w is not None and p[w] >= to and p[w] - p[1 - w] >= 2:
            g[w] += 1
            after = snap(won=w)
            opener = 1 - opener
            p, sv, sn = [0, 0], opener, (2 if dbl else 0)
        else:
            after = snap()
        out.append((before, after))
    return out

def score_call(st):
    """What the server says before serving: server score, receiver score, server number (doubles side-out)."""
    return f"{st['p'][st['sv']]}-{st['p'][1 - st['sv']]}" + (f"-{st['sn']}" if st["sn"] else "")

def score_timeline(chains, states, a, b):
    """[(t0, t1, state)] for the video span a..b, relative to a: a rally shows the score it is played at
    (from 1 s before its first hit), then the new score from its last hit on."""
    if not states:
        return []
    marks = [m for (s, e, _), (before, after) in zip(chains, states) for m in ((s - 1.0, before), (e, after))]
    cur = states[0][0]
    for t, st in marks:
        if t <= a:
            cur = st
    out, t0 = [], a
    for t, st in marks:
        if a < t < b and st != cur:
            out.append((t0 - a, t - a, cur))
            t0, cur = t, st
    return out + [(t0 - a, b - a, cur)]

@functools.lru_cache(maxsize=None)
def sb_font(size, bold=False):
    for name, var in (("bahnschrift.ttf", "Bold" if bold else "Regular"), ("segoeuib.ttf" if bold else "segoeui.ttf", None),
                      ("arialbd.ttf" if bold else "arial.ttf", None)):
        try:
            f = ImageFont.truetype(name, size)
            if var:
                f.set_variation_by_name(var)
            return f
        except OSError:
            continue
    return ImageFont.load_default(size)

def scoreboard_png(st, sb, W, H):
    """One score, drawn on a transparent canvas for a W x H video. The canvas size depends only on the settings,
    never on the score, so every frame of the scoreboard lines up."""
    C, u = SB_RGB, max(10, round(min(H / 50, W / 32)))
    names, style = sb["names"], sb["style"]
    sn = st["sn"] if sb["server"] else 0
    fn, fb, fs, fbig = sb_font(round(u * 0.9)), sb_font(round(u * 1.15), True), sb_font(round(u * 0.6), True), sb_font(round(u * 1.9), True)
    L = lambda f, t: f.getlength(t)
    pad, r = round(u * 0.6), round(u * 0.4)
    won, sv = st["won"], st["sv"]

    if style == "Broadcast":
        rh, bar, sw = round(u * 1.9), max(3, round(u * 0.26)), round(u * 2.2)
        dot, gw = round(u * 0.9), (round(u * 1.4) if sb["games"] else 0)
        nw = max(L(fn, n) for n in names)
        w = int(bar + pad + nw + pad + dot + gw + sw)
        chips = [f"{k} SERVER · GAME TO {sb['to']}" for k in ("1ST", "2ND")] + [f"GAME TO {sb['to']}"] + [f"GAME · {n.upper()}" for n in names]
        cw = int(max(L(fs, c) for c in chips) + 2 * pad)
        ch = round(u * 1.2)
        im = Image.new("RGBA", (max(w, cw), 2 * rh + round(u * 0.3) + ch), (0, 0, 0, 0))
        panel = Image.new("RGBA", (w, 2 * rh), C["bg"])
        d = ImageDraw.Draw(panel)
        for i in (0, 1):
            y = i * rh
            if i:
                d.line([(0, y), (w, y)], fill=C["line"], width=1)
            if sv == i and won is None:
                d.rectangle([0, y, bar - 1, y + rh], fill=C["red"])
                cx = bar + pad + nw + pad + dot / 2
                d.ellipse([cx - u * 0.22, y + rh / 2 - u * 0.22, cx + u * 0.22, y + rh / 2 + u * 0.22], fill=C["cyan"])
            d.text((bar + pad, y + rh / 2), names[i], font=fn, fill=C["ink"] if sv == i else C["dim"], anchor="lm")
            if gw:
                d.text((w - sw - gw / 2, y + rh / 2), str(st["g"][i]), font=fn, fill=C["muted"], anchor="mm")
            d.rectangle([w - sw, y + (1 if i else 0), w, y + rh], fill=C["red"] if won == i else C["field"])
            d.text((w - sw / 2, y + rh / 2), str(st["p"][i]), font=fb, fill=C["ink"], anchor="mm")
        mask = Image.new("L", panel.size, 0)
        ImageDraw.Draw(mask).rounded_rectangle([0, 0, w - 1, 2 * rh - 1], r, fill=255)
        im.paste(panel, (0, 0), mask)
        ImageDraw.Draw(im).rounded_rectangle([0, 0, w - 1, 2 * rh - 1], r, outline=C["line"])
        chip = (f"GAME · {names[won].upper()}" if won is not None else
                f"{'1ST' if sn == 1 else '2ND'} SERVER · GAME TO {sb['to']}" if sn else f"GAME TO {sb['to']}")
        y0 = 2 * rh + round(u * 0.3)
        d = ImageDraw.Draw(im)
        d.rounded_rectangle([0, y0, L(fs, chip) + 2 * pad, y0 + ch], round(r * 0.8), fill=C["red"] if won is not None else C["bg"],
                            outline=C["line"])
        d.text((pad, y0 + ch / 2), chip, font=fs, fill=C["ink"] if won is not None else C["cyan"], anchor="lm")
        return im

    if style == "Compact":
        h, bw, gap = round(u * 1.7), round(u * 1.6), round(u * 0.45)
        extra = [f"S{sn}" if sn else "", f"G {st['g'][0]}-{st['g'][1]}" if sb["games"] else ""]
        ew = [max(L(fs, "S2"), 0) if sb["server"] and sb.get("fmt", SCORING[0]) == SCORING[0] else 0, L(fs, "G 8-8") if sb["games"] else 0]
        w = int(pad + L(fn, names[0]) + gap + bw + gap + L(fn, "–") + gap + bw + gap + L(fn, names[1]) + sum(e + gap for e in ew if e) + pad)
        im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        d = ImageDraw.Draw(im)
        d.rounded_rectangle([0, 0, w - 1, h - 1], r, fill=C["bg"], outline=C["line"])
        x, cy = pad, h / 2
        def box(i):
            nonlocal x
            on = (won == i) or (won is None and sv == i)
            d.rounded_rectangle([x, cy - u * 0.62, x + bw, cy + u * 0.62], round(r * 0.6), fill=C["red"] if on else C["field"])
            d.text((x + bw / 2, cy), str(st["p"][i]), font=fb, fill=C["ink"], anchor="mm")
            x += bw + gap
        d.text((x, cy), names[0], font=fn, fill=C["ink"] if sv == 0 else C["dim"], anchor="lm"); x += L(fn, names[0]) + gap
        box(0)
        d.text((x, cy), "–", font=fn, fill=C["muted"], anchor="lm"); x += L(fn, "–") + gap
        box(1)
        d.text((x, cy), names[1], font=fn, fill=C["ink"] if sv == 1 else C["dim"], anchor="lm"); x += L(fn, names[1]) + gap
        for t, e, col in zip(extra, ew, (C["cyan"], C["muted"])):
            if e:
                d.text((x, cy), t, font=fs, fill=col, anchor="lm"); x += e + gap
        return im

    # Score call: the spoken call, big
    tag = f"GAME · {names[won].upper()}" if won is not None else "SCORE"
    call = f"{st['p'][won]}-{st['p'][1 - won]}" if won is not None else score_call(dict(st, sn=sn))
    sub_ = lambda n: f"{n} serving" + (f" · games {st['g'][0]}-{st['g'][1]}" if sb["games"] else "")
    w = int(2 * pad + max(L(fbig, "88-88-8"), L(fs, f"GAME · {max(names, key=len).upper()}"),
                          u * 0.7 + max(L(fn, sub_(n)) for n in names)))
    th, bh, sh_ = round(u * 0.95), round(u * 2.2), round(u * 1.2)
    im = Image.new("RGBA", (w, pad + th + bh + sh_ + round(pad * 0.7)), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle([0, 0, w - 1, im.height - 1], r, fill=C["bg"], outline=C["line"])
    d.text((pad, pad + th / 2), tag, font=fs, fill=C["red"] if won is not None else C["muted"], anchor="lm")
    d.text((pad, pad + th + bh / 2), call, font=fbig, fill=C["ink"], anchor="lm")
    y = pad + th + bh + sh_ / 2
    d.ellipse([pad, y - u * 0.2, pad + u * 0.4, y + u * 0.2], fill=C["red"])
    d.text((pad + u * 0.7, y), sub_(names[sv] if won is None else names[won]).replace("serving", "serving" if won is None else "won"),
           font=fn, fill=C["cyan"], anchor="lm")
    return im

def board_input(tmp, tag, timeline, sb, W, H):
    """The scoreboard for one stretch of video as a still-image track: ffmpeg input args for a concat list."""
    files, lines = {}, []
    for t0, t1, st in timeline:
        key = json.dumps(st, sort_keys=True)
        if key not in files:
            files[key] = Path(tmp) / f"{tag}-sb{len(files):03d}.png"
            scoreboard_png(st, sb, W, H).save(files[key])
        lines.append(f"file '{files[key].as_posix()}'\nduration {max(t1 - t0, 0.04):.3f}\n")
    lines.append(f"file '{files[key].as_posix()}'\n")        # concat keeps the last duration only if the file repeats
    lst = Path(tmp) / f"{tag}-sb.txt"
    lst.write_text("".join(lines))
    return ["-f", "concat", "-safe", "0", "-i", str(lst)]

def overlays(tmp, tag, vf, W, H, vertical, logo=None, sb=None, timeline=None):
    """ffmpeg inputs and filters: the video, the logo small at the bottom right, the scoreboard at the bottom left."""
    if not logo and not timeline:
        return ["-vf", vf, "-map", "0:v:0", "-map", "0:a?"]
    m, ins, graph, last, idx = round(H * 0.03), [], [f"[0:v]{vf}[v0]"], "v0", 1
    if logo:
        ins += ["-i", str(logo)]
        graph.append(f"[{idx}:v]scale={round(W * (0.2 if vertical else 0.1))}:-1[lg];[{last}][lg]overlay=W-w-{m}:H-h-{m}[v1]")
        last, idx = "v1", idx + 1
    if timeline:
        ins += board_input(tmp, tag, timeline, sb, W, H)
        graph.append(f"[{last}][{idx}:v]overlay={m}:H-h-{m}:eof_action=repeat[v2]")
        last = "v2"
    return ins + ["-filter_complex", ";".join(graph), "-map", f"[{last}]", "-map", "0:a?"]

def sb_settings(opt):
    return dict(style=opt["sb_style"], fmt=opt["sb_fmt"], to=int(opt["sb_to"]), server=opt["sb_server"], games=opt["sb_games"],
                first=SIDES.index(opt["sb_first"]),
                names=((opt["team_a"] or "Team A").strip()[:18], (opt["team_b"] or "Team B").strip()[:18]))

# ---------------------------------------------------------------- phone scoring at the court
TAPS_FILE, SCORE_PORT = SETTINGS.parent / "taps.json", 8900

class Taps:
    """Rally results tapped on phones during play, stamped with this PC's clock, kept on disk so a restart loses nothing.
    An item is {"t", "court", "team": 0|1} or a new-match marker {"t", "court", "new": True}."""
    def __init__(self, path=TAPS_FILE):
        self.path, self.lock = Path(path), threading.Lock()
        try:
            self.items = json.loads(self.path.read_text())
        except (OSError, ValueError):
            self.items = []
    def _save(self):
        try:
            self.path.parent.mkdir(parents=True, exist_ok=True)
            self.path.write_text(json.dumps(self.items[-20000:]))
        except OSError:
            pass
    def add(self, court, team=None, t=None):
        with self.lock:
            self.items.append(dict(t=round(t or time.time(), 2), court=court, **({"team": team} if team is not None else {"new": True})))
            self._save()
    def undo(self, court):
        with self.lock:
            for i in range(len(self.items) - 1, -1, -1):
                if self.items[i]["court"] == court and "team" in self.items[i]:
                    del self.items[i]
                    break
            self._save()
    def match(self, court, t0=None, t1=None):
        """This court's taps from its last new-match marker before t0 (default: now) up to t1, markers included."""
        with self.lock:
            mine = [x for x in self.items if court is None or x["court"] == court]
        t0 = time.time() if t0 is None else t0
        marks = [x["t"] for x in mine if x.get("new") and x["t"] <= t0]
        begin = max(marks + [t0 - 3 * 3600])
        return [x for x in mine if begin <= x["t"] <= (t1 or float("inf"))]

def split_games(items):
    """Groups of taps between new-match markers."""
    out = [[]]
    for x in items:
        if x.get("new"):
            out.append([])
        else:
            out[-1].append(x)
    return [g for g in out if g]

def live_state(taps, sb, court):
    """What a phone at the court shows after each tap."""
    groups = split_games(taps.match(court))
    ws = [x["team"] for x in groups[-1]] if groups else []
    st = score_states(ws, sb["fmt"], sb["to"], sb["first"])
    cur = st[-1][1] if st else dict(p=[0, 0], g=[0, 0], sv=sb["first"], sn=2 if sb["fmt"] == SCORING[0] else 0, won=None)
    w = cur["won"]
    return dict(names=sb["names"], p=cur["p"], g=cur["g"], sv=cur["sv"], sn=cur["sn"], won=w, taps=len(ws),
                call=f"{cur['p'][w]}-{cur['p'][1 - w]}" if w is not None else score_call(cur))

def recording_starts(path, dur):
    """Candidate wall-clock starts: file time minus length (camera writing to this PC), and the container's creation time."""
    out = [Path(path).stat().st_mtime - dur]
    err = subprocess.run([FFMPEG, "-hide_banner", "-i", str(path)], capture_output=True, text=True, creationflags=NOWIN).stderr
    m = re.search(r"creation_time\s*:\s*(\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d)", err)
    if m:
        out.append(datetime.datetime.fromisoformat(m[1]).replace(tzinfo=datetime.timezone.utc).timestamp())
    return out

def align_shift(vts, ends, window=600, after=20.0):
    """Clocks drift, so try shifts within +-window s and keep the one that lands the most taps 0-`after` s after a
    rally end (players tap just after the point). Returns (shift, taps matched)."""
    if not len(vts) or not len(ends):
        return 0.0, 0
    vts, ends = np.asarray(vts, float), np.sort(np.asarray(ends, float))
    best = None
    for sh in np.arange(-window, window + 0.5, 0.5):
        v = vts + sh
        i = np.searchsorted(ends, v, side="right") - 1
        gap = v - ends[np.clip(i, 0, None)]
        ok = (i >= 0) & (gap >= 0) & (gap <= after)
        key = (int(ok.sum()), -float(gap[ok].sum()))     # most taps matched, then the quickest taps after the point
        if best is None or key > best[0]:
            best = (key, float(sh))
    return best[1], best[0][0]

def court_of(name):
    m = re.search(r"court\s*[-_#]?\s*(\d+)", name, re.I)
    return int(m[1]) if m else None

def phone_board(src, dur, chains, opt, log, taps):
    """Scoreboard from phone taps made during this recording. Returns (board, winners) or None."""
    court, ends = court_of(Path(src).name), [e for _, e, _ in chains]
    best = None
    for start in recording_starts(src, dur):
        items = taps.match(court, start, start + dur + 900)
        pts = [x for x in items if "team" in x]
        inside = [x["t"] - start for x in pts if -900 <= x["t"] - start <= dur + 900]
        if not pts or not inside:
            continue
        sh, n = align_shift(inside, ends)
        if best is None or n > best[0]:
            best = (n, start - sh, items)
    if not best:
        log(f"No phone taps found for this match{f' on court {court}' if court else ''}, so it is saved without a scoreboard.")
        return None
    n, start, items = best
    sb, chains_, winners, states = sb_settings(opt), [], [], []
    for g in split_games(items):
        for x in g:
            vt = x["t"] - start
            prev = [e for e in ends if 0 <= vt - e <= 20]
            t = (prev[-1] + 0.2) if prev else vt                     # the board changes as the point ends, not at the tap
            chains_.append((t, t, 1))
            winners.append(x["team"])
        states += score_states([x["team"] for x in g], sb["fmt"], sb["to"], sb["first"])
    log(f"Phone scoring: {len(winners)} taps, {n} lined up with rally ends. Final: {final_line(states, sb)}.")
    return (sb, chains_, states), winners

SCORE_PAGE = """<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,user-scalable=no">
<title>Score · Highlight Studio IO</title><style>
body{margin:0;background:#0c0e0b;color:#f3f6ee;font:16px 'Segoe UI',system-ui,sans-serif;padding:18px;max-width:520px;margin:auto}
header{display:flex;justify-content:space-between;align-items:center}h1{font-size:18px;margin:0}
select{background:#1e231c;color:#f3f6ee;border:1px solid #272d24;border-radius:10px;padding:8px;font-size:16px}
.board{background:#171b15;border:1px solid #272d24;border-radius:18px;padding:16px;margin:16px 0}
.call{font:700 56px Bahnschrift,'Segoe UI',sans-serif;text-align:center;margin:4px 0 10px}
.row{display:flex;justify-content:space-between;align-items:center;padding:8px 4px;border-top:1px solid #272d24;font-size:18px}
.row b{font-size:26px}.srv{color:#6fe3c1;font-size:13px}.muted{color:#8f978a;font-size:13px;text-align:center}
button{width:100%;border:0;border-radius:18px;font:700 22px 'Segoe UI',sans-serif;padding:26px 10px;margin:8px 0;touch-action:manipulation}
.a{background:#c7f23d;color:#10140c}.b{background:#6fe3c1;color:#10140c}
.small{display:flex;gap:10px}.small button{font-size:15px;padding:14px;background:#1e231c;color:#f3f6ee;border:1px solid #272d24}
</style><header><h1>Playhouse Pickle</h1><select id="court"></select></header>
<div class="board"><div class="muted" id="tag">SCORE</div><div class="call" id="call">0-0-2</div>
<div class="row"><span id="n0">Team A</span><span><span class="srv" id="s0"></span> <b id="p0">0</b></span></div>
<div class="row"><span id="n1">Team B</span><span><span class="srv" id="s1"></span> <b id="p1">0</b></span></div></div>
<button class="a" id="w0">Team A won the rally</button><button class="b" id="w1">Team B won the rally</button>
<div class="small"><button id="undo">Undo last</button><button id="new">New match</button></div>
<p class="muted">Tap after every rally, including faults. The app lines each tap up with the video.</p>
<script>
const $=id=>document.getElementById(id);let court=1;try{court=+localStorage.getItem('court')||1}catch(e){}
for(let i=1;i<=6;i++){const o=document.createElement('option');o.value=i;o.textContent='Court '+i;if(i===court)o.selected=true;$('court').append(o)}
$('court').onchange=e=>{court=+e.target.value;try{localStorage.setItem('court',court)}catch(e){}load()};
function show(s){$('call').textContent=s.call;$('tag').textContent=s.won===null?'SCORE · '+s.taps+' rallies':'GAME · '+s.names[s.won];
for(const i of [0,1]){$('n'+i).textContent=s.names[i]+(s.g[0]+s.g[1]?' ('+s.g[i]+')':'');$('p'+i).textContent=s.p[i];
$('s'+i).textContent=s.won===null&&s.sv===i?(s.sn?'serving · '+(s.sn===1?'1st':'2nd'):'serving'):'';$('w'+i).textContent=s.names[i]+' won the rally'}}
async function go(path){try{const r=await fetch(path+'?court='+court,{method:path==='/state'?'GET':'POST',cache:'no-store'});show(await r.json())}catch(e){$('tag').textContent='Not connected: is the app open?'}}
const load=()=>go('/state');$('w0').onclick=()=>go('/tap/0');$('w1').onclick=()=>go('/tap/1');$('undo').onclick=()=>go('/undo');
$('new').onclick=()=>{if(confirm('Start a new match on court '+court+'? The score goes back to 0-0-2.'))go('/new')};load();setInterval(load,2000);
</script>"""

class ScoreServer:
    """The phone scoring page on the venue WiFi. `live` holds the scoreboard settings, refreshed by the app."""
    def __init__(self, taps, live, port=SCORE_PORT):
        class H(http.server.BaseHTTPRequestHandler):
            def log_message(self, *a):
                pass
            def reply(self, body, ctype="application/json", code=200):
                b = body.encode("utf-8")
                self.send_response(code)
                self.send_header("Content-Type", ctype + "; charset=utf-8")
                self.send_header("Cache-Control", "no-store")
                self.send_header("Content-Length", str(len(b)))
                self.end_headers()
                self.wfile.write(b)
            def route(self, post):
                u = urllib.parse.urlparse(self.path)
                try:
                    court = min(9, max(1, int(urllib.parse.parse_qs(u.query).get("court", ["1"])[0])))
                except ValueError:
                    return self.reply('{"error": "bad court"}', code=400)
                if not post:
                    return self.reply(SCORE_PAGE, "text/html") if u.path in ("/", "/index.html") else \
                        self.reply(json.dumps(live_state(taps, live["sb"], court))) if u.path == "/state" else self.reply("{}", code=404)
                if u.path in ("/tap/0", "/tap/1"):
                    taps.add(court, int(u.path[-1]))
                elif u.path == "/undo":
                    taps.undo(court)
                elif u.path == "/new":
                    taps.add(court)
                else:
                    return self.reply("{}", code=404)
                self.reply(json.dumps(live_state(taps, live["sb"], court)))
            def do_GET(self):
                self.route(False)
            def do_POST(self):
                self.route(True)
        self.httpd = None
        for p in range(port, port + 10):
            try:
                self.httpd = http.server.ThreadingHTTPServer(("0.0.0.0", p), H)
                break
            except OSError:
                continue
        if self.httpd:
            threading.Thread(target=self.httpd.serve_forever, daemon=True).start()
    @property
    def url(self):
        return f"http://{lan_ip()}:{self.httpd.server_address[1]}/" if self.httpd else ""
    def stop(self):
        if self.httpd:
            self.httpd.shutdown()
            self.httpd.server_close()

def final_line(states, sb):
    st = states[-1][1]
    return f"{sb['names'][0]} {st['p'][0]} - {st['p'][1]} {sb['names'][1]}, games {st['g'][0]}-{st['g'][1]}"


# ---------------------------------------------------------------- self check
def selftest():
    # scoring: USA Pickleball side-out doubles starts 0-0-2; a lost rally by server 2 is a side-out
    call = lambda ws, fmt=SCORING[0], to=11: score_call(score_states(ws, fmt, to)[-1][1])
    assert call([1]) == "0-0-1"                                     # 0-0-2 loses: side out, B's first server
    assert call([1, 1]) == "1-0-1" and call([1, 1, 0]) == "1-0-2"   # B scores; then B's server 1 loses
    assert call([1, 1, 0, 0]) == "0-1-1"                            # B's server 2 loses: side out to A
    assert call([0, 0, None, 1], SCORING[1]) == "0-2"               # singles: stray sound ignored, loss = side out
    assert call([1, 0, 0], SCORING[2]) == "2-1"                     # rally scoring: every rally scores, winner serves
    rs = score_states([0] * 10 + [1] * 10 + [0, 0], SCORING[2], 11)
    assert rs[20][1]["won"] is None and rs[21][1]["won"] == 0 and rs[21][1]["p"] == [12, 10]   # win by 2
    assert rs[21][1]["g"] == [1, 0] and score_states([0] * 11 + [None], SCORING[2])[-1][0]["p"] == [0, 0]  # next game resets
    tl = score_timeline([(10, 12, 3), (20, 25, 4)], score_states([0, 1], SCORING[2]), 8, 30)
    assert [round(t, 1) for t, _, _ in tl] == [0, 4, 17] and tl[-1][2]["p"] == [1, 1]
    sbs = dict(style="Broadcast", fmt=SCORING[0], to=11, server=True, games=True, names=("Team A", "Team B"))
    for style in SB_STYLES:
        sizes = {scoreboard_png(st, dict(sbs, style=style), 1920, 1080).size for pair in score_states([0, 1, 1, 0] * 6) for st in pair}
        assert len(sizes) == 1, (style, sizes)                      # every score draws on the same canvas
    # phone taps: a PC clock 90 s ahead is corrected by lining taps up with rally ends
    sh, n = align_shift([13 + 90, 20 + 90, 31 + 90, 52 + 90], [11.4, 18.0, 29.5, 35.0, 49.8])
    assert -92 <= sh <= -89 and n == 4, (sh, n)
    assert court_of("Court 2 - Sep 24 7PM.mp4") == 2 and court_of("match.mp4") is None
    assert [len(g) for g in split_games([{"team": 0}, {"new": True}, {"team": 1}, {"team": 0}])] == [1, 2]
    assert point_chains([1, 2, 10, 30, 31], 2.5) == [(1, 2, 2), (10, 10, 1), (30, 31, 2)]
    assert set(SB_DEFAULTS) >= set(SB_CHOICES) and all(SB_DEFAULTS[k] in SB_CHOICES[k] for k in SB_CHOICES)
    print("scoreboard selftest ok")

if __name__ == "__main__":
    selftest()
