"""Highlight Studio IO v3.0 · © 2026 LINKMEIO. All rights reserved.

Automatic pickleball highlights, licensed to Playhouse Pickle. Finds the rallies in a match video
(paddle "pop" sounds + on-court motion), then exports one highlights video with every rally, the
longest rally, the full game and/or one clip per rally, and shares them by QR code on the venue WiFi.

    python highlight_cutter.py                      desktop app
    python highlight_cutter.py --cli match.mp4      command line (see --help)
    python highlight_cutter.py --selftest           quick logic check
"""
import argparse, functools, http.server, json, os, queue, re, socket, subprocess, sys, tempfile, threading, time
from pathlib import Path

import numpy as np
import imageio_ffmpeg

APP, VERSION, OWNER = "Highlight Studio IO", "3.0", "LINKMEIO"
FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()          # bundled ffmpeg, nothing to install
NOWIN = subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0
VIDEO_EXT = {".mp4", ".mov", ".mkv", ".avi", ".m4v"}
FMT = {"MP4 · iPhone + Android": "libx264", "HEVC · smaller": "libx265", "Camera copy": "copy"}   # the first plays everywhere
RES = {"Original": None, "1080p": 1080, "720p": 720, "480p": 480}
FPS = {"Original": None, "30": 30, "60": 60}
CRF = {"High": 18, "Standard": 23, "Small file": 28}
REEL_MODES = ("All rallies", "Best rallies")
WATERMARKS = ("Playhouse logo", "Custom PNG", "None")
CHOICES = {"fmt": FMT, "res": RES, "fps": FPS, "quality": CRF, "reel_mode": REEL_MODES, "wm": WATERMARKS}
DEFAULTS = dict(fmt="MP4 · iPhone + Android", res="1080p", fps="30", quality="Standard",       # = the Recommended preset
                reel=True, reel_mode="All rallies", top=8, longest=True, full=True, clips=False, vertical=True,
                wm="Playhouse logo", logo="", sensitivity=6, min_hits=3, gap=2.5, pre=1.8, post=1.2, motion=True, inset=5)
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

def video_height(path):
    err = subprocess.run([FFMPEG, "-hide_banner", "-i", str(path)], capture_output=True, text=True,
                         creationflags=NOWIN).stderr
    m = re.search(r"Video:.*?(\d{2,5})x(\d{2,5})", err)
    return int(m[2]) if m else 1080

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

def find_rallies(hits, duration, gap=2.5, min_hits=3, pre=1.8, post=1.2, active=None):
    """Chain hits closer than `gap` s into rallies of >= min_hits, pad them, merge overlaps -> [(start, end, hits)]."""
    hits = sorted(t for t in hits if active is None or active(t))
    chains, start, last, n = [], None, None, 0
    for t in hits:
        if start is None or t - last > gap:
            if start is not None and n >= min_hits:
                chains.append((start, last, n))
            start, n = t, 0
        last, n = t, n + 1
    if start is not None and n >= min_hits:
        chains.append((start, last, n))
    segs = []
    for a, b, n in chains:
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


# ---------------------------------------------------------------- export
def cut_clip(src, a, b, dst, vs, prog=None):
    if vs["fmt"] == "copy":     # stream copy: seconds, not minutes (exact when the camera writes 1 s keyframes)
        ff(["-ss", f"{a:.2f}", "-i", str(src), "-t", f"{b - a:.2f}", "-c", "copy", "-avoid_negative_ts", "make_zero",
            "-movflags", "+faststart", str(dst)])
    else:
        ff(["-ss", f"{a:.2f}", "-i", str(src), "-t", f"{b - a:.2f}", "-vf", vfilter(vs), *encoder(vs), str(dst)], b - a, prog)

def build_reel(src, segs, dst, vs, vertical, logo, prog=None):
    """Join rallies into one video (crop to 9:16 when vertical, watermark top-right)."""
    sh = video_height(src)
    H = min(vs["res"] or sh, sh)                    # real output height: never upscaled
    crop = "crop=min(iw\\,trunc(ih*9/16/2)*2):min(ih\\,trunc(iw*16/9/2)*2)"
    vf = vfilter(vs, H, crop if vertical else "") + ",setsar=1"
    total, done = sum(b - a for a, b, _ in segs) or 1, 0.0
    with tempfile.TemporaryDirectory() as tmp:
        parts = []
        for k, (a, b, _) in enumerate(segs):
            part, args = Path(tmp) / f"r{k:03d}.mp4", ["-ss", f"{a:.2f}", "-t", f"{b - a:.2f}", "-i", str(src)]   # -t before -i: limits the video, not the logo
            if logo:
                lw, m = int((H * 9 / 16 * 0.34) if vertical else (H * 16 / 9 * 0.16)), int(H * 0.03)
                args += ["-i", str(logo), "-filter_complex", f"[0:v]{vf}[v];[1:v]scale={lw}:-1[l];[v][l]overlay=W-w-{m}:{m}[out]",
                         "-map", "[out]", "-map", "0:a?"]
            else:
                args += ["-vf", vf, "-map", "0:v:0", "-map", "0:a?"]
            ff(args + encoder(vs) + [str(part)], b - a, prog and (lambda f, d=done, s=b - a: prog((d + f * s) / total)))
            done += b - a
            parts.append(part)
        (Path(tmp) / "list.txt").write_text("".join(f"file '{p.as_posix()}'\n" for p in parts))
        ff(["-f", "concat", "-safe", "0", "-i", str(Path(tmp) / "list.txt"), "-c", "copy", "-movflags", "+faststart", str(dst)])

def full_game(src, dst, vs, dur, prog=None):
    if vs["fmt"] == "copy":
        ff(["-i", str(src), "-c", "copy", "-movflags", "+faststart", str(dst)])
    else:
        ff(["-i", str(src), "-vf", vfilter(vs), *encoder(vs), str(dst)], dur, prog)


# ---------------------------------------------------------------- the whole job
def process(src, out_dir, opt, log=print, step=lambda frac, text: None):
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
                       span(w, f"Highlights video · {len(reel)} rallies"))
            files.append(out / "highlights.mp4")
        elif job == "longest":
            log(f"Longest rally: {top1[1] - top1[0]:.0f} s, {top1[2]} hits.")
            build_reel(src, [top1], out / "longest-rally.mp4", vs, opt["vertical"], opt["logo"] or None, span(w, "Longest rally"))
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
            full_game(src, dst, vs, dur, span(w, "Full game"))
            files.append(dst)
        done += w
    (out / "rallies.json").write_text(json.dumps({"source": src.name, "duration_s": round(dur, 1),
        "rallies": [{"start_s": a, "end_s": b, "hits": n} for a, b, n in segs]}, indent=2))
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
TRIAL_LIMITS = dict(reel=True, longest=False, full=False, clips=False, res="720p", logo=str(OWNER_PNG))
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
    BG, CARD, LINE, FIELD = "#09090b", "#111114", "#24242b", "#18181d"
    INK, MUTED, RED, RED2, CYAN = "#f4f6f6", "#8e9196", "#e81414", "#ff3434", "#5fe0e0"
    ctk.set_appearance_mode("dark")
    root = ctk.CTk(fg_color=BG)
    root.title(f"{APP} · Playhouse Pickle")
    root.geometry("1240x850")
    root.minsize(1100, 720)
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
    state = {"out": None, "busy": False, "seen": set(), "url": "", "applying": False, "t0": 0.0}

    # ---- building blocks
    def button(parent, text, cmd, primary=False, **kw):
        return ctk.CTkButton(parent, text=text, command=cmd, corner_radius=12, font=H2 if primary else TXT,
                             fg_color=RED if primary else FIELD, hover_color=RED2 if primary else LINE,
                             text_color="#ffffff" if primary else INK, border_width=0 if primary else 1, border_color=LINE, **kw)

    def card(title, sub):
        c = ctk.CTkFrame(left, fg_color=CARD, corner_radius=18, border_width=1, border_color=LINE)
        c.pack(fill="x", pady=(0, 14), padx=(0, 10))
        h = ctk.CTkFrame(c, fg_color="transparent")
        h.pack(fill="x", padx=22, pady=(16, 6))
        ctk.CTkFrame(h, width=4, height=16, corner_radius=2, fg_color=RED).pack(side="left", padx=(0, 10))
        ctk.CTkLabel(h, text=title.upper(), font=H2, text_color=INK).pack(side="left")
        ctk.CTkLabel(h, text=sub, font=SMALL, text_color=MUTED).pack(side="left", padx=12)
        inner = ctk.CTkFrame(c, fg_color="transparent")
        inner.pack(fill="x", padx=22, pady=(0, 18))
        return inner

    def line(parent, label):
        r = ctk.CTkFrame(parent, fg_color="transparent")
        r.pack(fill="x", pady=5)
        ctk.CTkLabel(r, text=label, width=124, anchor="w", font=TXT, text_color=MUTED).pack(side="left")
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
                            wraplength=600 if below else 330, justify="left") if hints else None
        if hint:
            hint.pack(anchor="w", padx=(124, 0)) if below else hint.pack(side="left", padx=14)
        btns = {o: ctk.CTkButton(g, text=o, height=32, width=64, corner_radius=11, font=TXT, command=lambda o=o: var.set(o))
                for o in options}
        for b in btns.values():
            b.pack(side="left", padx=3, pady=3)
        def paint(*_):
            for o, b in btns.items():
                on = var.get() == o
                b.configure(fg_color=RED if on else FIELD, hover_color=RED2 if on else LINE, text_color="#ffffff" if on else INK)
            if hint:
                hint.configure(text=hints.get(var.get(), ""))
        var.trace_add("write", paint)
        paint()
        return r

    def switch(parent, text, var, cmd=None):
        s = ctk.CTkSwitch(parent, text=text, variable=var, onvalue=True, offvalue=False, command=cmd, font=TXT, text_color=INK,
                          progress_color=RED, fg_color=LINE, button_color="#ffffff", button_hover_color="#e8e8e8")
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
        ctk.CTkSlider(r, from_=lo, to=hi, number_of_steps=steps, variable=var, width=230, progress_color=RED,
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
        a, b = (0xe8, 0x14, 0x14), (0x5f, 0xe0, 0xe0)
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
                self.create_oval(0, 0, h, h, fill=RED, width=0)
                self.create_oval(fw - h, 0, fw, h, fill=blend(1.0), width=0)
                if self.active:
                    for x in range(-28 + self.phase, fw - h, 28):
                        self.create_polygon(x, h, x + 10, 0, x + 18, 0, x + 8, h, fill="#ffffff", stipple="gray25", width=0)

    # ---- header: product, version, licensee, status
    top = ctk.CTkFrame(root, fg_color="transparent")
    top.pack(fill="x", padx=28, pady=(20, 8))
    brand = ctk.CTkFrame(top, fg_color="transparent")
    brand.pack(side="left")
    row1 = ctk.CTkFrame(brand, fg_color="transparent")
    row1.pack(anchor="w")
    ctk.CTkLabel(row1, text="Highlight Studio", font=H1, text_color=INK, height=32).pack(side="left")
    ctk.CTkLabel(row1, text=" IO ", font=F(18, True, "Bahnschrift"), text_color="#ffffff", fg_color=RED, corner_radius=8,
                 height=28).pack(side="left", padx=(8, 0))
    ctk.CTkLabel(row1, text=f"  v{VERSION} · PREMIUM  ", font=F(10, True), text_color=CYAN, fg_color=FIELD, corner_radius=8,
                 height=22).pack(side="left", padx=10)
    trial_chip = ctk.CTkLabel(row1, text="", font=F(10, True), corner_radius=8, height=22) if TRIAL_FLAG.exists() else None
    if trial_chip:
        trial_chip.pack(side="left")
    ctk.CTkLabel(brand, text="Automatic rally highlights and full game exports", font=SMALL, text_color=MUTED, height=16).pack(anchor="w")
    status = ctk.CTkLabel(top, text="●  Ready", font=H2, text_color=CYAN, fg_color=FIELD, corner_radius=14, height=32, width=120)
    status.pack(side="right")
    if BRAND_PNG.exists():
        lic = ctk.CTkFrame(top, fg_color="transparent")
        lic.pack(side="right", padx=22)
        ctk.CTkLabel(lic, text="PREPARED FOR" if trial_chip else "LICENSED TO", font=F(9, True), text_color=MUTED, height=12).pack(anchor="e")
        ctk.CTkLabel(lic, text="", image=img(BRAND_PNG, 30)).pack(anchor="e")
    rule = tk.Canvas(root, height=2, bg=BG, highlightthickness=0)
    rule.pack(fill="x", padx=28)
    rule.bind("<Configure>", lambda e: (rule.delete("all"), gradient(rule, 0, e.width, 0, 2)))
    ended = ctk.CTkLabel(root, text=f"Your {TRIAL_HOURS}-hour trial has ended.  {TRIAL_NOTE}  Contact {OWNER} to unlock the full version.",
                         font=H2, text_color="#ffffff", fg_color=RED, corner_radius=12, height=36)
    def trial_tick():
        left = trial_left()
        if left:
            trial_chip.configure(text=f"  TRIAL · {max(1, round(left))} H LEFT  ", text_color=BG, fg_color=CYAN)
        else:
            trial_chip.configure(text="  TRIAL ENDED · FREE TIER  ", text_color="#ffffff", fg_color=RED)
            if not ended.winfo_ismapped():
                ended.pack(fill="x", padx=28, pady=(12, 0), after=rule)
            v["watch"].set(False)
        root.after(60000, trial_tick)

    # ---- footer: ownership mark, bottom right
    foot = ctk.CTkFrame(root, fg_color="transparent")
    foot.pack(side="bottom", fill="x", padx=28, pady=(0, 12))
    if OWNER_PNG.exists():
        ctk.CTkLabel(foot, text="", image=img(OWNER_PNG, 22)).pack(side="right")
    ctk.CTkLabel(foot, text=f"{APP} v{VERSION}  ·  © 2026 {OWNER}. All rights reserved.", font=SMALL,
                 text_color=MUTED).pack(side="right", padx=12)

    body = ctk.CTkFrame(root, fg_color="transparent")
    body.pack(fill="both", expand=True, padx=28, pady=(14, 10))
    left = ctk.CTkScrollableFrame(body, fg_color="transparent", scrollbar_button_color=LINE, scrollbar_button_hover_color=MUTED)
    left.pack(side="left", fill="both", expand=True)
    right = ctk.CTkFrame(body, width=360, fg_color=CARD, corner_radius=20, border_width=1, border_color=LINE)
    right.pack(side="right", fill="y", padx=(16, 0))
    right.pack_propagate(False)

    # ---- 0 preset
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
    c = card("Exports", "what the player takes home")
    r = line(c, "Outputs")
    switch(r, "Highlights video", v["reel"])
    switch(r, "Longest rally", v["longest"])
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

    # ---- 3 video output
    c = card("Video output", "format, size and smoothness")
    seg(c, "Format", v["fmt"], list(FMT), {"MP4 · iPhone + Android": "One file for iPhone, Android, PC, Facebook and TikTok",
                                           "HEVC · smaller": "Half the size; older Android and Windows may not play it",
                                           "Camera copy": "Instant, keeps the camera's own format"}, below=True)
    seg(c, "Resolution", v["res"], list(RES), {"1080p": "Full HD. A smaller video is never upscaled"})
    seg(c, "Frame rate", v["fps"], list(FPS), {"30": "Standard for social video", "60": "Smoother, bigger files"})
    seg(c, "Quality", v["quality"], list(CRF))

    # ---- 4 delivery
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
                               + ("\nTrial ended: highlights video only, 720p" if trial_left() == 0 else ""))
    for k in ("fmt", "res", "fps", "quality", "reel", "longest", "full", "clips", "top", "reel_mode"):
        v[k].trace_add("write", summarize)
    summarize()
    go = ctk.CTkButton(right, text="Make highlights", height=56, corner_radius=14, font=F(19, True, "Bahnschrift"),
                       fg_color=RED, hover_color=RED2, text_color="#ffffff", text_color_disabled="#f3b4b4",
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

    def start(path):
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
        set_status("Working", RED2)
        bar.set(0)
        o, out_dir = opts(), v["out"].get()
        def work():
            try:
                out, files, segs = process(path, out_dir, o, log, lambda f, t: msgs.put(("step", (f, t))))
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
                    set_status("Error", RED2)
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
                        start(str(p))
                    sizes[p] = size
        except OSError as e:                        # file renamed/removed mid-scan: try again next tick
            log(f"Watch folder: {e}")
        root.after(10000, lambda: watch_tick(sizes))

    root.protocol("WM_DELETE_WINDOW", lambda: (remember(), share.stop(), root.destroy()))
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
    a = ap.parse_args()
    if a.selftest:
        return selftest()
    if not a.cli:
        return run_app()
    o = dict(DEFAULTS, fmt={"mp4": "MP4 · iPhone + Android", "hevc": "HEVC · smaller", "copy": "Camera copy"}[a.format],
             res=a.res, fps=a.fps, quality=a.quality, reel=a.highlights != "none",
             reel_mode="All rallies" if a.highlights == "all" else "Best rallies", top=a.top, longest=a.longest, full=a.full,
             clips=a.clips, vertical=not a.landscape, logo=str(BRAND_PNG) if a.brand else a.logo, sensitivity=a.sensitivity)
    if not (o["reel"] or o["longest"] or o["full"] or o["clips"]):
        ap.error("nothing to export: use --highlights, --longest, --full or --clips")
    process(a.cli, a.out, o, step=lambda f, t: print(f"  {f * 100:5.1f}%  {t}", flush=True))

if __name__ == "__main__":
    main()
