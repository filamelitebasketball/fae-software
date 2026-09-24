# Highlight Studio IO v3.0

© 2026 LINKMEIO. All rights reserved. Licensed to Playhouse Pickle (Team Payaman Pickleball).

Desktop app that turns a pickleball match video into what players take home:
- **Highlights video**: every rally in one video (or only the best N), vertical 9:16 or 16:9, Playhouse watermark.
- **Longest rally**: the single longest exchange on its own.
- **Full game**: the whole match.
- **Clip per rally**: optional, off by default.

It finds rallies from paddle "pop" sounds (1 to 4 kHz onsets) plus movement on the court, chains hits into rallies and cuts out the dead time.

## Run
- Desktop shortcut **Highlight Studio IO**, or `dist\HighlightStudioIO.exe` (one file, ffmpeg bundled; build with `build_exe.ps1`).
- From source: `pip install -r requirements.txt`, then `python highlight_cutter.py`.
- Command line: `python highlight_cutter.py --cli match.mp4 --longest --full --brand` (see `--help`).
- Logic check: `python highlight_cutter.py --selftest`.

## Settings (Recommended preset = the defaults)
| Setting | Recommended | Options |
|---|---|---|
| Preset | Recommended | Social highlights (best 5 + longest, High) · Full game only (camera copy) · Custom |
| Format | MP4 · iPhone + Android (H.264 High, yuv420p, AAC-LC 48 kHz stereo 160k, faststart) | HEVC · smaller (hvc1) · Camera copy (no re-encode) |
| Resolution | 1080p (never upscales) | Original · 720p · 480p |
| Frame rate | 30 | Original · 60 |
| Quality | Standard | High · Small file |
| Watermark | Playhouse logo | Custom PNG · None |
| Detection | sensitivity 6, min hits 3, max gap 2.5 s, pre 1.8 s, post 1.2 s, court motion on, ignore edges 5% | popup |

Input: one file or a watch folder (auto-processes each new recording once the camera stops writing).
Delivery: files in the output folder plus a QR code (venue WiFi download page, or a custom link).
Settings save to `%APPDATA%\HighlightStudioIO\settings.json`. First WiFi share: allow the app on Private networks in Windows Firewall.

## Status
Tested on a synthetic match (all rally hits found, durations exact, outputs checked as H.264 High / AAC / faststart).
Not yet tested on real court footage: detection thresholds get tuned in the Court 1 pilot.
