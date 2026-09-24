"""Highlight Studio IO v3.4 · © 2026 LINKMEIO. All rights reserved.

Automatic pickleball highlights, licensed to Playhouse Pickle. Finds the rallies in a match video
(paddle "pop" sounds + on-court motion), then exports one highlights video with every rally, the
longest rally, the full game and/or one clip per rally, and shares them by QR code on the venue WiFi.

    python highlight_cutter.py                      desktop app
    python highlight_cutter.py --cli match.mp4      command line (see --help)
    python highlight_cutter.py --selftest           quick logic check
"""
import argparse, datetime, functools, http.server, json, os, queue, re, socket, subprocess, sys, tempfile, threading, time, urllib.parse
from pathlib import Path

import numpy as np
import imageio_ffmpeg
from PIL import Image, ImageDraw, ImageFont

APP, VERSION, OWNER = "Highlight Studio IO", "3.4", "LINKMEIO"
FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()          # bundled ffmpeg, nothing to install
NOWIN = subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0
VIDEO_EXT = {".mp4", ".mov", ".mkv", ".avi", ".m4v"}
FMT = {"MP4 · iPhone + Android": "libx264", "HEVC · smaller": "libx265", "Camera copy": "copy"}   # the first plays everywhere
RES = {"Original": None, "1080p": 1080, "720p": 720, "480p": 480}
FPS = {"Original": None, "30": 30, "60": 60}
CRF = {"High": 18, "Standard": 23, "Small file": 28}
REEL_MODES = ("All rallies", "Best rallies")
WATERMARKS = ("Playhouse logo", "Custom PNG", "None")
SCORING = ("Side-out doubles", "Side-out singles", "Rally scoring")
SB_STYLES = ("Broadcast", "Compact", "Score call")
GAME_TO, SIDES = ("11", "15", "21"), ("Team A", "Team B")
SB_SOURCES = ("Phone at the court", "Tap after the match")
CHOICES = {"fmt": FMT, "res": RES, "fps": FPS, "quality": CRF, "reel_mode": REEL_MODES, "wm": WATERMARKS,
           "sb_style": SB_STYLES, "sb_fmt": SCORING, "sb_to": GAME_TO, "sb_first": SIDES, "sb_src": SB_SOURCES}
DEFAULTS = dict(fmt="MP4 · iPhone + Android", res="1080p", fps="30", quality="Standard",       # = the Recommended preset
                reel=True, reel_mode="All rallies", top=8, longest=True, full=True, clips=False, vertical=True,
                wm="Playhouse logo", logo="", sensitivity=6, min_hits=3, gap=2.5, pre=1.8, post=1.2, motion=True, inset=5,
                sb=False, sb_style="Broadcast", sb_fmt="Side-out doubles", sb_to="11", sb_first="Team A",
                team_a="Team A", team_b="Team B", sb_server=True, sb_games=True, sb_src="Phone at the court")
PRESETS = {
    "Recommended": {k: DEFAULTS[k] for k in ("fmt", "res", "fps", "quality", "reel", "reel_mode", "longest", "full", "clips", "vertical", "wm")},
    "Social highlights": dict(reel=True, reel_mode="Best rallies", top=5, longest=True, full=False, clips=False, vertical=True,
                              fmt="MP4 · iPhone + Android", res="1080p", fps="30", quality="High", wm="Playhouse logo"),
    "Full game only": dict(reel=False, longest=False, full=True, clips=False, fmt="Camera copy"),
}
DETECT_HELP = {
    "Sensitivity": "How sharp a sound must be to count as a paddle hit. Higher finds more hits: use it for soft paddles "
                   "or a camera far from the court. Lower ignores more noise: use it if claps, shoes or music get counted. "
                   "Recommended: 6.",
    "Min hits": "How many paddle hits make a rally. Shorter exchanges, like a serve straight into the net, are left out. "
                "Raise it to keep only longer rallies. Recommended: 3.",
    "Max gap (s)": "The longest pause between two hits that still counts as the same rally. A longer pause starts a new "
                   "rally. Raise it for slow dinking games; lower it if two points get joined into one. Recommended: 2.5 s.",
    "Pre-roll (s)": "Seconds kept before the first hit, so the serve and set-up are in the video. Recommended: 1.8 s.",
    "Post-roll (s)": "Seconds kept after the last hit, so the winning shot and the reaction are in the video. "
                     "Recommended: 1.2 s.",
    "Ignore edges %": "How much of the picture's border to ignore when checking for court movement. Raise it if people "
                      "walking past the edges, or the next court, keep a rally going. Recommended: 5%.",
    "Court motion": "Only counts a hit when players are moving on this court at that moment. This filters out sounds from "
                    "the next court and music. Turn it off if rallies go missing on a camera angle that shows little "
                    "movement. With no usable sound, the app uses movement alone.",
}
PRESET_NOTES = {"Recommended": "Every rally in one video, the longest rally and the full game. 1080p MP4 for iPhone and Android.",
                "Social highlights": "The 5 best rallies as a vertical reel plus the longest rally, high quality for Reels and TikTok.",
                "Full game only": "Just the full match, copied instantly with no re-encoding.",
                "Custom": "Your own mix of the settings below."}


# ---------------------------------------------------------------- ffmpeg helpers
def ff(args, dur=None, prog=None):
    """Run ffmpeg. With dur + prog, report 0..1 progress from ffmpeg's -progress stream."""
    live = bool(prog and dur)
    cmd = [FFMPEG, "-hide_banner", "-loglevel", "error", "-y", *(["-progress", "pipe:1", "-nostats"] if live else []), *args]
    with tempfile.TemporaryFile() as errf:          # a file, not a pipe: damaged footage can print MBs of errors
        p = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=errf, text=True, creationflags=NOWIN)
        if live:
            for line in p.stdout:
                if line.startswith(("out_time_us=", "out_time_ms=")):     # both are microseconds
                    try:
                        prog(min(1.0, int(line.split("=")[1]) / 1e6 / dur))
                    except ValueError:
                        pass
        p.communicate()
        if p.returncode:
            errf.seek(0)
            err = errf.read().decode("utf-8", "replace")
            raise RuntimeError("ffmpeg: " + (err.strip().splitlines() or ["failed"])[-1])

def encoder(vs):
    """Output args. Default = the universal file: H.264 High, 8-bit 4:2:0, AAC-LC 48 kHz stereo, moov first.
    The reel always re-encodes, so "copy" falls back to H.264 there."""
    codec = "libx264" if vs["fmt"] == "copy" else vs["fmt"]
    h265 = codec == "libx265"
    return ["-c:v", codec, "-preset", "veryfast", "-crf", str(vs["crf"] + (4 if h265 else 0)),   # x265 matches x264 at ~+4 CRF
            *([] if h265 else ["-profile:v", "high"]),                                             # High profile: every iPhone since 2013
            "-pix_fmt", "yuv420p", *(["-tag:v", "hvc1"] if h265 else []),                        # hvc1: iPhones play HEVC
            "-c:a", "aac", "-b:a", "160k", "-ar", "48000", "-ac", "2", "-movflags", "+faststart"]

def vfilter(vs, height=None, first=""):
    """crop (optional) -> scale down to height (never up) -> frame rate."""
    parts = [first] if first else []
    h = height or vs["res"]
    if h:
        parts.append(f"scale=-2:min(ih\\,{h})")
    if vs["fps"]:
        parts.append(f"fps={vs['fps']}")
    return ",".join(parts) or "null"

def duration_of(path):
    err = subprocess.run([FFMPEG, "-hide_banner", "-i", str(path)], capture_output=True, text=True,
                         creationflags=NOWIN).stderr
    m = re.search(r"Duration: (\d+):(\d+):([\d.]+)", err)
    return int(m[1]) * 3600 + int(m[2]) * 60 + float(m[3]) if m else 0.0

def video_size(path):
    err = subprocess.run([FFMPEG, "-hide_banner", "-i", str(path)], capture_output=True, text=True,
                         creationflags=NOWIN).stderr
    m = re.search(r"Video:.*?(\d{2,5})x(\d{2,5})", err)
    return (int(m[1]), int(m[2])) if m else (1920, 1080)

CROP_9_16 = "crop=min(iw\\,trunc(ih*9/16/2)*2):min(ih\\,trunc(iw*16/9/2)*2)"

def out_size(src_wh, vs, vertical):
    """Frame size after the 9:16 crop (when vertical) and the never-upscaling scale."""
    sw, sh = src_wh
    cw, ch = (min(sw, int(sh * 9 / 16 / 2) * 2), min(sh, int(sw * 16 / 9 / 2) * 2)) if vertical else (sw, sh)
    h = min(vs["res"] or ch, ch)
    return round(cw * h / ch / 2) * 2, h

SETTINGS = Path(os.environ.get("APPDATA") or Path.home()) / "HighlightStudioIO" / "settings.json"

def load_settings():
    try:
        return json.loads(SETTINGS.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {}

def save_settings(d):
    try:
        SETTINGS.parent.mkdir(parents=True, exist_ok=True)
        SETTINGS.write_text(json.dumps(d, indent=2), encoding="utf-8")
    except OSError:
        pass


# ---------------------------------------------------------------- detection
def audio_hits(path, sensitivity=6, sr=16000):
    """Times (s) of sharp 1-4 kHz onsets: the paddle 'pop'. sensitivity 1 (strict) .. 10 (loose)."""
    raw = subprocess.run([FFMPEG, "-hide_banner", "-loglevel", "error", "-i", str(path), "-vn", "-ac", "1",
                          "-ar", str(sr), "-f", "s16le", "-"], capture_output=True, creationflags=NOWIN).stdout
    x = np.frombuffer(raw, np.int16).astype(np.float32) / 32768
    if x.size < sr:
        return []
    n, hop = 512, 160
    band = (np.fft.rfftfreq(n, 1 / sr) >= 1000) & (np.fft.rfftfreq(n, 1 / sr) <= 4000)
    frames, win = np.lib.stride_tricks.sliding_window_view(x, n)[::hop], np.hanning(n).astype(np.float32)
    energy = np.concatenate([(np.abs(np.fft.rfft(frames[i:i + 20000] * win, axis=1))[:, band] ** 2).sum(1)
                             for i in range(0, len(frames), 20000)])   # chunked: an hour of audio stays small
    loge = np.log10(energy + 1e-9)
    rise = loge - np.concatenate([np.full(3, loge[0]), loge[:-3]])     # jump over 30 ms: a pop is sudden
    med = np.median(rise)
    thr = med + (13 - sensitivity) * 1.4826 * (np.median(np.abs(rise - med)) + 1e-9)
    loud = loge > np.percentile(loge, 50)
    hits, last, spacing = [], -10**9, int(0.15 * sr / hop)
    for i in np.flatnonzero((rise > thr) & loud):
        if i - last >= spacing:
            hits.append(i * hop / sr)
            last = i
    return hits

def motion_curve(path, fps=5, inset=0.05, dur=0.0, prog=None):
    """Mean frame difference inside the court area (edges trimmed by `inset`), sampled at `fps`."""
    w, h = 160, 90
    p = subprocess.Popen([FFMPEG, "-hide_banner", "-loglevel", "error", "-i", str(path), "-an", "-vf",
                          f"fps={fps},scale={w}:{h},format=gray", "-f", "rawvideo", "-"],
                         stdout=subprocess.PIPE, creationflags=NOWIN)
    x0, y0, prev, vals = int(w * inset), int(h * inset), None, []
    while len(buf := p.stdout.read(w * h)) == w * h:
        f = np.frombuffer(buf, np.uint8).reshape(h, w)[y0:h - y0, x0:w - x0].astype(np.int16)
        vals.append(0.0 if prev is None else float(np.abs(f - prev).mean()))
        prev = f
        if prog and dur and len(vals) % 25 == 0:
            prog(min(1.0, len(vals) / (dur * fps)))
    p.wait()
    return np.array(vals), fps

def motion_peaks(curve, fps):
    """Fallback when a video has no usable audio: bursts of strong movement stand in for hits."""
    thr, out, last = np.percentile(curve, 75), [], -10**9
    for i in np.flatnonzero(curve > thr):
        if i - last >= 0.4 * fps:
            out.append(i / fps)
            last = i
    return out

def make_active(curve, fps, floor_pct=20):
    """True when something is moving on court within 1 s of t (filters hits from the next court or music).
    ponytail: percentile floor is a guess until tuned on real Court 1 footage."""
    if len(curve) < 3:
        return None
    thr, k = np.percentile(curve, floor_pct), int(fps)
    return lambda t: curve[max(0, int(t * fps) - k):int(t * fps) + k + 1].max(initial=0) > thr

def point_chains(hits, gap=2.5, active=None):
    """Every burst of hits closer than `gap` s, even a single one (a missed serve still decides a point): [(first, last, hits)]."""
    out = []
    for t in sorted(t for t in hits if active is None or active(t)):
        if out and t - out[-1][1] <= gap:
            out[-1] = (out[-1][0], t, out[-1][2] + 1)
        else:
            out.append((t, t, 1))
    return out

def find_rallies(hits, duration, gap=2.5, min_hits=3, pre=1.8, post=1.2, active=None):
    """Bursts of >= min_hits hits, padded, overlaps merged -> [(start, end, hits)]."""
    segs = []
    for a, b, n in (c for c in point_chains(hits, gap, active) if c[2] >= min_hits):
        a, b = max(0.0, a - pre), (min(duration, b + post) if duration else b + post)
        if segs and a <= segs[-1][1]:
            segs[-1][1], segs[-1][2] = max(segs[-1][1], b), segs[-1][2] + n
        else:
            segs.append([a, b, n])
    return [(round(a, 2), round(b, 2), n) for a, b, n in segs]

def best_rallies(segs, n):
    """Top n by hits (then length), back in match order."""
    return sorted(sorted(segs, key=lambda s: s[2] + 0.15 * (s[1] - s[0]), reverse=True)[:n])

def longest_rally(segs):
    return max(segs, key=lambda s: (s[1] - s[0], s[2]))


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


# ---------------------------------------------------------------- export
def cut_clip(src, a, b, dst, vs, prog=None):
    if vs["fmt"] == "copy":     # stream copy: seconds, not minutes (exact when the camera writes 1 s keyframes)
        ff(["-ss", f"{a:.2f}", "-i", str(src), "-t", f"{b - a:.2f}", "-c", "copy", "-avoid_negative_ts", "make_zero",
            "-movflags", "+faststart", str(dst)])
    else:
        ff(["-ss", f"{a:.2f}", "-i", str(src), "-t", f"{b - a:.2f}", "-vf", vfilter(vs), *encoder(vs), str(dst)], b - a, prog)

def build_reel(src, segs, dst, vs, vertical, logo, prog=None, board=None):
    """Join rallies into one video (crop to 9:16 when vertical): logo bottom right, optional scoreboard bottom left.
    board: (scoreboard settings, point chains, score_states) or None."""
    sw, sh = video_size(src)
    W, H = out_size((sw, sh), vs, vertical)
    vf = vfilter(vs, min(vs["res"] or sh, sh), CROP_9_16 if vertical else "") + ",setsar=1"
    total, done = sum(b - a for a, b, _ in segs) or 1, 0.0
    with tempfile.TemporaryDirectory() as tmp:
        parts = []
        for k, (a, b, _) in enumerate(segs):
            part, args = Path(tmp) / f"r{k:03d}.mp4", ["-ss", f"{a:.2f}", "-t", f"{b - a:.2f}", "-i", str(src)]   # -t before -i: limits the video, not the logo
            args += overlays(tmp, f"r{k:03d}", vf, W, H, vertical, logo, board and board[0],
                             board and score_timeline(board[1], board[2], a, b))
            ff(args + encoder(vs) + [str(part)], b - a, prog and (lambda f, d=done, s=b - a: prog((d + f * s) / total)))
            done += b - a
            parts.append(part)
        (Path(tmp) / "list.txt").write_text("".join(f"file '{p.as_posix()}'\n" for p in parts))
        ff(["-f", "concat", "-safe", "0", "-i", str(Path(tmp) / "list.txt"), "-c", "copy", "-movflags", "+faststart", str(dst)])

def full_game(src, dst, vs, dur, prog=None, logo=None, board=None):
    if vs["fmt"] == "copy":                         # a stream copy can't carry graphics
        ff(["-i", str(src), "-c", "copy", "-movflags", "+faststart", str(dst)])
        return
    W, H = out_size(video_size(src), vs, False)
    with tempfile.TemporaryDirectory() as tmp:
        args = ["-i", str(src)] + overlays(tmp, "full", vfilter(vs), W, H, False, logo, board and board[0],
                                            board and score_timeline(board[1], board[2], 0, dur))
        ff(args + encoder(vs) + [str(dst)], dur, prog)


# ---------------------------------------------------------------- the whole job
def process(src, out_dir, opt, log=print, step=lambda frac, text: None, scorer=None, taps=None):
    """scorer(chains, segs) -> a winner per chain (0, 1 or None), or None to skip the scoreboard."""
    if trial_left() == 0:
        opt = dict(opt, **TRIAL_LIMITS)
        log("Trial ended. " + TRIAL_NOTE)
    src = Path(src)
    out = Path(out_dir) / f"{src.stem}-highlights"
    out.mkdir(parents=True, exist_ok=True)
    log(f"Reading {src.name} ...")
    step(0.02, "Listening for paddle hits")
    dur = duration_of(src)
    hits = audio_hits(src, opt["sensitivity"])
    step(0.12, "Tracking court motion")
    curve, fps = (motion_curve(src, inset=opt["inset"] / 100, dur=dur, prog=lambda f: step(0.12 + 0.2 * f, "Tracking court motion"))
                  if opt["motion"] or not hits else (np.array([]), 5))
    if not hits and len(curve):
        hits = motion_peaks(curve, fps)
        log("No paddle sounds found, using movement only.")
    active = make_active(curve, fps) if opt["motion"] and len(curve) else None
    segs = find_rallies(hits, dur, opt["gap"], opt["min_hits"], opt["pre"], opt["post"], active)
    log(f"{len(hits)} hits found, {len(segs)} rallies in {dur / 60:.1f} min of video.")
    step(0.35, f"{len(segs)} rallies found")
    if not segs:
        log("No rallies found, so only the full game is saved. Raise the sensitivity to find rallies.")
    if not segs and not opt["full"]:
        raise RuntimeError('No rallies found. Raise the sensitivity or turn off "Require court motion".')
    vs = {"res": RES[opt["res"]], "crf": CRF[opt["quality"]], "fmt": FMT[opt["fmt"]], "fps": FPS[opt["fps"]]}
    copy_ext = src.suffix if vs["fmt"] == "copy" else ".mp4"
    board, chains, winners = None, point_chains(hits, opt["gap"], active), None
    if opt.get("sb") and opt.get("sb_src", SB_SOURCES[0]) == SB_SOURCES[0]:
        got = phone_board(src, dur, chains, opt, log, taps or Taps())
        if got:
            board, winners = got
            if vs["fmt"] == "copy" and opt["full"]:
                log("Camera copy can't carry a scoreboard, so the full game is saved without one.")
    elif opt.get("sb") and scorer:
        step(0.35, "Waiting for the score")
        winners = scorer(chains, segs)
        if winners and any(w is not None for w in winners):
            sb = sb_settings(opt)
            board = (sb, chains, score_states(winners, opt["sb_fmt"], int(opt["sb_to"]), SIDES.index(opt["sb_first"])))
            log(f"Scoreboard on. Final: {final_line(board[2], sb)}.")
            if vs["fmt"] == "copy" and opt["full"]:
                log("Camera copy can't carry a scoreboard, so the full game is saved without one.")
        else:
            log("No points scored, so the videos are saved without a scoreboard.")

    # work list weighted by seconds of video to write, so the % bar moves at an even pace
    reel = (segs if opt["reel_mode"] == "All rallies" else best_rallies(segs, opt["top"])) if opt["reel"] and segs else []
    top1 = longest_rally(segs) if opt["longest"] and segs else None
    jobs = [j for j in (("reel", sum(b - a for a, b, _ in reel)) if reel else None,
                        ("longest", top1[1] - top1[0]) if top1 else None,
                        ("clips", sum(b - a for a, b, _ in segs)) if opt["clips"] and segs else None,
                        ("full", dur * (0.05 if vs["fmt"] == "copy" else 1)) if opt["full"] else None) if j]
    total, done, files = sum(w for _, w in jobs) or 1, 0.0, []
    def span(w, text):
        base = 0.35 + 0.64 * done / total
        return lambda f: step(base + 0.64 * w / total * f, text)

    for job, w in jobs:
        if job == "reel":
            log(f"Joining {len(reel)} rallies into one highlights video ...")
            build_reel(src, reel, out / "highlights.mp4", vs, opt["vertical"], opt["logo"] or None,
                       span(w, f"Highlights video · {len(reel)} rallies"), board)
            files.append(out / "highlights.mp4")
        elif job == "longest":
            log(f"Longest rally: {top1[1] - top1[0]:.0f} s, {top1[2]} hits.")
            build_reel(src, [top1], out / "longest-rally.mp4", vs, opt["vertical"], opt["logo"] or None, span(w, "Longest rally"), board)
            files.append(out / "longest-rally.mp4")
        elif job == "clips":
            sub = span(w, "Rally clips")
            for k, (a, b, n) in enumerate(segs, 1):
                dst = out / f"rally-{k:02d}{copy_ext}"
                cut_clip(src, a, b, dst, vs, lambda f, k=k: sub((k - 1 + f) / len(segs)))
                files.append(dst)
            log(f"Saved {len(segs)} rally clips.")
        else:
            log("Saving the full game ...")
            dst = out / f"full-game{copy_ext}"
            full_game(src, dst, vs, dur, span(w, "Full game"), board and (opt["logo"] or None), board)
            files.append(dst)
        done += w
    (out / "rallies.json").write_text(json.dumps({"source": src.name, "duration_s": round(dur, 1),
        "rallies": [{"start_s": a, "end_s": b, "hits": n} for a, b, n in segs],
        **({"points": [{"first_hit_s": round(a, 2), "last_hit_s": round(b, 2), "hits": n, "won_by": board[0]["names"][w] if w is not None else None,
                        "score_after": score_call(st[1])} for (a, b, n), w, st in zip(board[1], winners, board[2])]} if board else {})}, indent=2))
    write_share_page(out, files)
    step(1.0, f"Done · {len(files)} file{'s' if len(files) != 1 else ''}")
    log(f"Done. Files are in {out}")
    return out, files, segs

def write_share_page(out, files):
    rows = "".join(f'<a href="{f.name}" download><b>{f.stem.replace("-", " ").title()}</b>'
                   f'<span>{f.stat().st_size / 1e6:.1f} MB</span></a>' for f in files)
    (out / "index.html").write_text(f"""<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Playhouse Pickle highlights</title><style>body{{margin:0;background:#0b0b0d;color:#f3f4ee;font:17px system-ui,sans-serif;padding:24px}}
h1{{color:#dde01d;font-size:24px}}a{{display:flex;justify-content:space-between;gap:12px;padding:16px;margin:10px 0;border-radius:14px;
background:#17171b;color:#f3f4ee;text-decoration:none;border:1px solid #2a2a2e}}span{{color:#9a9b93}}</style>
<h1>Your match highlights</h1><p>Tap a file to save it to your phone.</p>{rows}
<p style="color:#9a9b93">Playhouse Pickle · Powered by {APP} · © {OWNER}</p>""", encoding="utf-8")


# ---------------------------------------------------------------- sharing by QR over the venue WiFi
def lan_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("10.255.255.255", 1))           # picks the WiFi/LAN interface; nothing is sent
        return s.getsockname()[0]
    except OSError:
        return "127.0.0.1"
    finally:
        s.close()

class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):                 # no console in the packaged app
        pass

class Share:
    httpd = None
    def start(self, folder, port=8800):
        self.stop()
        handler = functools.partial(QuietHandler, directory=str(folder))
        for p in range(port, port + 20):
            try:
                self.httpd = http.server.ThreadingHTTPServer(("0.0.0.0", p), handler)
                break
            except OSError:
                continue
        if not self.httpd:
            return ""
        threading.Thread(target=self.httpd.serve_forever, daemon=True).start()
        return f"http://{lan_ip()}:{self.httpd.server_address[1]}/"
    def stop(self):
        if self.httpd:
            self.httpd.shutdown()
            self.httpd.server_close()
            self.httpd = None

def save_qr(url, path):
    import qrcode
    img = qrcode.make(url, box_size=10, border=2)
    img.save(path)
    return path


# ---------------------------------------------------------------- desktop app
BASE = Path(getattr(sys, "_MEIPASS", Path(__file__).parent))
BRAND_PNG = BASE / "assets" / "playhouse-logo.png"
OWNER_PNG = BASE / "assets" / "linkmeio-logo.png"
QR_MODES = ("Venue WiFi", "Custom link")

# ---------------------------------------------------------------- trial edition
# A trial build bundles trial.txt (build_trial.ps1). The clock starts at first launch. When it runs out the app
# keeps working as a free tier. Both states are shown in the app: a countdown chip, then a "trial ended" notice.
TRIAL_HOURS, TRIAL_FLAG = 24, BASE / "trial.txt"
TRIAL_LIMITS = dict(reel=True, longest=False, full=False, clips=False, res="720p", logo=str(OWNER_PNG), sb=False)
TRIAL_NOTE = "Free tier: highlights video only, up to 720p, with the LINKMEIO watermark."
TRIAL_KEY, TRIAL_FILE = r"Software\LINKMEIO\HighlightStudioIO", SETTINGS.parent / "license.json"

def hours_left(t0, now, total=TRIAL_HOURS):
    used = (now - t0) / 3600
    return 0.0 if used < -1 else max(0.0, total - used)       # clock turned back by over an hour counts as ended

def trial_left():
    """Hours left on a trial build, or None for a full licence. The start is kept in two places; the earliest wins."""
    if not TRIAL_FLAG.exists():
        return None
    now, marks = time.time(), []
    try:
        import winreg
        with winreg.CreateKey(winreg.HKEY_CURRENT_USER, TRIAL_KEY) as k:
            marks.append(float(winreg.QueryValueEx(k, "Installed")[0]))
    except (ImportError, OSError, ValueError):
        pass
    try:
        marks.append(float(json.loads(TRIAL_FILE.read_text())["t0"]))
    except (OSError, ValueError, KeyError):
        pass
    t0 = min(marks + [now])
    try:
        import winreg
        with winreg.CreateKey(winreg.HKEY_CURRENT_USER, TRIAL_KEY) as k:
            winreg.SetValueEx(k, "Installed", 0, winreg.REG_SZ, repr(t0))
    except (ImportError, OSError):
        pass
    try:
        TRIAL_FILE.parent.mkdir(parents=True, exist_ok=True)
        TRIAL_FILE.write_text(json.dumps({"t0": t0}))
    except OSError:
        pass
    return hours_left(t0, now)

def run_app():
    import tkinter as tk
    from tkinter import filedialog, messagebox
    import customtkinter as ctk
    from PIL import Image

    # LINKMEIO palette: black, signal red, ice cyan
    # pickleball lime on a green-tinted dark, Discord-style rail + sidebar layout
    BG, SIDE, CARD, LINE, FIELD = "#0c0e0b", "#121510", "#171b15", "#272d24", "#1e231c"
    INK, MUTED, LIME, LIME2, CYAN, ON, ERR = "#f3f6ee", "#8f978a", "#c7f23d", "#d9ff5e", "#6fe3c1", "#10140c", "#ff5a4f"
    ctk.set_appearance_mode("dark")
    root = ctk.CTk(fg_color=BG)
    root.title(f"{APP} · Playhouse Pickle")
    root.geometry("1320x820")
    root.minsize(1200, 720)
    if (BASE / "icon.ico").exists():
        root.iconbitmap(str(BASE / "icon.ico"))
    F = lambda size, bold=False, fam="Segoe UI": ctk.CTkFont(family=fam, size=size, weight="bold" if bold else "normal")
    H1, H2, TXT, SMALL = F(26, True, "Bahnschrift"), F(13, True, "Bahnschrift"), F(13), F(11)
    def img(path, h):
        im = Image.open(path)
        return ctk.CTkImage(im, im, size=(round(im.width * h / im.height), h))

    # ---- state, restored from the last session (the watch switch itself always starts off)
    v = {}
    for k, d in {**DEFAULTS, "preset": "Recommended", "input": "", "out": str(Path.home() / "Videos" / APP),
                 "deliver_qr": True, "qr_mode": QR_MODES[0], "qr_link": "", "watch": False, "watch_dir": ""}.items():
        v[k] = (tk.BooleanVar if isinstance(d, bool) else tk.DoubleVar if isinstance(d, float)
                else tk.IntVar if isinstance(d, int) else tk.StringVar)(value=d)
    allowed = {**CHOICES, "qr_mode": QR_MODES, "preset": tuple(PRESET_NOTES)}
    for k, val in load_settings().items():
        if k in v and k not in ("input", "watch") and (k not in allowed or val in allowed[k]):
            try:
                v[k].set(val)
            except tk.TclError:
                pass

    def remember():
        save_settings({k: var.get() for k, var in v.items() if k not in ("input", "watch")})

    msgs, share = queue.Queue(), Share()
    live = {"sb": sb_settings({k: v[k].get() for k in DEFAULTS})}
    scoring = ScoreServer(Taps(), live)
    def sync_live(*_):
        try:
            live["sb"] = sb_settings({k: v[k].get() for k in DEFAULTS})
        except (tk.TclError, ValueError):
            pass
    for k in ("sb_fmt", "sb_to", "sb_first", "team_a", "team_b"):
        v[k].trace_add("write", sync_live)
    def court_qr():
        if not scoring.url:
            return
        png = save_qr(scoring.url, Path(tempfile.mkdtemp()) / "score-qr.png")
        w = ctk.CTkToplevel(root, fg_color=BG)
        w.title(f"Phone scoring · {APP}")
        w.transient(root)
        ctk.CTkLabel(w, text="SCORE FROM YOUR PHONE", font=H2, text_color=INK).pack(padx=24, pady=(20, 6))
        ctk.CTkLabel(w, text="", image=ctk.CTkImage(Image.open(png), Image.open(png), size=(260, 260))).pack(padx=24)
        ctk.CTkLabel(w, text=f"{scoring.url}\nPhones on the venue WiFi. Print it and stick it at the court.", font=SMALL,
                     text_color=MUTED, justify="center").pack(padx=24, pady=(8, 20))
    state = {"out": None, "busy": False, "seen": set(), "url": "", "applying": False, "t0": 0.0, "src": ""}

    # ---- building blocks
    def button(parent, text, cmd, primary=False, **kw):
        return ctk.CTkButton(parent, text=text, command=cmd, corner_radius=12, font=H2 if primary else TXT,
                             fg_color=LIME if primary else FIELD, hover_color=LIME2 if primary else LINE,
                             text_color=ON if primary else INK, border_width=0 if primary else 1, border_color=LINE, **kw)

    def card(title, sub):
        c = ctk.CTkFrame(left, fg_color=CARD, corner_radius=18, border_width=1, border_color=LINE)
        c.pack(fill="x", pady=(0, 10), padx=(0, 8))
        h = ctk.CTkFrame(c, fg_color="transparent")
        h.pack(fill="x", padx=18, pady=(12, 4))
        ctk.CTkFrame(h, width=4, height=16, corner_radius=2, fg_color=LIME).pack(side="left", padx=(0, 10))
        ctk.CTkLabel(h, text=title.upper(), font=H2, text_color=INK).pack(side="left")
        ctk.CTkLabel(h, text=sub, font=SMALL, text_color=MUTED).pack(side="left", padx=12)
        inner = ctk.CTkFrame(c, fg_color="transparent")
        inner.pack(fill="x", padx=18, pady=(0, 12))
        return inner

    def line(parent, label):
        r = ctk.CTkFrame(parent, fg_color="transparent")
        r.pack(fill="x", pady=3)
        ctk.CTkLabel(r, text=label, width=112, anchor="w", font=TXT, text_color=MUTED).pack(side="left")
        return r

    def path_row(parent, label, var, pick):
        r = line(parent, label)
        ctk.CTkEntry(r, textvariable=var, fg_color=FIELD, border_color=LINE, text_color=INK, height=38, corner_radius=12,
                     font=TXT).pack(side="left", fill="x", expand=True)
        button(r, "Browse", pick, width=92, height=38).pack(side="left", padx=(8, 0))
        return r

    def seg(parent, label, var, options, hints=None, below=False):
        """Pill toggle group: the selected option is red with white text. Hint sits beside it, or below for wide groups."""
        r = line(parent, label)
        g = ctk.CTkFrame(r, fg_color=FIELD, corner_radius=14)
        g.pack(side="left")
        hint = ctk.CTkLabel(parent if below else r, text="", font=SMALL, text_color=CYAN if below else MUTED,
                            wraplength=520 if below else 210, justify="left") if hints else None
        if hint:
            hint.pack(anchor="w", padx=(112, 0)) if below else hint.pack(side="left", padx=12)
        btns = {o: ctk.CTkButton(g, text=o, height=28, width=56, corner_radius=10, font=TXT, command=lambda o=o: var.set(o))
                for o in options}
        for b in btns.values():
            b.pack(side="left", padx=3, pady=3)
        def paint(*_):
            for o, b in btns.items():
                on = var.get() == o
                b.configure(fg_color=LIME if on else FIELD, hover_color=LIME2 if on else LINE, text_color=ON if on else INK)
            if hint:
                hint.configure(text=hints.get(var.get(), ""))
        var.trace_add("write", paint)
        paint()
        return r

    def switch(parent, text, var, cmd=None):
        s = ctk.CTkSwitch(parent, text=text, variable=var, onvalue=True, offvalue=False, command=cmd, font=TXT, text_color=INK,
                          progress_color=LIME, fg_color=LINE, button_color="#ffffff", button_hover_color="#e8e8e8")
        s.pack(side="left", padx=(0, 22), pady=4)
        return s

    def info_icon(parent, key, tell):
        """Round (i) badge: point at it or click it and the popup's help box explains the setting."""
        i = ctk.CTkLabel(parent, text="i", width=22, height=22, corner_radius=11, fg_color=FIELD, text_color=CYAN,
                         font=F(12, True, "Georgia"), cursor="hand2")
        i.pack(side="left", padx=(2, 0))
        for ev in ("<Enter>", "<Button-1>"):
            i.bind(ev, lambda e: tell(key))
        tell.icons.append((key, i))
        return i

    def slider(parent, label, var, lo, hi, steps, fmt="{:.0f}", tell=None):
        r = line(parent, label)
        val = ctk.CTkLabel(r, text="", width=44, font=H2, text_color=INK)
        ctk.CTkSlider(r, from_=lo, to=hi, number_of_steps=steps, variable=var, width=230, progress_color=LIME,
                      button_color=INK, button_hover_color=CYAN, fg_color=LINE).pack(side="left")
        val.pack(side="left", padx=10)
        if tell:
            info_icon(r, label, tell)
        show = lambda *_: val.configure(text=fmt.format(var.get()))
        tid = var.trace_add("write", show)
        val.bind("<Destroy>", lambda e: any(t[1] == tid for t in var.trace_info()) and var.trace_remove("write", tid))
        show()
        return r

    def blend(t):
        a, b = (0xc7, 0xf2, 0x3d), (0x6f, 0xe3, 0xc1)
        return "#%02x%02x%02x" % tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))

    def gradient(canvas, x0, x1, y0, y1, steps=64):
        wdt = max(1, x1 - x0)
        for s in range(steps):
            canvas.create_rectangle(x0 + wdt * s / steps, y0, x0 + wdt * (s + 1) / steps + 1, y1, fill=blend(s / (steps - 1)), width=0)

    class MotionBar(tk.Canvas):
        """Eased % bar: red->cyan fill with moving highlight stripes while working; creeps inside long steps."""
        def __init__(self, master):
            super().__init__(master, height=14, bg=CARD, highlightthickness=0)
            self.target = self.shown = self.cap = 0.0
            self.phase, self.active, self.last = 0, False, None
            self.tick()
        def set(self, f, active=True):
            self.target = self.cap = max(0.0, min(1.0, f))
            self.active = active and f < 1
            if f == 0:
                self.shown = 0.0
        def tick(self):
            if self.active and self.shown >= self.target - 0.002:      # never looks frozen during a long step
                self.target = min(self.cap + 0.04, self.target + 0.0004)
            self.shown += (self.target - self.shown) * 0.12
            self.phase = (self.phase + 2) % 28
            self.draw()
            label = f"{min(100, self.shown * 100 + 0.5):.0f}%"
            if label != self.last:
                pct.configure(text=label)
                self.last = label
            self.after(16, self.tick)
        def draw(self):
            w, h = self.winfo_width(), 14
            self.delete("all")
            self.create_oval(0, 0, h, h, fill=FIELD, width=0)
            self.create_oval(w - h, 0, w, h, fill=FIELD, width=0)
            self.create_rectangle(h / 2, 0, w - h / 2, h, fill=FIELD, width=0)
            fw = int(w * self.shown)
            if fw > h:
                gradient(self, h / 2, fw - h / 2, 0, h, steps=40)
                self.create_oval(0, 0, h, h, fill=LIME, width=0)
                self.create_oval(fw - h, 0, fw, h, fill=blend(1.0), width=0)
                if self.active:
                    for x in range(-28 + self.phase, fw - h, 28):
                        self.create_polygon(x, h, x + 10, 0, x + 18, 0, x + 8, h, fill="#ffffff", stipple="gray25", width=0)

    # ---- icon rail (far left) and sidebar navigation
    rail = ctk.CTkFrame(root, width=68, fg_color=BG, corner_radius=0)
    rail.pack(side="left", fill="y")
    rail.pack_propagate(False)
    side = ctk.CTkFrame(root, width=206, fg_color=SIDE, corner_radius=0)
    side.pack(side="left", fill="y")
    side.pack_propagate(False)
    ctk.CTkLabel(rail, text="IO", width=44, height=44, corner_radius=22, fg_color=LIME, text_color=ON,
                 font=F(17, True, "Bahnschrift")).pack(pady=(18, 10))
    ctk.CTkFrame(rail, width=28, height=2, fg_color=LINE).pack(pady=(0, 10))
    ctk.CTkLabel(side, text="Highlight Studio", font=F(17, True, "Bahnschrift"), text_color=INK, anchor="w").pack(fill="x", padx=18, pady=(20, 0))
    vrow = ctk.CTkFrame(side, fg_color="transparent")
    vrow.pack(fill="x", padx=18, pady=(4, 14))
    ctk.CTkLabel(vrow, text=f" v{VERSION} · PREMIUM ", font=F(10, True), text_color=LIME, fg_color=FIELD, corner_radius=8,
                 height=20).pack(side="left")
    trial_chip = ctk.CTkLabel(side, text="", font=F(10, True), corner_radius=8, height=22) if TRIAL_FLAG.exists() else None
    if trial_chip:
        trial_chip.pack(anchor="w", padx=18, pady=(0, 10))
    ctk.CTkLabel(side, text="STUDIO", font=F(10, True), text_color=MUTED, anchor="w").pack(fill="x", padx=20, pady=(0, 4))

    # ---- centre: top bar, trial notice, one page per section
    main = ctk.CTkFrame(root, fg_color="transparent")
    right = ctk.CTkFrame(root, width=340, fg_color=SIDE, corner_radius=0)
    right.pack(side="right", fill="y")
    right.pack_propagate(False)
    main.pack(side="left", fill="both", expand=True, padx=(20, 16), pady=(16, 12))
    topbar = ctk.CTkFrame(main, fg_color="transparent")
    topbar.pack(fill="x", pady=(0, 12))
    page_title = ctk.CTkLabel(topbar, text="", font=H1, text_color=INK)
    page_title.pack(side="left")
    status = ctk.CTkLabel(topbar, text="●  Ready", font=H2, text_color=CYAN, fg_color=FIELD, corner_radius=14, height=32, width=120)
    status.pack(side="right")
    ended = ctk.CTkLabel(main, text=f"Your {TRIAL_HOURS}-hour trial has ended.  {TRIAL_NOTE}  Contact {OWNER} to unlock the full version.",
                         font=SMALL, text_color=ON, fg_color=LIME, corner_radius=12, height=34, wraplength=620)
    def trial_tick():
        left = trial_left()
        if left:
            trial_chip.configure(text=f"  TRIAL · {max(1, round(left))} H LEFT  ", text_color=ON, fg_color=CYAN)
        else:
            trial_chip.configure(text="  TRIAL ENDED · FREE TIER  ", text_color=ON, fg_color=LIME)
            if not ended.winfo_ismapped():
                ended.pack(fill="x", pady=(0, 10), after=topbar)
            v["watch"].set(False)
        root.after(60000, trial_tick)

    # hero banner on the Home page: lime-to-mint band with a pickleball
    hero = tk.Canvas(main, height=112, bg=BG, highlightthickness=0)
    def draw_hero(e=None):
        w = hero.winfo_width()
        hero.delete("all")
        gradient(hero, 0, w, 0, 112, steps=48)
        cx, cy, r = w - 80, 56, 40
        hero.create_oval(cx - r, cy - r, cx + r, cy + r, fill="#e4ff7a", outline="")
        for dx, dy in ((-16, -18), (8, -22), (22, -2), (-22, 4), (0, 2), (-6, 24), (18, 20)):
            hero.create_oval(cx + dx - 5, cy + dy - 5, cx + dx + 5, cy + dy + 5, fill="#a8cf2a", outline="")
        hero.create_text(24, 40, text="Turn any match into highlights", anchor="w", fill=ON, font=("Bahnschrift", 20, "bold"))
        hero.create_text(24, 72, text="Pick a video, press Make highlights. Scoreboard and QR download included.",
                         anchor="w", fill="#26301a", font=("Segoe UI", 11))
    hero.bind("<Configure>", draw_hero)
    stack = ctk.CTkFrame(main, fg_color="transparent")
    stack.pack(fill="both", expand=True)
    PAGES = (("Home", "\u2302", "Preset and the match video"), ("Exports", "\u25a6", "What the player takes home"),
             ("Scoreboard", "\u25c9", "Score tally, bottom left"), ("Video", "\u25b6", "Format, size and smoothness"),
             ("Delivery", "\u21e9", "Folder and QR download"))
    pages, navs = {}, {}
    def show(name):
        for n, f in pages.items():
            f.pack_forget()
            navs[n].configure(fg_color=FIELD if n == name else "transparent", text_color=LIME if n == name else INK)
        hero.pack_forget()
        if name == "Home":
            hero.pack(fill="x", pady=(0, 12), before=stack)
        pages[name].pack(fill="both", expand=True)
        page_title.configure(text=dict((n, t) for n, _, t in PAGES)[name])
    for name, glyph, _ in PAGES:
        pages[name] = ctk.CTkScrollableFrame(stack, fg_color="transparent", scrollbar_button_color=LINE,
                                             scrollbar_button_hover_color=MUTED)
        navs[name] = ctk.CTkButton(side, text=f"  {glyph}   {name}", anchor="w", height=38, corner_radius=10, font=TXT,
                                   fg_color="transparent", hover_color=FIELD, text_color=INK, command=lambda n=name: show(n))
        navs[name].pack(fill="x", padx=10, pady=1)
        ctk.CTkButton(rail, text=glyph, width=44, height=44, corner_radius=22, fg_color=CARD, hover_color=FIELD, text_color=INK,
                      font=F(16), command=lambda n=name: show(n)).pack(pady=4)
    ctk.CTkButton(side, text="  \u25ce   Detection", anchor="w", height=38, corner_radius=10, font=TXT, fg_color="transparent",
                  hover_color=FIELD, text_color=INK, command=lambda: detection_window()).pack(fill="x", padx=10, pady=1)
    if BRAND_PNG.exists():
        lic = ctk.CTkFrame(side, fg_color=CARD, corner_radius=14)
        lic.pack(side="bottom", fill="x", padx=12, pady=14)
        ctk.CTkLabel(lic, text="PREPARED FOR" if trial_chip else "LICENSED TO", font=F(9, True), text_color=MUTED).pack(anchor="w", padx=12, pady=(10, 0))
        ctk.CTkLabel(lic, text="", image=img(BRAND_PNG, 34)).pack(anchor="w", padx=12, pady=(2, 12))

    # ---- 0 preset
    left = pages["Home"]
    c = card("Preset", "one tap sets everything below")
    seg(c, "Use", v["preset"], list(PRESET_NOTES), PRESET_NOTES, below=True)

    # ---- 1 input
    c = card("Input", "one match, or every new recording from the cameras")
    path_row(c, "Match video", v["input"], lambda: v["input"].set(filedialog.askopenfilename(
        filetypes=[("Video", "*.mp4 *.mov *.mkv *.avi *.m4v"), ("All files", "*.*")]) or v["input"].get()))
    path_row(c, "Watch folder", v["watch_dir"], lambda: v["watch_dir"].set(filedialog.askdirectory() or v["watch_dir"].get()))
    r = line(c, "")
    switch(r, "Auto-process new recordings in the watch folder", v["watch"], lambda: toggle_watch())

    # ---- 2 exports
    left = pages["Exports"]
    c = card("Exports", "what the player takes home")
    r = line(c, "Outputs")
    switch(r, "Highlights video", v["reel"])
    switch(r, "Longest rally", v["longest"])
    r = line(c, "")
    switch(r, "Full game", v["full"])
    switch(r, "Clip per rally", v["clips"])
    seg(c, "Highlights", v["reel_mode"], list(REEL_MODES), {"All rallies": "Every rally, in match order, in one video",
                                                             "Best rallies": "Only the top rallies (count below)"})
    slider(c, "Best rallies", v["top"], 1, 20, 19)
    orient = tk.StringVar(value="Vertical 9:16" if v["vertical"].get() else "Landscape 16:9")
    orient.trace_add("write", lambda *_: v["vertical"].set(orient.get().startswith("Vertical")))
    v["vertical"].trace_add("write", lambda *_: orient.get().startswith("Vertical") != v["vertical"].get()
                            and orient.set("Vertical 9:16" if v["vertical"].get() else "Landscape 16:9"))
    seg(c, "Shape", orient, ["Vertical 9:16", "Landscape 16:9"], {"Vertical 9:16": "Reels, TikTok, Stories",
                                                                  "Landscape 16:9": "YouTube, Facebook, TV"})
    seg(c, "Watermark", v["wm"], list(WATERMARKS))
    path_row(c, "Custom PNG", v["logo"], lambda: v["logo"].set(filedialog.askopenfilename(filetypes=[("PNG image", "*.png")]) or v["logo"].get()))

    # ---- 3 scoreboard (optional)
    left = pages["Scoreboard"]
    c = card("Scoreboard", "optional · you tap who won each rally, the app keeps the score")
    r = line(c, "Scoreboard")
    switch(r, "Add a scoreboard to the videos", v["sb"])
    seg(c, "Style", v["sb_style"], list(SB_STYLES), {"Broadcast": "Two rows, like US pro streams",
                                                    "Compact": "One slim line, best for Reels",
                                                    "Score call": "The spoken call, big: 7-4-2"})
    seg(c, "Scoring", v["sb_fmt"], list(SCORING), {SCORING[0]: "Only the serving team scores. Starts 0-0-2",
                                                  SCORING[1]: "Only the server scores. No server number",
                                                  SCORING[2]: "Every rally scores, like MLP"}, below=True)
    seg(c, "Game to", v["sb_to"], list(GAME_TO), {"11": "Win by 2", "15": "Win by 2", "21": "Win by 2"})
    r = line(c, "Team names")
    for k in ("team_a", "team_b"):
        ctk.CTkEntry(r, textvariable=v[k], width=170, fg_color=FIELD, border_color=LINE, text_color=INK, height=36,
                     corner_radius=12, font=TXT).pack(side="left", padx=(0, 8))
    seg(c, "Score from", v["sb_src"], list(SB_SOURCES), {SB_SOURCES[0]: "Players tap each rally on a phone at the court. Fully automatic export",
                                                        SB_SOURCES[1]: "You tap who won each rally after detection"}, below=True)
    r = line(c, "Phone page")
    ctk.CTkLabel(r, text=scoring.url or "Could not open a port", font=H2, text_color=LIME).pack(side="left")
    button(r, "Show QR for the court", lambda: court_qr(), height=30).pack(side="left", padx=10)
    seg(c, "First serve", v["sb_first"], list(SIDES))
    r = line(c, "Show")
    switch(r, "Server number", v["sb_server"])
    switch(r, "Games won", v["sb_games"])
    r = line(c, "")
    button(r, "Preview on this video", lambda: preview_board(), height=34).pack(side="left")
    ctk.CTkLabel(c, text="Bottom left, with your logo small at the bottom right. Phone scoring also works on watch-folder runs. Name recordings Court 1, Court 2... to use that court's taps.",
                 font=SMALL, text_color=CYAN, wraplength=520, justify="left").pack(anchor="w", padx=(112, 0), pady=(4, 0))

    # ---- 4 video output
    left = pages["Video"]
    c = card("Video output", "format, size and smoothness")
    seg(c, "Format", v["fmt"], list(FMT), {"MP4 · iPhone + Android": "One file for iPhone, Android, PC, Facebook and TikTok",
                                           "HEVC · smaller": "Half the size; older Android and Windows may not play it",
                                           "Camera copy": "Instant, keeps the camera's own format"}, below=True)
    seg(c, "Resolution", v["res"], list(RES), {"1080p": "Full HD. A smaller video is never upscaled"})
    seg(c, "Frame rate", v["fps"], list(FPS), {"30": "Standard for social video", "60": "Smoother, bigger files"})
    seg(c, "Quality", v["quality"], list(CRF))

    # ---- 5 delivery
    left = pages["Delivery"]
    c = card("Delivery", "files in a folder, plus a QR code to scan")
    path_row(c, "Output folder", v["out"], lambda: v["out"].set(filedialog.askdirectory() or v["out"].get()))
    r = line(c, "QR code")
    switch(r, "Show a QR code after export", v["deliver_qr"])
    seg(c, "QR opens", v["qr_mode"], list(QR_MODES), {"Venue WiFi": "Phones on the venue WiFi download directly",
                                                       "Custom link": "e.g. the player's portal page"})
    r = line(c, "Custom link")
    ctk.CTkEntry(r, textvariable=v["qr_link"], fg_color=FIELD, border_color=LINE, text_color=INK, height=38, corner_radius=12,
                 font=TXT).pack(side="left", fill="x", expand=True)

    # presets <-> fields: a preset fills the fields; touching a field flips the preset to Custom
    def apply_preset(*_):
        p = PRESETS.get(v["preset"].get())
        if p:
            state["applying"] = True
            for k, val in p.items():
                v[k].set(val)
            state["applying"] = False
    v["preset"].trace_add("write", apply_preset)
    def to_custom(*_):
        p = PRESETS.get(v["preset"].get())
        if not state["applying"] and p and any(v[k].get() != val for k, val in p.items()):
            v["preset"].set("Custom")
    for k in {k for p in PRESETS.values() for k in p}:
        v[k].trace_add("write", to_custom)

    # ---- detection settings popup
    def detection_window():
        w = ctk.CTkToplevel(root, fg_color=BG)
        w.title(f"Rally detection · {APP}")
        w.transient(root)
        w.resizable(False, False)
        c = ctk.CTkFrame(w, fg_color=CARD, corner_radius=18, border_width=1, border_color=LINE)
        c.pack(padx=18, pady=18)
        inner = ctk.CTkFrame(c, fg_color="transparent")
        inner.pack(padx=22, pady=18)
        ctk.CTkLabel(inner, text="RALLY DETECTION", font=H2, text_color=INK).pack(anchor="w")
        ctk.CTkLabel(inner, text="Point at an  i  to see what a setting does.", font=SMALL, text_color=MUTED).pack(anchor="w", pady=(0, 8))
        helpbox = ctk.CTkFrame(inner, fg_color=FIELD, corner_radius=14, border_width=1, border_color=LINE)
        help_t = ctk.CTkLabel(helpbox, text="WHAT DOES IT DO?", font=F(10, True), text_color=CYAN, anchor="w")
        help_x = ctk.CTkLabel(helpbox, text="The app listens for paddle hits and checks for movement on the court. "
                              "Hits close together become a rally.", font=SMALL, text_color=INK, justify="left",
                              anchor="nw", wraplength=500, height=58)
        help_t.pack(fill="x", padx=16, pady=(10, 0))
        help_x.pack(fill="x", padx=16, pady=(2, 10))
        def tell(key):
            help_t.configure(text=key.replace(" (s)", "").replace(" %", "").upper())
            help_x.configure(text=DETECT_HELP[key])
            for k, i in tell.icons:                   # the icon being explained lights up
                i.configure(fg_color=CYAN if k == key else FIELD, text_color=BG if k == key else CYAN)
        tell.icons = []
        slider(inner, "Sensitivity", v["sensitivity"], 1, 10, 9, tell=tell)
        slider(inner, "Min hits", v["min_hits"], 2, 10, 8, tell=tell)
        slider(inner, "Max gap (s)", v["gap"], 1, 6, 10, "{:.1f}", tell=tell)
        slider(inner, "Pre-roll (s)", v["pre"], 0, 5, 10, "{:.1f}", tell=tell)
        slider(inner, "Post-roll (s)", v["post"], 0, 5, 10, "{:.1f}", tell=tell)
        slider(inner, "Ignore edges %", v["inset"], 0, 30, 6, tell=tell)
        r = line(inner, "")
        switch(r, "Require court motion (ignores the next court and music)", v["motion"])
        info_icon(r, "Court motion", tell)
        helpbox.pack(fill="x", pady=(12, 0))
        rr = ctk.CTkFrame(inner, fg_color="transparent")
        rr.pack(fill="x", pady=(10, 0))
        def defaults():
            for k in ("sensitivity", "min_hits", "gap", "pre", "post", "inset", "motion"):
                v[k].set(DEFAULTS[k])
        button(rr, "Recommended values", defaults, height=40).pack(side="left")
        button(rr, "Done", lambda: (remember(), w.destroy()), primary=True, height=40, width=110).pack(side="right")
        w.after(100, w.grab_set)

    # ---- scoreboard preview: the real renderer on a real frame of the chosen video
    def preview_board():
        o, src = opts(), v["input"].get()
        vs = {"res": RES[o["res"]], "fps": None}
        wh = video_size(src) if Path(src).is_file() else (1920, 1080)
        W, H = out_size(wh, vs, o["vertical"])
        frame = None
        if Path(src).is_file():
            vf = (CROP_9_16 + "," if o["vertical"] else "") + f"scale={W}:{H}"
            raw = subprocess.run([FFMPEG, "-hide_banner", "-loglevel", "error", "-ss", f"{duration_of(src) * 0.3:.1f}", "-i", src,
                                  "-frames:v", "1", "-vf", vf, "-f", "rawvideo", "-pix_fmt", "rgb24", "-"],
                                 capture_output=True, creationflags=NOWIN).stdout
            frame = Image.frombytes("RGB", (W, H), raw) if len(raw) == W * H * 3 else None
        frame = (frame or Image.new("RGB", (W, H), "#1d4f86")).convert("RGBA")
        m, sb = round(H * 0.03), sb_settings(o)
        board = scoreboard_png(dict(p=[7, 4], g=[1, 0], sv=0, sn=2 if o["sb_fmt"] == SCORING[0] else 0, won=None), sb, W, H)
        frame.alpha_composite(board, (m, H - m - board.height))
        if o["logo"] and Path(o["logo"]).is_file():
            lg = Image.open(o["logo"]).convert("RGBA")
            lw = round(W * (0.2 if o["vertical"] else 0.1))
            lg = lg.resize((lw, max(1, round(lg.height * lw / lg.width))))
            frame.alpha_composite(lg, (W - m - lw, H - m - lg.height))
        w = ctk.CTkToplevel(root, fg_color=BG)
        w.title(f"Scoreboard preview · {APP}")
        w.transient(root)
        k = min(1.0, 900 / W, 640 / H)
        ctk.CTkLabel(w, text="", image=ctk.CTkImage(frame, frame, size=(round(W * k), round(H * k)))).pack(padx=18, pady=(18, 8))
        ctk.CTkLabel(w, text=f"Sample score 7-4, {'second server, ' if o['sb_fmt'] == SCORING[0] else ''}games 1-0 · "
                     f"{W}x{H}, exactly as it is burned into the video.", font=SMALL, text_color=MUTED,
                     wraplength=max(260, round(W * k)), justify="center").pack(padx=18, pady=(0, 16))

    # ---- scoring: one tap per rally; the engine keeps the score
    def score_window(chains, segs, reply, done):
        from tkinter import ttk
        o = opts()
        sb = sb_settings(o)
        win = [None] * len(chains)
        first = SIDES.index(o["sb_first"])
        star = lambda c: any(a <= c[0] and c[1] <= b for a, b, _ in segs)
        w = ctk.CTkToplevel(root, fg_color=BG)
        w.title(f"Score the match · {APP}")
        w.transient(root)
        w.geometry("860x660")
        ctk.CTkLabel(w, text="SCORE THE MATCH", font=H2, text_color=INK).pack(anchor="w", padx=22, pady=(18, 0))
        ctk.CTkLabel(w, text=f"Each row is a burst of paddle hits. Press 1 if {sb['names'][0]} won the point, 2 if {sb['names'][1]} won it. "
                     "Leave warm-ups and stray sounds empty. Space plays the rally. ★ = in the highlights.",
                     font=SMALL, text_color=MUTED, wraplength=800, justify="left").pack(anchor="w", padx=22, pady=(2, 8))
        total = ctk.CTkLabel(w, text="", font=H2, text_color=CYAN)
        total.pack(anchor="w", padx=22, pady=(0, 8))
        st = ttk.Style(w)
        st.theme_use("clam")
        st.configure("SB.Treeview", background=FIELD, fieldbackground=FIELD, foreground=INK, rowheight=28, borderwidth=0,
                     font=("Segoe UI", 11))
        st.configure("SB.Treeview.Heading", background=CARD, foreground=MUTED, relief="flat", font=("Segoe UI", 10, "bold"))
        st.map("SB.Treeview", background=[("selected", LINE)], foreground=[("selected", "#ffffff")])
        st.map("SB.Treeview.Heading", background=[("active", CARD)])
        box = ctk.CTkFrame(w, fg_color=FIELD, corner_radius=14)
        box.pack(fill="both", expand=True, padx=22)
        cols = ("n", "time", "hits", "hl", "won", "score")
        tree = ttk.Treeview(box, columns=cols, show="headings", style="SB.Treeview", selectmode="browse")
        for c_, t_, wd in zip(cols, ("#", "Time", "Hits", "Highlight", "Point to", "Score after"), (50, 90, 60, 90, 200, 160)):
            tree.heading(c_, text=t_)
            tree.column(c_, width=wd, anchor="center" if c_ != "won" else "w")
        sc = ttk.Scrollbar(box, orient="vertical", command=tree.yview)
        tree.configure(yscrollcommand=sc.set)
        tree.pack(side="left", fill="both", expand=True, padx=(8, 0), pady=8)
        sc.pack(side="right", fill="y", pady=8)
        tree.tag_configure("A", foreground=LIME2)
        tree.tag_configure("B", foreground=CYAN)
        tree.tag_configure("none", foreground=MUTED)
        for i, (a, b, n) in enumerate(chains):
            tree.insert("", "end", iid=str(i), values=(i + 1, f"{int(a // 60)}:{a % 60:04.1f}", n, "★" if star((a, b)) else "", "", ""))
        def refresh():
            states = score_states(win, o["sb_fmt"], int(o["sb_to"]), first)
            for i, (wn, (_, after)) in enumerate(zip(win, states)):
                tree.set(str(i), "won", sb["names"][wn] if wn is not None else "—")
                tree.set(str(i), "score", (score_call(after) + ("  GAME" if after["won"] is not None else "")) if wn is not None else "")
                tree.item(str(i), tags=("A" if wn == 0 else "B" if wn == 1 else "none",))
            total.configure(text=f"Final: {final_line(states, sb)}  ·  {sum(x is not None for x in win)} points scored" if states else "")
        def mark(wn):
            sel = tree.selection()
            if not sel:
                return
            i = int(sel[0])
            win[i] = wn
            refresh()
            if i + 1 < len(chains):
                tree.selection_set(str(i + 1))
                tree.see(str(i + 1))
        def play(*_):
            sel = tree.selection()
            if not sel:
                return
            a, b, _ = chains[int(sel[0])]
            def cut():
                dst = Path(tempfile.mkdtemp()) / f"rally-{int(sel[0]) + 1}.mp4"
                try:
                    ff(["-ss", f"{max(0, a - 2.5):.2f}", "-t", f"{b - a + 4:.2f}", "-i", src_path, "-vf", "scale=-2:480",
                        "-c:v", "libx264", "-preset", "ultrafast", "-c:a", "aac", str(dst)])
                    os.startfile(dst)
                except (RuntimeError, OSError) as e:
                    log(f"Could not play the rally: {e}")
            threading.Thread(target=cut, daemon=True).start()
        def close(winners):
            set_status("Working", LIME2)
            reply["winners"] = winners
            done.set()
            w.destroy()
        for key, wn in (("<KeyPress-1>", 0), ("<KeyPress-2>", 1), ("<KeyPress-0>", None), ("<Delete>", None), ("<BackSpace>", None)):
            tree.bind(key, lambda e, wn=wn: (mark(wn), "break")[1])
        tree.bind("<space>", lambda e: (play(), "break")[1])
        tree.bind("<Double-1>", play)
        row = ctk.CTkFrame(w, fg_color="transparent")
        row.pack(fill="x", padx=22, pady=(10, 0))
        button(row, f"1 · {sb['names'][0]}", lambda: mark(0), height=38).pack(side="left")
        button(row, f"2 · {sb['names'][1]}", lambda: mark(1), height=38).pack(side="left", padx=8)
        button(row, "0 · Not a point", lambda: mark(None), height=38).pack(side="left")
        button(row, "Play rally (Space)", play, height=38).pack(side="left", padx=8)
        row = ctk.CTkFrame(w, fg_color="transparent")
        row.pack(fill="x", padx=22, pady=(10, 18))
        button(row, "Export with scoreboard", lambda: close(win[:]), primary=True, height=42, width=220).pack(side="right")
        button(row, "Skip the scoreboard", lambda: close(None), height=42).pack(side="right", padx=8)
        w.protocol("WM_DELETE_WINDOW", lambda: close(None))
        src_path = state["src"]
        refresh()
        if chains:
            tree.selection_set("0")
        w.after(100, lambda: (w.grab_set(), tree.focus_set()))

    def gui_scorer(chains, segs):                  # runs on the worker thread; the window runs on the UI thread
        reply, done = {}, threading.Event()
        msgs.put(("score", (chains, segs, reply, done)))
        done.wait()
        return reply.get("winners")

    # ---- right: export panel
    ctk.CTkLabel(right, text="EXPORT", font=H2, text_color=INK).pack(anchor="w", padx=22, pady=(20, 2))
    summary = ctk.CTkLabel(right, text="", font=SMALL, text_color=MUTED, justify="left", wraplength=310, anchor="w")
    summary.pack(fill="x", padx=22)
    def summarize(*_):
        outs = [n for n, k in (("highlights video", "reel"), ("longest rally", "longest"), ("full game", "full"), ("rally clips", "clips"))
                if v[k].get()]
        try:
            top_n = int(v["top"].get())
        except (tk.TclError, ValueError):
            top_n = 0
        reel = f" ({'all rallies' if v['reel_mode'].get() == 'All rallies' else f'best {top_n}'})" if v["reel"].get() else ""
        summary.configure(text=f"{v['fmt'].get()} · {v['res'].get()} · {v['fps'].get()} fps · {v['quality'].get()}\n"
                               f"{', '.join(outs).capitalize() or 'Nothing selected'}{reel}"
                               + (f" · scoreboard ({v['sb_style'].get().lower()})" if v["sb"].get() else "")
                               + ("\nTrial ended: highlights video only, 720p" if trial_left() == 0 else ""))
    for k in ("fmt", "res", "fps", "quality", "reel", "longest", "full", "clips", "top", "reel_mode", "sb", "sb_style"):
        v[k].trace_add("write", summarize)
    summarize()
    go = ctk.CTkButton(right, text="Make highlights", height=56, corner_radius=14, font=F(19, True, "Bahnschrift"),
                       fg_color=LIME, hover_color=LIME2, text_color=ON, text_color_disabled="#4d5a2a",
                       command=lambda: start(v["input"].get()))
    go.pack(fill="x", padx=22, pady=(16, 14))
    prow = ctk.CTkFrame(right, fg_color="transparent")
    prow.pack(fill="x", padx=22)
    pct = ctk.CTkLabel(prow, text="0%", font=F(34, True, "Bahnschrift"), text_color=INK, height=40)
    pct.pack(side="left")
    elapsed = ctk.CTkLabel(prow, text="", font=SMALL, text_color=MUTED)
    elapsed.pack(side="right", anchor="s")
    bar = MotionBar(right)
    bar.pack(fill="x", padx=22, pady=(4, 0))
    stage = ctk.CTkLabel(right, text="Ready when you are.", font=SMALL, text_color=MUTED, anchor="w")
    stage.pack(fill="x", padx=22, pady=(6, 10))
    qr_box = ctk.CTkLabel(right, text="Scan-to-download QR\nappears here", width=200, height=200, fg_color=FIELD,
                          corner_radius=16, font=SMALL, text_color=MUTED)
    qr_box.pack(pady=(2, 8))
    url_lbl = ctk.CTkLabel(right, text="", font=SMALL, text_color=CYAN, wraplength=310)
    url_lbl.pack(padx=22)
    row = ctk.CTkFrame(right, fg_color="transparent")
    row.pack(fill="x", padx=22, pady=(8, 0))
    button(row, "Open folder", lambda: state["out"] and os.startfile(state["out"]), height=36).pack(side="left", fill="x", expand=True)
    button(row, "Copy link", lambda: state["url"] and (root.clipboard_clear(), root.clipboard_append(state["url"]), log("Link copied.")),
           height=36).pack(side="left", fill="x", expand=True, padx=(8, 0))
    foot = ctk.CTkFrame(right, fg_color="transparent")
    foot.pack(side="bottom", fill="x", padx=22, pady=(0, 14))
    if OWNER_PNG.exists():
        ctk.CTkLabel(foot, text="", image=img(OWNER_PNG, 22)).pack(side="right")
    ctk.CTkLabel(foot, text=f"{APP} v{VERSION}\n© 2026 {OWNER}. All rights reserved.", font=SMALL, text_color=MUTED,
                 justify="left").pack(side="left")
    tools = ctk.CTkFrame(right, fg_color="transparent")
    tools.pack(side="bottom", fill="x", padx=22, pady=(6, 18))
    button(tools, "Detection settings", detection_window, height=34).pack(side="left", fill="x", expand=True)
    def reset():
        v["preset"].set("Recommended")
        apply_preset()
        for k in ("sensitivity", "min_hits", "gap", "pre", "post", "inset", "motion"):
            v[k].set(DEFAULTS[k])
        remember()
        log("Back to the recommended settings.")
    button(tools, "Reset", reset, height=34, width=80).pack(side="left", padx=(8, 0))
    logbox = ctk.CTkTextbox(right, height=70, fg_color=FIELD, text_color=MUTED, font=F(11, fam="Consolas"), corner_radius=12)
    logbox.pack(side="bottom", fill="both", expand=True, padx=22, pady=(10, 4))

    # ---- behaviour
    def log(msg):
        msgs.put(("log", msg))

    def set_status(text, color):
        status.configure(text="●  " + text, text_color=color)

    def opts():
        o = {k: v[k].get() for k in DEFAULTS}
        o["top"], o["min_hits"], o["sensitivity"], o["inset"] = int(o["top"]), int(o["min_hits"]), int(o["sensitivity"]), int(o["inset"])
        o["logo"] = str(BRAND_PNG) if o["wm"] == "Playhouse logo" and BRAND_PNG.exists() else o["logo"] if o["wm"] == "Custom PNG" else ""
        return o

    def start(path, auto=False):
        if state["busy"]:
            return
        if not path or not Path(path).is_file():
            messagebox.showwarning("Choose a video", "Pick a match video first.")
            return
        if not any(v[k].get() for k in ("reel", "longest", "full", "clips")):
            messagebox.showwarning("Nothing to export", "Turn on at least one output.")
            return
        remember()
        state["busy"], state["t0"] = True, time.time()
        go.configure(state="disabled", text="Working…")
        set_status("Working", LIME2)
        bar.set(0)
        o, out_dir = opts(), v["out"].get()
        state["src"] = path
        if auto and o["sb"] and o["sb_src"] == SB_SOURCES[1]:
            log("Watch-folder run: tap-after-the-match scoring is skipped. Use phone scoring for automatic runs.")
        def work():
            try:
                out, files, segs = process(path, out_dir, o, log, lambda f, t: msgs.put(("step", (f, t))),
                                           None if auto else gui_scorer)
                msgs.put(("done", out))
            except Exception as e:                  # surface ffmpeg or detection errors
                msgs.put(("error", str(e)))
        threading.Thread(target=work, daemon=True).start()

    def finish(out):
        state["out"] = out
        if v["deliver_qr"].get():
            url = v["qr_link"].get().strip() if v["qr_mode"].get() == "Custom link" else share.start(out)
            if url:
                png = save_qr(url, Path(out) / "share-qr.png")
                qr_box.configure(image=ctk.CTkImage(Image.open(png), Image.open(png), size=(200, 200)), text="")
                url_lbl.configure(text=url)
                state["url"] = url
                log(f"QR code ready: {url}")

    def pump():
        while not msgs.empty():
            kind, data = msgs.get()
            if kind == "log":
                logbox.insert("end", data + "\n")
                logbox.see("end")
            elif kind == "step":
                bar.set(data[0])
                stage.configure(text=data[1])
            elif kind == "score":
                set_status("Scoring", CYAN)
                try:
                    score_window(*data)
                except Exception as e:           # never leave the worker waiting
                    logbox.insert("end", f"Scoring window failed: {e}\n")
                    data[2]["winners"] = None
                    data[3].set()
            else:
                state["busy"] = False
                go.configure(state="normal", text="Make highlights")
                if kind == "done":
                    bar.set(1.0, active=False)
                    set_status("Done", CYAN)
                    try:
                        finish(data)
                    except Exception as e:
                        logbox.insert("end", f"QR code failed: {e}\n")
                else:
                    bar.set(bar.shown, active=False)
                    set_status("Error", ERR)
                    stage.configure(text="Could not finish. See the log.")
                    logbox.insert("end", "Error: " + data + "\n")
                    messagebox.showerror("Could not finish", data)
        if state["busy"]:
            s = int(time.time() - state["t0"])
            elapsed.configure(text=f"{s // 60}:{s % 60:02d} elapsed")
        root.after(120, pump)

    def toggle_watch():
        if v["watch"].get() and trial_left() == 0:
            v["watch"].set(False)
            messagebox.showinfo("Full version", f"Watch-folder automation is part of the full version. Contact {OWNER} to unlock it.")
        elif v["watch"].get() and not Path(v["watch_dir"].get()).is_dir():
            v["watch"].set(False)
            messagebox.showwarning("Watch folder", "Choose a folder to watch first.")
        elif v["watch"].get():
            folder = Path(v["watch_dir"].get())
            state["seen"] = {p for p in folder.iterdir() if p.suffix.lower() in VIDEO_EXT}
            log(f"Watching {folder} for new recordings ...")
            set_status("Watching", CYAN)
            if not state.get("watching"):
                state["watching"] = True
                watch_tick({})
        else:
            set_status("Ready", CYAN)

    def watch_tick(sizes):
        if not v["watch"].get():
            state["watching"] = False
            return
        folder = Path(v["watch_dir"].get())
        try:
            for p in folder.iterdir() if folder.is_dir() else []:
                if p.suffix.lower() in VIDEO_EXT and p not in state["seen"] and not state["busy"]:
                    size = p.stat().st_size
                    if sizes.get(p) == size:            # size unchanged for 10 s: the camera finished writing
                        state["seen"].add(p)
                        v["input"].set(str(p))
                        log(f"New recording: {p.name}")
                        start(str(p), auto=True)
                    sizes[p] = size
        except OSError as e:                        # file renamed/removed mid-scan: try again next tick
            log(f"Watch folder: {e}")
        root.after(10000, lambda: watch_tick(sizes))

    show("Home")
    root.protocol("WM_DELETE_WINDOW", lambda: (remember(), share.stop(), scoring.stop(), root.destroy()))
    if trial_chip:
        trial_tick()
        if trial_left():
            log(f"Trial edition: every feature is on for {round(trial_left())} more hours.")
    pump()
    root.mainloop()


# ---------------------------------------------------------------- self check + CLI
def selftest():
    assert set(DETECT_HELP) == {"Sensitivity", "Min hits", "Max gap (s)", "Pre-roll (s)", "Post-roll (s)", "Ignore edges %", "Court motion"}
    vs = {"res": 720, "crf": 23, "fmt": "libx265", "fps": 30}
    assert vfilter(vs) == "scale=-2:min(ih\\,720),fps=30" and vfilter(dict(vs, res=None, fps=None)) == "null"
    assert "hvc1" in encoder(vs) and encoder(vs)[encoder(vs).index("-crf") + 1] == "27"
    assert encoder(dict(vs, fmt="copy"))[1] == "libx264"                # the reel can't stream-copy
    hits = [10, 11, 12, 13, 30, 31, 50, 51.5, 53, 54.5, 56]
    segs = find_rallies(hits, 120, gap=2.5, min_hits=3, pre=1.8, post=1.2)
    assert segs == [(8.2, 14.2, 4), (48.2, 57.2, 5)], segs          # the 2-hit burst at 30 s is dropped
    merged = find_rallies([10, 11, 12, 14.8, 16, 17], 60, gap=2.5, min_hits=3, pre=1.8, post=1.2)
    assert merged == [(8.2, 18.2, 6)], merged                         # padding overlap -> one clip
    assert find_rallies([5, 6, 7], 7.5, pre=1.8, post=1.2) == [(3.2, 7.5, 3)]   # clamped to video length
    assert longest_rally(segs) == (48.2, 57.2, 5) and best_rallies(segs, 1) == [(48.2, 57.2, 5)]
    assert all(k in DEFAULTS and (k not in CHOICES or val in CHOICES[k]) for p in PRESETS.values() for k, val in p.items())
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
    assert point_chains([1, 2, 10, 30, 31], 2.5) == [(1, 2, 2), (10, 10, 1), (30, 31, 2)]
    tl = score_timeline([(10, 12, 3), (20, 25, 4)], score_states([0, 1], SCORING[2]), 8, 30)
    assert [round(t, 1) for t, _, _ in tl] == [0, 4, 17] and tl[-1][2]["p"] == [1, 1]
    sbs = dict(style="Broadcast", fmt=SCORING[0], to=11, server=True, games=True, names=("Team A", "Team B"))
    for style in SB_STYLES:
        sizes = {scoreboard_png(st, dict(sbs, style=style), 1920, 1080).size for pair in score_states([0, 1, 1, 0] * 6) for st in pair}
        assert len(sizes) == 1, (style, sizes)                      # every score draws on the same canvas
    assert out_size((1920, 1080), {"res": 1080}, True) == (606, 1080) and out_size((1280, 720), {"res": 1080}, False) == (1280, 720)
    # phone taps: a PC clock 90 s ahead is corrected by lining taps up with rally ends
    sh, n = align_shift([13 + 90, 20 + 90, 31 + 90, 52 + 90], [11.4, 18.0, 29.5, 35.0, 49.8])
    assert -92 <= sh <= -89 and n == 4, (sh, n)
    assert court_of("Court 2 - Sep 24 7PM.mp4") == 2 and court_of("match.mp4") is None
    assert [len(g) for g in split_games([{"team": 0}, {"new": True}, {"team": 1}, {"team": 0}])] == [1, 2]
    assert hours_left(0, 3600) == 23 and hours_left(0, 25 * 3600) == 0 and hours_left(10000, 0) == 0   # set-back clock
    assert trial_left() is None or TRIAL_FLAG.exists()                  # source runs are the full version
    print("selftest ok")

def main():
    ap = argparse.ArgumentParser(description=f"{APP} v{VERSION} · © 2026 {OWNER}")
    ap.add_argument("--selftest", action="store_true")
    ap.add_argument("--cli", metavar="VIDEO", help="process one video without the window")
    ap.add_argument("--out", default=str(Path.home() / "Videos" / APP))
    ap.add_argument("--highlights", default="all", choices=["all", "best", "none"], help="one video with all rallies, the best --top, or none")
    ap.add_argument("--top", type=int, default=8)
    ap.add_argument("--longest", action="store_true", help="also save the longest rally")
    ap.add_argument("--full", action="store_true", help="also save the full game")
    ap.add_argument("--clips", action="store_true", help="also save one clip per rally")
    ap.add_argument("--landscape", action="store_true", help="16:9 instead of vertical 9:16")
    ap.add_argument("--format", default="mp4", choices=["mp4", "hevc", "copy"])
    ap.add_argument("--res", default="1080p", choices=list(RES))
    ap.add_argument("--fps", default="30", choices=list(FPS))
    ap.add_argument("--quality", default="Standard", choices=list(CRF))
    ap.add_argument("--logo", default="", help="watermark PNG")
    ap.add_argument("--brand", action="store_true", help="watermark with the bundled Playhouse Pickle logo")
    ap.add_argument("--sensitivity", type=int, default=6)
    ap.add_argument("--score", metavar="ABB0A", help="add a scoreboard: who won each point in order (A, B, or 0 = not a point)")
    ap.add_argument("--sb-style", default="Broadcast", choices=list(SB_STYLES))
    ap.add_argument("--scoring", default=SCORING[0], choices=list(SCORING))
    ap.add_argument("--game-to", default="11", choices=list(GAME_TO))
    ap.add_argument("--teams", default="Team A,Team B", help="two names, comma separated")
    a = ap.parse_args()
    if a.selftest:
        return selftest()
    if not a.cli:
        return run_app()
    o = dict(DEFAULTS, fmt={"mp4": "MP4 · iPhone + Android", "hevc": "HEVC · smaller", "copy": "Camera copy"}[a.format],
             res=a.res, fps=a.fps, quality=a.quality, reel=a.highlights != "none",
             reel_mode="All rallies" if a.highlights == "all" else "Best rallies", top=a.top, longest=a.longest, full=a.full,
             clips=a.clips, vertical=not a.landscape, logo=str(BRAND_PNG) if a.brand else a.logo, sensitivity=a.sensitivity,
             sb=bool(a.score), sb_style=a.sb_style, sb_fmt=a.scoring, sb_to=a.game_to,
             team_a=(a.teams.split(",") + ["Team B"])[0], team_b=(a.teams.split(",") + ["Team B"])[1])
    def scorer(chains, segs):
        ws = [{"A": 0, "B": 1}.get(ch) for ch in a.score.upper()]
        print(f"Scoring {min(len(ws), len(chains))} of {len(chains)} rallies from --score.")
        return (ws + [None] * len(chains))[:len(chains)]
    if not (o["reel"] or o["longest"] or o["full"] or o["clips"]):
        ap.error("nothing to export: use --highlights, --longest, --full or --clips")
    process(a.cli, a.out, o, step=lambda f, t: print(f"  {f * 100:5.1f}%  {t}", flush=True), scorer=scorer if a.score else None)

if __name__ == "__main__":
    main()
