"""PickleCam Highlight Cutter: Playhouse Pickle desktop tool, built by F.A.E.

Finds the rallies in a pickleball match video (paddle "pop" sounds + on-court motion), then
exports a highlight reel, one clip per rally and/or the full game, and shares them by QR code
over the venue WiFi.

    python highlight_cutter.py                      desktop app
    python highlight_cutter.py --cli match.mp4      command line (see --help)
    python highlight_cutter.py --selftest           quick logic check
"""
import argparse, functools, http.server, json, os, queue, re, socket, subprocess, sys, tempfile, threading, time
from pathlib import Path

import numpy as np
import imageio_ffmpeg

FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()          # bundled ffmpeg, nothing to install
NOWIN = subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0
VIDEO_EXT = {".mp4", ".mov", ".mkv", ".avi", ".m4v"}
RES = {"Original (fastest, no re-encode)": None, "1080p": 1080, "720p": 720, "480p": 480}
CRF = {"High": 18, "Standard": 23, "Small file": 28}
DEFAULTS = dict(res="720p", quality="Standard", reel=True, clips=True, full=False, vertical=True, top=8,
                logo="", sensitivity=6, min_hits=3, gap=2.5, pre=1.8, post=1.2, motion=True, inset=5)


# ---------------------------------------------------------------- ffmpeg helpers
def ff(args):
    subprocess.run([FFMPEG, "-hide_banner", "-loglevel", "error", "-y", *args], check=True,
                   capture_output=True, creationflags=NOWIN)

def x264(crf):
    return ["-c:v", "libx264", "-preset", "veryfast", "-crf", str(crf), "-pix_fmt", "yuv420p",
            "-c:a", "aac", "-b:a", "128k", "-ar", "48000", "-movflags", "+faststart"]

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
def cut_clip(src, a, b, dst, res, crf):
    if res is None:     # stream copy: seconds, not minutes (exact when the camera writes 1 s keyframes)
        ff(["-ss", f"{a:.2f}", "-i", str(src), "-t", f"{b - a:.2f}", "-c", "copy", "-avoid_negative_ts", "make_zero", str(dst)])
    else:
        ff(["-ss", f"{a:.2f}", "-i", str(src), "-t", f"{b - a:.2f}", "-vf", f"scale=-2:{res}", *x264(crf), str(dst)])

def build_reel(src, segs, dst, res, crf, vertical, logo):
    H = res or 1080
    vf = ("crop=trunc(ih*9/16/2)*2:ih," if vertical else "") + f"scale=-2:{H},setsar=1,fps=30"
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
            ff(args + x264(crf) + [str(part)])
            parts.append(part)
        (Path(tmp) / "list.txt").write_text("".join(f"file '{p.as_posix()}'\n" for p in parts))
        ff(["-f", "concat", "-safe", "0", "-i", str(Path(tmp) / "list.txt"), "-c", "copy", "-movflags", "+faststart", str(dst)])

def full_game(src, dst, res, crf):
    ff(["-i", str(src), "-c", "copy", str(dst)] if res is None else ["-i", str(src), "-vf", f"scale=-2:{res}", *x264(crf), str(dst)])


# ---------------------------------------------------------------- the whole job
def process(src, out_dir, opt, log=print):
    src = Path(src)
    out = Path(out_dir) / f"{src.stem}-highlights"
    out.mkdir(parents=True, exist_ok=True)
    log(f"Reading {src.name} ...")
    dur = duration_of(src)
    hits = audio_hits(src, opt["sensitivity"])
    curve, fps = motion_curve(src, inset=opt["inset"] / 100) if (opt["motion"] or not hits) else (np.array([]), 5)
    if not hits and len(curve):
        hits = motion_peaks(curve, fps)
        log("No paddle sounds found, using movement only.")
    active = make_active(curve, fps) if opt["motion"] and len(curve) else None
    segs = find_rallies(hits, dur, opt["gap"], opt["min_hits"], opt["pre"], opt["post"], active)
    log(f"{len(hits)} hits found, {len(segs)} rallies in {dur / 60:.1f} min of video.")
    if not segs:
        raise RuntimeError('No rallies found. Raise the sensitivity or turn off "Require court motion".')
    res, crf, files = RES[opt["res"]], CRF[opt["quality"]], []
    if opt["reel"]:
        top = sorted(sorted(segs, key=lambda s: s[2] + 0.15 * (s[1] - s[0]), reverse=True)[:opt["top"]])
        log(f"Building the highlight reel from the top {len(top)} rallies ...")
        build_reel(src, top, out / "highlight-reel.mp4", res, crf, opt["vertical"], opt["logo"] or None)
        files.append(out / "highlight-reel.mp4")
    if opt["clips"]:
        for k, (a, b, n) in enumerate(segs, 1):
            dst = out / f"rally-{k:02d}.mp4"
            cut_clip(src, a, b, dst, res, crf)
            files.append(dst)
        log(f"Saved {len(segs)} rally clips.")
    if opt["full"]:
        log("Saving the full game ...")
        dst = out / f"full-game{src.suffix if res is None else '.mp4'}"
        full_game(src, dst, res, crf)
        files.append(dst)
    (out / "rallies.json").write_text(json.dumps({"source": src.name, "duration_s": round(dur, 1),
        "rallies": [{"start_s": a, "end_s": b, "hits": n} for a, b, n in segs]}, indent=2))
    write_share_page(out, files)
    log(f"Done. Files are in {out}")
    return out, files, segs

def write_share_page(out, files):
    rows = "".join(f'<a href="{f.name}" download><b>{f.stem.replace("-", " ").title()}</b>'
                   f'<span>{f.stat().st_size / 1e6:.1f} MB</span></a>' for f in files)
    (out / "index.html").write_text(f"""<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Playhouse Pickle highlights</title><style>body{{margin:0;background:#0b0b0d;color:#f3f4ee;font:17px system-ui,sans-serif;padding:24px}}
h1{{color:#dde01d;font-size:24px}}a{{display:flex;justify-content:space-between;gap:12px;padding:16px;margin:10px 0;border-radius:14px;
background:#17171b;color:#f3f4ee;text-decoration:none;border:1px solid #2a2a2e}}span{{color:#9a9b93}}</style>
<h1>Your match highlights</h1><p>Tap a file to save it to your phone.</p>{rows}<p style="color:#9a9b93">Playhouse Pickle · PickleCam</p>""", encoding="utf-8")


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
def run_app():
    import tkinter as tk
    from tkinter import ttk, filedialog, messagebox
    from PIL import Image, ImageTk

    BG, PANEL, INK, MUTED, LIME = "#0b0b0d", "#16161a", "#f3f4ee", "#9a9b93", "#dde01d"
    root = tk.Tk()
    root.title("PickleCam Highlight Cutter · Playhouse Pickle")
    root.configure(bg=BG)
    root.minsize(900, 640)
    icon = Path(getattr(sys, "_MEIPASS", Path(__file__).parent)) / "icon.ico"
    if icon.exists():
        root.iconbitmap(str(icon))
    st = ttk.Style(root)
    st.theme_use("clam")
    st.configure(".", background=BG, foreground=INK, fieldbackground=PANEL, font=("Segoe UI", 10))
    st.configure("TLabelframe", background=BG, bordercolor="#2a2a2e")
    st.configure("TLabelframe.Label", background=BG, foreground=LIME, font=("Segoe UI Semibold", 10))
    st.configure("TButton", background=PANEL, foreground=INK, bordercolor="#2a2a2e", padding=6)
    st.map("TButton", background=[("active", "#22222a")])
    st.configure("Go.TButton", background=LIME, foreground="#0b0b0d", font=("Segoe UI Semibold", 11), padding=10)
    st.map("Go.TButton", background=[("active", "#eef24a"), ("disabled", "#55561a")])
    for w in ("TCheckbutton", "TRadiobutton"):
        st.configure(w, background=BG, foreground=INK, indicatorbackground=PANEL, indicatorforeground=BG)
        st.map(w, background=[("active", BG)], indicatorbackground=[("selected", LIME), ("active", "#22222a")])
    st.configure("Muted.TLabel", foreground=MUTED)
    st.configure("TCombobox", arrowcolor=INK, background=PANEL)
    st.map("TCombobox", fieldbackground=[("readonly", PANEL)], foreground=[("readonly", INK)],
           selectbackground=[("readonly", PANEL)], selectforeground=[("readonly", INK)])
    st.configure("TSpinbox", arrowcolor=INK, background=PANEL)
    st.configure("Horizontal.TProgressbar", troughcolor=PANEL, background=LIME, bordercolor=BG)
    root.option_add("*TCombobox*Listbox.background", PANEL)
    root.option_add("*TCombobox*Listbox.foreground", INK)
    root.option_add("*TCombobox*Listbox.selectBackground", LIME)
    root.option_add("*TCombobox*Listbox.selectForeground", BG)

    v = {k: (tk.BooleanVar(value=d) if isinstance(d, bool) else tk.DoubleVar(value=d) if isinstance(d, float)
             else tk.IntVar(value=d) if isinstance(d, int) else tk.StringVar(value=d)) for k, d in DEFAULTS.items()}
    v["input"] = tk.StringVar()
    v["out"] = tk.StringVar(value=str(Path.home() / "Videos" / "PickleCam Highlights"))
    v["deliver_files"], v["deliver_qr"] = tk.BooleanVar(value=True), tk.BooleanVar(value=True)
    v["qr_mode"], v["qr_link"] = tk.StringVar(value="wifi"), tk.StringVar()
    v["watch"], v["watch_dir"] = tk.BooleanVar(value=False), tk.StringVar()
    msgs, share, state = queue.Queue(), Share(), {"out": None, "busy": False, "seen": set()}

    main = ttk.Frame(root, padding=16)
    main.pack(fill="both", expand=True)
    left, right = ttk.Frame(main), ttk.Frame(main)
    left.pack(side="left", fill="both", expand=True)
    right.pack(side="right", fill="y", padx=(16, 0))
    tk.Label(left, text="PickleCam Highlight Cutter", bg=BG, fg=LIME, font=("Segoe UI Black", 18)).pack(anchor="w")
    ttk.Label(left, text="Instant highlights and full game exports for Playhouse Pickle", style="Muted.TLabel").pack(anchor="w", pady=(0, 10))

    def row(parent, label, var, browse=None, width=46):
        f = ttk.Frame(parent)
        f.pack(fill="x", pady=3)
        ttk.Label(f, text=label, width=16).pack(side="left")
        ttk.Entry(f, textvariable=var, width=width).pack(side="left", fill="x", expand=True)
        if browse:
            ttk.Button(f, text="Browse", command=browse).pack(side="left", padx=(6, 0))
        return f

    box = ttk.LabelFrame(left, text="1  Input video", padding=10)
    box.pack(fill="x", pady=5)
    row(box, "Match video", v["input"], lambda: v["input"].set(filedialog.askopenfilename(
        filetypes=[("Video", "*.mp4 *.mov *.mkv *.avi *.m4v"), ("All files", "*.*")]) or v["input"].get()))
    w = row(box, "Watch folder", v["watch_dir"], lambda: v["watch_dir"].set(filedialog.askdirectory() or v["watch_dir"].get()))
    ttk.Checkbutton(box, text="Auto-process every new video that lands in the watch folder (camera recordings)",
                    variable=v["watch"], command=lambda: toggle_watch()).pack(anchor="w", pady=(4, 0))

    box = ttk.LabelFrame(left, text="2  Video quality", padding=10)
    box.pack(fill="x", pady=5)
    f = ttk.Frame(box); f.pack(fill="x")
    ttk.Label(f, text="Resolution", width=16).pack(side="left")
    ttk.Combobox(f, textvariable=v["res"], values=list(RES), state="readonly", width=32).pack(side="left")
    ttk.Label(f, text="  Quality").pack(side="left")
    ttk.Combobox(f, textvariable=v["quality"], values=list(CRF), state="readonly", width=12).pack(side="left", padx=(6, 0))

    box = ttk.LabelFrame(left, text="3  What to export", padding=10)
    box.pack(fill="x", pady=5)
    f = ttk.Frame(box); f.pack(fill="x")
    ttk.Checkbutton(f, text="Highlight reel", variable=v["reel"]).pack(side="left")
    ttk.Radiobutton(f, text="Vertical 9:16 (Reels, TikTok)", variable=v["vertical"], value=True).pack(side="left", padx=(14, 0))
    ttk.Radiobutton(f, text="Landscape 16:9", variable=v["vertical"], value=False).pack(side="left", padx=(8, 0))
    ttk.Label(f, text="  Top rallies").pack(side="left")
    ttk.Spinbox(f, from_=1, to=30, textvariable=v["top"], width=4).pack(side="left", padx=(6, 0))
    f = ttk.Frame(box); f.pack(fill="x", pady=(6, 0))
    ttk.Checkbutton(f, text="One clip per rally", variable=v["clips"]).pack(side="left")
    ttk.Checkbutton(f, text="Full game copy", variable=v["full"]).pack(side="left", padx=(14, 0))
    row(box, "Watermark (PNG)", v["logo"], lambda: v["logo"].set(filedialog.askopenfilename(
        filetypes=[("PNG image", "*.png")]) or v["logo"].get()))

    box = ttk.LabelFrame(left, text="4  Delivery", padding=10)
    box.pack(fill="x", pady=5)
    ttk.Checkbutton(box, text="Regular files, saved to the output folder", variable=v["deliver_files"]).pack(anchor="w")
    row(box, "Output folder", v["out"], lambda: v["out"].set(filedialog.askdirectory() or v["out"].get()))
    f = ttk.Frame(box); f.pack(fill="x", pady=(6, 0))
    ttk.Checkbutton(f, text="QR code:", variable=v["deliver_qr"]).pack(side="left")
    ttk.Radiobutton(f, text="Download over venue WiFi", variable=v["qr_mode"], value="wifi").pack(side="left", padx=(8, 0))
    ttk.Radiobutton(f, text="Custom link", variable=v["qr_mode"], value="link").pack(side="left", padx=(8, 0))
    ttk.Entry(f, textvariable=v["qr_link"], width=28).pack(side="left", padx=(6, 0), fill="x", expand=True)

    box = ttk.LabelFrame(left, text="Detection settings", padding=10)
    box.pack(fill="x", pady=5)
    f = ttk.Frame(box); f.pack(fill="x")
    for label, key, lo, hi, inc in [("Sensitivity", "sensitivity", 1, 10, 1), ("Min hits", "min_hits", 2, 10, 1),
                                    ("Max gap s", "gap", 1.0, 6.0, 0.5), ("Pre-roll s", "pre", 0.0, 5.0, 0.5),
                                    ("Post-roll s", "post", 0.0, 5.0, 0.5), ("Ignore edges %", "inset", 0, 30, 5)]:
        ttk.Label(f, text=label).pack(side="left", padx=(0, 4))
        ttk.Spinbox(f, from_=lo, to=hi, increment=inc, textvariable=v[key], width=4).pack(side="left", padx=(0, 10))
    ttk.Checkbutton(box, text="Require court motion (ignores sound from the next court and music)", variable=v["motion"]).pack(anchor="w", pady=(6, 0))

    go = ttk.Button(left, text="Make highlights", style="Go.TButton", command=lambda: start(v["input"].get()))
    go.pack(fill="x", pady=(10, 4))
    bar = ttk.Progressbar(left, mode="indeterminate")
    bar.pack(fill="x")
    logbox = tk.Text(left, height=6, bg=PANEL, fg=INK, relief="flat", font=("Consolas", 9), insertbackground=INK)
    logbox.pack(fill="both", expand=True, pady=(8, 0))

    ttk.Label(right, text="Scan to download", style="Muted.TLabel").pack(anchor="w")
    qr_label = tk.Label(right, bg=PANEL, width=34, height=16, text="The QR code appears here\nafter export.", fg=MUTED)
    qr_label.pack(pady=6)
    url_var = tk.StringVar()
    ttk.Entry(right, textvariable=url_var, width=40, state="readonly").pack(fill="x")
    ttk.Button(right, text="Open output folder", command=lambda: state["out"] and os.startfile(state["out"])).pack(fill="x", pady=(10, 0))
    ttk.Label(right, text="WiFi sharing stays on while this\nwindow is open. Phones must be on\nthe same network.", style="Muted.TLabel", justify="left").pack(anchor="w", pady=(10, 0))

    def log(msg):
        msgs.put(("log", msg))

    def opts():
        o = {k: v[k].get() for k in DEFAULTS}
        o["top"], o["min_hits"] = int(o["top"]), int(o["min_hits"])
        return o

    def start(path):
        if state["busy"]:
            return
        if not path or not Path(path).is_file():
            messagebox.showwarning("Choose a video", "Pick a match video first.")
            return
        if not (v["reel"].get() or v["clips"].get() or v["full"].get()):
            messagebox.showwarning("Nothing to export", "Tick at least one export: reel, clips or full game.")
            return
        state["busy"] = True
        go.state(["disabled"])
        bar.start(12)
        o, out_dir = opts(), v["out"].get()
        def work():
            try:
                out, files, segs = process(path, out_dir, o, log)
                msgs.put(("done", out))
            except Exception as e:                  # surface ffmpeg or detection errors in the log
                msgs.put(("error", str(e)))
        threading.Thread(target=work, daemon=True).start()

    def finish(out):
        state["out"] = out
        if v["deliver_qr"].get():
            url = v["qr_link"].get().strip() if v["qr_mode"].get() == "link" else share.start(out)
            if url:
                png = save_qr(url, Path(out) / "share-qr.png")
                img = ImageTk.PhotoImage(Image.open(png).resize((260, 260), Image.NEAREST))
                qr_label.configure(image=img, width=260, height=260, text="")
                qr_label.image = img
                url_var.set(url)
                log(f"QR code ready: {url}")
        if not v["deliver_files"].get():
            log("Files are still kept in the output folder so the QR link can serve them.")

    def pump():
        while not msgs.empty():
            kind, data = msgs.get()
            if kind == "log":
                logbox.insert("end", data + "\n")
                logbox.see("end")
            else:
                state["busy"] = False
                go.state(["!disabled"])
                bar.stop()
                if kind == "done":
                    finish(data)
                else:
                    logbox.insert("end", "Error: " + data + "\n")
                    messagebox.showerror("Could not finish", data)
        root.after(150, pump)

    def toggle_watch():
        if v["watch"].get() and not Path(v["watch_dir"].get()).is_dir():
            v["watch"].set(False)
            messagebox.showwarning("Watch folder", "Choose a folder to watch first.")
        elif v["watch"].get():
            folder = Path(v["watch_dir"].get())
            state["seen"] = {p for p in folder.iterdir() if p.suffix.lower() in VIDEO_EXT}
            log(f"Watching {folder} for new recordings ...")
            watch_tick({})

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

    root.protocol("WM_DELETE_WINDOW", lambda: (share.stop(), root.destroy()))
    pump()
    root.mainloop()


# ---------------------------------------------------------------- self check + CLI
def selftest():
    hits = [10, 11, 12, 13, 30, 31, 50, 51.5, 53, 54.5, 56]
    segs = find_rallies(hits, 120, gap=2.5, min_hits=3, pre=1.8, post=1.2)
    assert segs == [(8.2, 14.2, 4), (48.2, 57.2, 5)], segs          # the 2-hit burst at 30 s is dropped
    merged = find_rallies([10, 11, 12, 14.8, 16, 17], 60, gap=2.5, min_hits=3, pre=1.8, post=1.2)
    assert merged == [(8.2, 18.2, 6)], merged                         # padding overlap -> one clip
    assert find_rallies([5, 6, 7], 7.5, pre=1.8, post=1.2) == [(3.2, 7.5, 3)]   # clamped to video length
    print("selftest ok")

def main():
    ap = argparse.ArgumentParser(description="PickleCam Highlight Cutter")
    ap.add_argument("--selftest", action="store_true")
    ap.add_argument("--cli", metavar="VIDEO", help="process one video without the window")
    ap.add_argument("--out", default=str(Path.home() / "Videos" / "PickleCam Highlights"))
    ap.add_argument("--res", default="720p", choices=list(RES))
    ap.add_argument("--quality", default="Standard", choices=list(CRF))
    ap.add_argument("--landscape", action="store_true", help="reel in 16:9 instead of vertical 9:16")
    ap.add_argument("--top", type=int, default=8)
    ap.add_argument("--no-reel", action="store_true")
    ap.add_argument("--no-clips", action="store_true")
    ap.add_argument("--full", action="store_true")
    ap.add_argument("--logo", default="")
    ap.add_argument("--sensitivity", type=int, default=6)
    ap.add_argument("--qr", action="store_true", help="save share-qr.png for the venue WiFi link")
    a = ap.parse_args()
    if a.selftest:
        return selftest()
    if not a.cli:
        return run_app()
    o = dict(DEFAULTS, res=a.res, quality=a.quality, vertical=not a.landscape, top=a.top, reel=not a.no_reel,
             clips=not a.no_clips, full=a.full, logo=a.logo, sensitivity=a.sensitivity)
    out, files, segs = process(a.cli, a.out, o)
    if a.qr:
        print("QR saved:", save_qr(f"http://{lan_ip()}:8800/", out / "share-qr.png"))

if __name__ == "__main__":
    main()
