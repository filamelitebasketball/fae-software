"""Your Brand Highlight Cutter: Playhouse Pickle desktop tool, built by F.A.E.

Finds the rallies in a pickleball match video (paddle "pop" sounds + on-court motion), then
exports a highlight reel, one clip per rally and/or the full game, and shares them by QR code
over the venue WiFi.

    python highlight_cutter.py                      desktop app
    python highlight_cutter.py --cli match.mp4      command line (see --help)
    python highlight_cutter.py --selftest           quick logic check
"""
import argparse, functools, http.server, json, os, queue, re, socket, subprocess, sys, tempfile, threading
from pathlib import Path

import numpy as np
import imageio_ffmpeg

FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()          # bundled ffmpeg, nothing to install
NOWIN = subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0
VIDEO_EXT = {".mp4", ".mov", ".mkv", ".avi", ".m4v"}
RES = {"Original": None, "1080p": 1080, "720p": 720, "480p": 480}
FMT = {"MP4 · iPhone + Android": "libx264", "HEVC · smaller": "libx265", "Camera copy": "copy"}   # the first plays everywhere
FPS = {"Original": None, "30": 30, "60": 60}
WATERMARKS = ("Playhouse logo", "Custom PNG", "None")
CRF = {"High": 18, "Standard": 23, "Small file": 28}
CHOICES = {"res": RES, "fmt": FMT, "fps": FPS, "quality": CRF}
DEFAULTS = dict(fmt="MP4 · iPhone + Android", res="720p", fps="Original", wm="Playhouse logo", quality="Standard", reel=True, clips=True, full=False, vertical=True, top=8,
                logo="", sensitivity=6, min_hits=3, gap=2.5, pre=1.8, post=1.2, motion=True, inset=5)


# ---------------------------------------------------------------- ffmpeg helpers
def ff(args):
    subprocess.run([FFMPEG, "-hide_banner", "-loglevel", "error", "-y", *args], check=True,
                   capture_output=True, creationflags=NOWIN)

def encoder(vs):
    """Output args for the chosen format. The reel always re-encodes, so "copy" falls back to H.264 there."""
    codec = "libx264" if vs["fmt"] == "copy" else vs["fmt"]
    h265 = codec == "libx265"
    return ["-c:v", codec, "-preset", "veryfast", "-crf", str(vs["crf"] + (4 if h265 else 0)),   # x265 matches x264 at ~+4 CRF
            *([] if h265 else ["-profile:v", "high"]),                                             # High profile: every iPhone since 2013
            "-pix_fmt", "yuv420p", *(["-tag:v", "hvc1"] if h265 else []),                        # hvc1: iPhones play it
            "-c:a", "aac", "-b:a", "128k", "-ar", "48000", "-movflags", "+faststart"]

def vfilter(vs, height=None, first=""):
    """crop (optional) -> scale to height -> frame rate."""
    parts = [first] if first else []
    if height or vs["res"]:
        parts.append(f"scale=-2:{height or vs['res']}")
    if vs["fps"]:
        parts.append(f"fps={vs['fps']}")
    return ",".join(parts) or "null"

SETTINGS = Path(os.environ.get("APPDATA") or Path.home()) / "YourBrandHighlightCutter" / "settings.json"

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

def duration_of(path):
    err = subprocess.run([FFMPEG, "-hide_banner", "-i", str(path)], capture_output=True, text=True,
                         creationflags=NOWIN).stderr
    m = re.search(r"Duration: (\d+):(\d+):([\d.]+)", err)
    return int(m[1]) * 3600 + int(m[2]) * 60 + float(m[3]) if m else 0.0


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

def motion_curve(path, fps=5, inset=0.05):
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


# ---------------------------------------------------------------- export
def cut_clip(src, a, b, dst, vs):
    if vs["fmt"] == "copy":     # stream copy: seconds, not minutes (exact when the camera writes 1 s keyframes)
        ff(["-ss", f"{a:.2f}", "-i", str(src), "-t", f"{b - a:.2f}", "-c", "copy", "-avoid_negative_ts", "make_zero", str(dst)])
    else:
        ff(["-ss", f"{a:.2f}", "-i", str(src), "-t", f"{b - a:.2f}", "-vf", vfilter(vs), *encoder(vs), str(dst)])

def build_reel(src, segs, dst, vs, vertical, logo):
    H = vs["res"] or 1080
    vf = vfilter(dict(vs, fps=vs["fps"] or 30), H, "crop=trunc(ih*9/16/2)*2:ih" if vertical else "") + ",setsar=1"
    with tempfile.TemporaryDirectory() as tmp:
        parts = []
        for k, (a, b, _) in enumerate(segs):
            part, args = Path(tmp) / f"r{k:03d}.mp4", ["-ss", f"{a:.2f}", "-i", str(src), "-t", f"{b - a:.2f}"]
            if logo:
                lw, m = int((H * 9 / 16 * 0.34) if vertical else (H * 16 / 9 * 0.16)), int(H * 0.03)
                args += ["-i", str(logo), "-filter_complex", f"[0:v]{vf}[v];[1:v]scale={lw}:-1[l];[v][l]overlay=W-w-{m}:{m}[out]",
                         "-map", "[out]", "-map", "0:a?"]
            else:
                args += ["-vf", vf, "-map", "0:v:0", "-map", "0:a?"]
            ff(args + encoder(vs) + [str(part)])
            parts.append(part)
        (Path(tmp) / "list.txt").write_text("".join(f"file '{p.as_posix()}'\n" for p in parts))
        ff(["-f", "concat", "-safe", "0", "-i", str(Path(tmp) / "list.txt"), "-c", "copy", "-movflags", "+faststart", str(dst)])

def full_game(src, dst, vs):
    ff(["-i", str(src), "-c", "copy", str(dst)] if vs["fmt"] == "copy" else ["-i", str(src), "-vf", vfilter(vs), *encoder(vs), str(dst)])


# ---------------------------------------------------------------- the whole job
def process(src, out_dir, opt, log=print, step=lambda frac, text: None):
    src = Path(src)
    out = Path(out_dir) / f"{src.stem}-highlights"
    out.mkdir(parents=True, exist_ok=True)
    log(f"Reading {src.name} ...")
    step(0.03, "Listening for paddle hits")
    dur = duration_of(src)
    hits = audio_hits(src, opt["sensitivity"])
    step(0.2, "Tracking court motion")
    curve, fps = motion_curve(src, inset=opt["inset"] / 100) if (opt["motion"] or not hits) else (np.array([]), 5)
    if not hits and len(curve):
        hits = motion_peaks(curve, fps)
        log("No paddle sounds found, using movement only.")
    active = make_active(curve, fps) if opt["motion"] and len(curve) else None
    segs = find_rallies(hits, dur, opt["gap"], opt["min_hits"], opt["pre"], opt["post"], active)
    log(f"{len(hits)} hits found, {len(segs)} rallies in {dur / 60:.1f} min of video.")
    step(0.35, f"{len(segs)} rallies found")
    if not segs:
        raise RuntimeError('No rallies found. Raise the sensitivity or turn off "Require court motion".')
    vs, files = {"res": RES[opt["res"]], "crf": CRF[opt["quality"]], "fmt": FMT[opt["fmt"]], "fps": FPS[opt["fps"]]}, []
    if opt["reel"]:
        top = sorted(sorted(segs, key=lambda s: s[2] + 0.15 * (s[1] - s[0]), reverse=True)[:opt["top"]])
        log(f"Building the highlight reel from the top {len(top)} rallies ...")
        step(0.4, "Building the highlight reel")
        build_reel(src, top, out / "highlight-reel.mp4", vs, opt["vertical"], opt["logo"] or None)
        files.append(out / "highlight-reel.mp4")
    if opt["clips"]:
        for k, (a, b, n) in enumerate(segs, 1):
            dst = out / f"rally-{k:02d}.mp4"
            step(0.65 + 0.25 * (k - 1) / len(segs), f"Cutting rally {k} of {len(segs)}")
            cut_clip(src, a, b, dst, vs)
            files.append(dst)
        log(f"Saved {len(segs)} rally clips.")
    if opt["full"]:
        log("Saving the full game ...")
        step(0.92, "Saving the full game")
        dst = out / f"full-game{src.suffix if vs['fmt'] == 'copy' else '.mp4'}"
        full_game(src, dst, vs)
        files.append(dst)
    (out / "rallies.json").write_text(json.dumps({"source": src.name, "duration_s": round(dur, 1),
        "rallies": [{"start_s": a, "end_s": b, "hits": n} for a, b, n in segs]}, indent=2))
    write_share_page(out, files)
    step(1.0, f"Done · {len(files)} files")
    log(f"Done. Files are in {out}")
    return out, files, segs

def write_share_page(out, files):
    rows = "".join(f'<a href="{f.name}" download><b>{f.stem.replace("-", " ").title()}</b>'
                   f'<span>{f.stat().st_size / 1e6:.1f} MB</span></a>' for f in files)
    (out / "index.html").write_text(f"""<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Playhouse Pickle highlights</title><style>body{{margin:0;background:#0b0b0d;color:#f3f4ee;font:17px system-ui,sans-serif;padding:24px}}
h1{{color:#dde01d;font-size:24px}}a{{display:flex;justify-content:space-between;gap:12px;padding:16px;margin:10px 0;border-radius:14px;
background:#17171b;color:#f3f4ee;text-decoration:none;border:1px solid #2a2a2e}}span{{color:#9a9b93}}</style>
<h1>Your match highlights</h1><p>Tap a file to save it to your phone.</p>{rows}<p style="color:#9a9b93">Playhouse Pickle · Your Brand</p>""", encoding="utf-8")


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
        threading.Thread(target=self.httpd.serve_forever, daemon=True).start()
        return f"http://{lan_ip()}:{self.httpd.server_address[1]}/"
    def stop(self):
        if self.httpd:
            self.httpd.shutdown()
            self.httpd = None

def save_qr(url, path):
    import qrcode
    img = qrcode.make(url, box_size=10, border=2)
    img.save(path)
    return path


# ---------------------------------------------------------------- desktop app
BASE = Path(getattr(sys, "_MEIPASS", Path(__file__).parent))
BRAND_PNG = BASE / "assets" / "playhouse-logo.png"
QR_MODES = ("Venue WiFi", "Custom link")

def run_app():
    import tkinter as tk
    from tkinter import filedialog, messagebox
    import customtkinter as ctk
    from PIL import Image

    BG, CARD, LINE, FIELD = "#0b0b0d", "#141418", "#26262d", "#1c1c22"
    INK, MUTED, LIME, LIME2 = "#f3f4ee", "#9a9b93", "#dde01d", "#eef24a"
    ctk.set_appearance_mode("dark")
    root = ctk.CTk(fg_color=BG)
    root.title("Highlight Studio · Playhouse Pickle")
    root.geometry("1200x820")
    root.minsize(1060, 700)
    if (BASE / "icon.ico").exists():
        root.iconbitmap(str(BASE / "icon.ico"))
    F = lambda size, bold=False, fam="Segoe UI": ctk.CTkFont(family=fam, size=size, weight="bold" if bold else "normal")
    H1, H2, TXT, SMALL = F(24, True, "Bahnschrift"), F(13, True, "Bahnschrift"), F(13), F(11)

    # ---- state (restored from the last session; the watch switch itself always starts off)
    v = {}
    for k, d in {**DEFAULTS, "input": "", "out": str(Path.home() / "Videos" / "Highlight Studio"), "deliver_files": True,
                 "deliver_qr": True, "qr_mode": QR_MODES[0], "qr_link": "", "watch": False, "watch_dir": ""}.items():
        v[k] = (tk.BooleanVar if isinstance(d, bool) else tk.DoubleVar if isinstance(d, float)
                else tk.IntVar if isinstance(d, int) else tk.StringVar)(value=d)
    allowed = {**CHOICES, "qr_mode": QR_MODES, "wm": WATERMARKS}
    for k, val in load_settings().items():
        if k in v and k not in ("input", "watch") and (k not in allowed or val in allowed[k]):
            try:
                v[k].set(val)
            except tk.TclError:
                pass

    def remember():
        save_settings({k: var.get() for k, var in v.items() if k not in ("input", "watch")})

    msgs, share, state = queue.Queue(), Share(), {"out": None, "busy": False, "seen": set(), "url": ""}

    # ---- building blocks
    def button(parent, text, cmd, primary=False, **kw):
        return ctk.CTkButton(parent, text=text, command=cmd, corner_radius=12, font=H2 if primary else TXT,
                             fg_color=LIME if primary else FIELD, hover_color=LIME2 if primary else LINE,
                             text_color=BG if primary else INK, border_width=0 if primary else 1, border_color=LINE, **kw)

    def card(title, sub):
        c = ctk.CTkFrame(left, fg_color=CARD, corner_radius=18, border_width=1, border_color=LINE)
        c.pack(fill="x", pady=(0, 14), padx=(0, 10))
        h = ctk.CTkFrame(c, fg_color="transparent")
        h.pack(fill="x", padx=22, pady=(16, 6))
        ctk.CTkLabel(h, text=title.upper(), font=H2, text_color=LIME).pack(side="left")
        ctk.CTkLabel(h, text=sub, font=SMALL, text_color=MUTED).pack(side="left", padx=12)
        inner = ctk.CTkFrame(c, fg_color="transparent")
        inner.pack(fill="x", padx=22, pady=(0, 18))
        return inner

    def line(parent, label):
        r = ctk.CTkFrame(parent, fg_color="transparent")
        r.pack(fill="x", pady=5)
        ctk.CTkLabel(r, text=label, width=118, anchor="w", font=TXT, text_color=MUTED).pack(side="left")
        return r

    def path_row(parent, label, var, pick):
        r = line(parent, label)
        ctk.CTkEntry(r, textvariable=var, fg_color=FIELD, border_color=LINE, text_color=INK, height=38, corner_radius=12,
                     font=TXT).pack(side="left", fill="x", expand=True)
        button(r, "Browse", pick, width=92, height=38).pack(side="left", padx=(8, 0))
        return r

    def seg(parent, label, var, options, hints=None):
        """Pill toggle group: the selected option is lime with dark text (CTkSegmentedButton can't do per-state text colour)."""
        r = line(parent, label)
        g = ctk.CTkFrame(r, fg_color=FIELD, corner_radius=14)
        g.pack(side="left")
        hint = ctk.CTkLabel(r, text="", font=SMALL, text_color=MUTED) if hints else None
        if hint:
            hint.pack(side="left", padx=14)
        btns = {o: ctk.CTkButton(g, text=o, height=32, width=64, corner_radius=11, font=TXT, command=lambda o=o: var.set(o))
                for o in options}
        for b in btns.values():
            b.pack(side="left", padx=3, pady=3)
        def paint(*_):
            for o, b in btns.items():
                on = var.get() == o
                b.configure(fg_color=LIME if on else FIELD, hover_color=LIME2 if on else LINE, text_color=BG if on else INK)
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

    def slider(parent, label, var, lo, hi, steps, fmt="{:.0f}"):
        r = line(parent, label)
        val = ctk.CTkLabel(r, text="", width=44, font=H2, text_color=INK)
        ctk.CTkSlider(r, from_=lo, to=hi, number_of_steps=steps, variable=var, width=220, progress_color=LIME,
                      button_color=LIME, button_hover_color=LIME2, fg_color=LINE).pack(side="left")
        val.pack(side="left", padx=10)
        show = lambda *_: val.configure(text=fmt.format(var.get()))
        var.trace_add("write", show)
        show()
        return r

    # ---- header: client logo, product name, status
    top = ctk.CTkFrame(root, fg_color="transparent")
    top.pack(fill="x", padx=26, pady=(20, 10))
    if BRAND_PNG.exists():
        logo = Image.open(BRAND_PNG)
        ctk.CTkLabel(top, text="", image=ctk.CTkImage(logo, logo, size=(round(logo.width * 40 / logo.height), 40))).pack(side="left")
        ctk.CTkFrame(top, width=1, height=40, fg_color=LINE).pack(side="left", padx=18)
    tb = ctk.CTkFrame(top, fg_color="transparent")
    tb.pack(side="left")
    ctk.CTkLabel(tb, text="Highlight Studio", font=H1, text_color=INK, height=28).pack(anchor="w")
    ctk.CTkLabel(tb, text="Powered by Your Brand  ·  full games and instant highlights", font=SMALL, text_color=MUTED, height=16).pack(anchor="w")
    status = ctk.CTkLabel(top, text="●  Ready", font=H2, text_color=LIME, fg_color=FIELD, corner_radius=14, height=32, width=120)
    status.pack(side="right")

    body = ctk.CTkFrame(root, fg_color="transparent")
    body.pack(fill="both", expand=True, padx=26, pady=(4, 22))
    left = ctk.CTkScrollableFrame(body, fg_color="transparent", scrollbar_button_color=LINE, scrollbar_button_hover_color=MUTED)
    left.pack(side="left", fill="both", expand=True)
    right = ctk.CTkFrame(body, width=350, fg_color=CARD, corner_radius=20, border_width=1, border_color=LINE)
    right.pack(side="right", fill="y", padx=(16, 0))
    right.pack_propagate(False)

    # ---- 1 input
    c = card("Input", "one match, or every new recording from the cameras")
    path_row(c, "Match video", v["input"], lambda: v["input"].set(filedialog.askopenfilename(
        filetypes=[("Video", "*.mp4 *.mov *.mkv *.avi *.m4v"), ("All files", "*.*")]) or v["input"].get()))
    path_row(c, "Watch folder", v["watch_dir"], lambda: v["watch_dir"].set(filedialog.askdirectory() or v["watch_dir"].get()))
    r = line(c, "")
    switch(r, "Auto-process new recordings in the watch folder", v["watch"], lambda: toggle_watch())

    # ---- 2 video output
    c = card("Video output", "format, size and smoothness")
    seg(c, "Format", v["fmt"], list(FMT), {"MP4 · iPhone + Android": "One file for iPhone, Android, PC, Facebook and TikTok",
                                           "HEVC · smaller": "Half the size; older Android and Windows may not play it",
                                           "Camera copy": "Instant, keeps the camera's own format (reel still encodes)"})
    seg(c, "Resolution", v["res"], list(RES))
    seg(c, "Frame rate", v["fps"], list(FPS))
    seg(c, "Quality", v["quality"], list(CRF))

    # ---- 3 exports
    c = card("Exports", "what the player takes home")
    r = line(c, "Outputs")
    switch(r, "Highlight reel", v["reel"])
    switch(r, "Clip per rally", v["clips"])
    switch(r, "Full game", v["full"])
    orient = tk.StringVar(value="Vertical 9:16" if v["vertical"].get() else "Landscape 16:9")
    orient.trace_add("write", lambda *_: v["vertical"].set(orient.get().startswith("Vertical")))
    seg(c, "Reel shape", orient, ["Vertical 9:16", "Landscape 16:9"], {"Vertical 9:16": "Reels, TikTok, Stories", "Landscape 16:9": "YouTube, Facebook"})
    slider(c, "Top rallies", v["top"], 1, 20, 19)
    seg(c, "Watermark", v["wm"], list(WATERMARKS))
    path_row(c, "Custom PNG", v["logo"], lambda: v["logo"].set(filedialog.askopenfilename(filetypes=[("PNG image", "*.png")]) or v["logo"].get()))

    # ---- 4 delivery
    c = card("Delivery", "regular files and a QR code to scan")
    path_row(c, "Output folder", v["out"], lambda: v["out"].set(filedialog.askdirectory() or v["out"].get()))
    r = line(c, "Deliver")
    switch(r, "Regular files", v["deliver_files"])
    switch(r, "QR code", v["deliver_qr"])
    seg(c, "QR opens", v["qr_mode"], list(QR_MODES), {"Venue WiFi": "Phones on the venue WiFi download directly",
                                                       "Custom link": "e.g. the player's portal page"})
    r = line(c, "Custom link")
    ctk.CTkEntry(r, textvariable=v["qr_link"], fg_color=FIELD, border_color=LINE, text_color=INK, height=38, corner_radius=12,
                 font=TXT).pack(side="left", fill="x", expand=True)

    # ---- detection settings (popup keeps the main window short)
    def detection_window():
        w = ctk.CTkToplevel(root, fg_color=BG)
        w.title("Detection settings")
        w.transient(root)
        w.resizable(False, False)
        c = ctk.CTkFrame(w, fg_color=CARD, corner_radius=18, border_width=1, border_color=LINE)
        c.pack(padx=18, pady=18)
        inner = ctk.CTkFrame(c, fg_color="transparent")
        inner.pack(padx=22, pady=18)
        ctk.CTkLabel(inner, text="RALLY DETECTION", font=H2, text_color=LIME).pack(anchor="w", pady=(0, 8))
        slider(inner, "Sensitivity", v["sensitivity"], 1, 10, 9)
        slider(inner, "Min hits", v["min_hits"], 2, 10, 8)
        slider(inner, "Max gap (s)", v["gap"], 1, 6, 10, "{:.1f}")
        slider(inner, "Pre-roll (s)", v["pre"], 0, 5, 10, "{:.1f}")
        slider(inner, "Post-roll (s)", v["post"], 0, 5, 10, "{:.1f}")
        slider(inner, "Ignore edges %", v["inset"], 0, 30, 6)
        r = line(inner, "")
        switch(r, "Require court motion (ignores the next court and music)", v["motion"])
        button(inner, "Done", lambda: (remember(), w.destroy()), primary=True, height=40).pack(anchor="e", pady=(10, 0))
        w.after(100, w.grab_set)

    # ---- right: export panel
    ctk.CTkLabel(right, text="EXPORT", font=H2, text_color=LIME).pack(anchor="w", padx=22, pady=(20, 2))
    summary = ctk.CTkLabel(right, text="", font=SMALL, text_color=MUTED, justify="left", wraplength=300, anchor="w")
    summary.pack(fill="x", padx=22)
    def summarize(*_):
        outs = [n for n, k in (("reel", "reel"), ("rally clips", "clips"), ("full game", "full")) if v[k].get()]
        try:
            top_n = int(v["top"].get())
        except (tk.TclError, ValueError):
            top_n = 0
        summary.configure(text=f"{v['fmt'].get()} · {v['res'].get()} · {v['fps'].get()} fps · {v['quality'].get()}\n"
                               f"{', '.join(outs).capitalize() or 'Nothing selected'}"
                               f"{f' · top {top_n} rallies' if v['reel'].get() else ''}")
    for k in ("fmt", "res", "fps", "quality", "reel", "clips", "full", "top"):
        v[k].trace_add("write", summarize)
    summarize()
    go = ctk.CTkButton(right, text="Make highlights", height=54, corner_radius=14, font=F(18, True, "Bahnschrift"),
                       fg_color=LIME, hover_color=LIME2, text_color=BG, text_color_disabled="#55561a",
                       command=lambda: start(v["input"].get()))
    go.pack(fill="x", padx=22, pady=(16, 12))
    bar = ctk.CTkProgressBar(right, height=8, corner_radius=4, progress_color=LIME, fg_color=FIELD)
    bar.set(0)
    bar.pack(fill="x", padx=22)
    stage = ctk.CTkLabel(right, text="Ready when you are.", font=SMALL, text_color=MUTED, anchor="w")
    stage.pack(fill="x", padx=22, pady=(4, 10))
    qr_box = ctk.CTkLabel(right, text="Scan-to-download QR\nappears here", width=220, height=220, fg_color=FIELD,
                          corner_radius=16, font=SMALL, text_color=MUTED)
    qr_box.pack(pady=(4, 8))
    url_lbl = ctk.CTkLabel(right, text="", font=SMALL, text_color=INK, wraplength=300)
    url_lbl.pack(padx=22)
    row = ctk.CTkFrame(right, fg_color="transparent")
    row.pack(fill="x", padx=22, pady=(8, 0))
    button(row, "Open folder", lambda: state["out"] and os.startfile(state["out"]), height=36).pack(side="left", fill="x", expand=True)
    button(row, "Copy link", lambda: state["url"] and (root.clipboard_clear(), root.clipboard_append(state["url"]), log("Link copied.")),
           height=36).pack(side="left", fill="x", expand=True, padx=(8, 0))
    foot = ctk.CTkFrame(right, fg_color="transparent")
    foot.pack(side="bottom", fill="x", padx=22, pady=(6, 18))
    button(foot, "Detection settings", detection_window, height=34).pack(side="left", fill="x", expand=True)
    def reset():
        for k, d in DEFAULTS.items():
            v[k].set(d)
        orient.set("Vertical 9:16" if DEFAULTS["vertical"] else "Landscape 16:9")
        remember()
        log("Settings reset to defaults.")
    button(foot, "Reset", reset, height=34, width=80).pack(side="left", padx=(8, 0))
    ctk.CTkLabel(right, text="Settings save automatically. WiFi sharing runs while this window is open.",
                 font=SMALL, text_color=MUTED, wraplength=300, justify="left").pack(side="bottom", fill="x", padx=22)
    logbox = ctk.CTkTextbox(right, height=90, fg_color=FIELD, text_color=MUTED, font=F(11, fam="Consolas"), corner_radius=12)
    logbox.pack(side="bottom", fill="both", expand=True, padx=22, pady=(10, 8))

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
        if not (v["reel"].get() or v["clips"].get() or v["full"].get()):
            messagebox.showwarning("Nothing to export", "Turn on at least one output: reel, clips or full game.")
            return
        remember()
        state["busy"] = True
        go.configure(state="disabled", text="Working…")
        set_status("Working", LIME2)
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
                qr_box.configure(image=ctk.CTkImage(Image.open(png), Image.open(png), size=(220, 220)), text="")
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
                    set_status("Done", LIME)
                    finish(data)
                else:
                    set_status("Error", "#ff7a6b")
                    stage.configure(text="Could not finish. See the log.")
                    logbox.insert("end", "Error: " + data + "\n")
                    messagebox.showerror("Could not finish", data)
        root.after(120, pump)

    def toggle_watch():
        if v["watch"].get() and not Path(v["watch_dir"].get()).is_dir():
            v["watch"].set(False)
            messagebox.showwarning("Watch folder", "Choose a folder to watch first.")
        elif v["watch"].get():
            folder = Path(v["watch_dir"].get())
            state["seen"] = {p for p in folder.iterdir() if p.suffix.lower() in VIDEO_EXT}
            log(f"Watching {folder} for new recordings ...")
            set_status("Watching", LIME)
            watch_tick({})
        else:
            set_status("Ready", LIME)

    def watch_tick(sizes):
        if not v["watch"].get():
            return
        folder = Path(v["watch_dir"].get())
        for p in folder.iterdir() if folder.is_dir() else []:
            if p.suffix.lower() in VIDEO_EXT and p not in state["seen"] and not state["busy"]:
                size = p.stat().st_size
                if sizes.get(p) == size:            # size unchanged for 10 s: the camera finished writing
                    state["seen"].add(p)
                    v["input"].set(str(p))
                    log(f"New recording: {p.name}")
                    start(str(p))
                sizes[p] = size
        root.after(10000, lambda: watch_tick(sizes))

    root.protocol("WM_DELETE_WINDOW", lambda: (remember(), share.stop(), root.destroy()))
    pump()
    root.mainloop()


# ---------------------------------------------------------------- self check + CLI
def selftest():
    vs = {"res": 720, "crf": 23, "fmt": "libx265", "fps": 30}
    assert vfilter(vs) == "scale=-2:720,fps=30" and vfilter(dict(vs, res=None, fps=None)) == "null"
    assert "hvc1" in encoder(vs) and encoder(vs)[encoder(vs).index("-crf") + 1] == "27"
    assert encoder(dict(vs, fmt="copy"))[1] == "libx264"                # the reel can't stream-copy
    hits = [10, 11, 12, 13, 30, 31, 50, 51.5, 53, 54.5, 56]
    segs = find_rallies(hits, 120, gap=2.5, min_hits=3, pre=1.8, post=1.2)
    assert segs == [(8.2, 14.2, 4), (48.2, 57.2, 5)], segs          # the 2-hit burst at 30 s is dropped
    merged = find_rallies([10, 11, 12, 14.8, 16, 17], 60, gap=2.5, min_hits=3, pre=1.8, post=1.2)
    assert merged == [(8.2, 18.2, 6)], merged                         # padding overlap -> one clip
    assert find_rallies([5, 6, 7], 7.5, pre=1.8, post=1.2) == [(3.2, 7.5, 3)]   # clamped to video length
    print("selftest ok")

def main():
    ap = argparse.ArgumentParser(description="Your Brand Highlight Cutter")
    ap.add_argument("--selftest", action="store_true")
    ap.add_argument("--cli", metavar="VIDEO", help="process one video without the window")
    ap.add_argument("--out", default=str(Path.home() / "Videos" / "Your Brand Highlights"))
    ap.add_argument("--res", default="720p", choices=list(RES))
    ap.add_argument("--quality", default="Standard", choices=list(CRF))
    ap.add_argument("--format", default="h264", choices=["h264", "h265", "copy"])
    ap.add_argument("--fps", type=int, choices=[30, 60], help="default: keep the camera's frame rate")
    ap.add_argument("--landscape", action="store_true", help="reel in 16:9 instead of vertical 9:16")
    ap.add_argument("--top", type=int, default=8)
    ap.add_argument("--no-reel", action="store_true")
    ap.add_argument("--no-clips", action="store_true")
    ap.add_argument("--full", action="store_true")
    ap.add_argument("--logo", default="", help="watermark PNG for the reel")
    ap.add_argument("--brand", action="store_true", help="watermark the reel with the bundled Playhouse Pickle logo")
    ap.add_argument("--sensitivity", type=int, default=6)
    ap.add_argument("--qr", action="store_true", help="save share-qr.png for the venue WiFi link")
    a = ap.parse_args()
    if a.selftest:
        return selftest()
    if not a.cli:
        return run_app()
    fmt = {"h264": "MP4 · iPhone + Android", "h265": "HEVC · smaller", "copy": "Camera copy"}[a.format]
    o = dict(DEFAULTS, fmt=fmt, fps=str(a.fps) if a.fps else "Original", res=a.res, quality=a.quality, vertical=not a.landscape, top=a.top, reel=not a.no_reel,
             clips=not a.no_clips, full=a.full, logo=str(BRAND_PNG) if a.brand else a.logo, sensitivity=a.sensitivity)
    out, files, segs = process(a.cli, a.out, o)
    if a.qr:
        print("QR saved:", save_qr(f"http://{lan_ip()}:8800/", out / "share-qr.png"))

if __name__ == "__main__":
    main()
