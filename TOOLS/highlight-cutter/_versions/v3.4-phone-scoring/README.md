# Highlight Studio IO v3.4

© 2026 LINKMEIO. All rights reserved. Licensed to Playhouse Pickle (Team Payaman Pickleball).

Desktop app that turns a pickleball match video into what players take home. v3.3 look: pickleball-lime theme, icon rail + sidebar pages (Home, Exports, Scoreboard, Video, Delivery), export panel pinned right.
- **Highlights video**: every rally in one video (or only the best N), vertical 9:16 or 16:9, Playhouse watermark.
- **Longest rally**: the single longest exchange on its own.
- **Full game**: the whole match.
- **Clip per rally**: optional, off by default.
- **Phone scoring (v3.4, default score source)**: the app serves a scoring page on the venue WiFi (port 8900; QR in the
  Scoreboard page). Players tap "Team A/B won the rally" after each rally, with Undo and New match, per court (1-6).
  Taps are stamped by this PC's clock and saved to %APPDATA%\HighlightStudioIO	aps.json. On export (also watch-folder
  runs) the app takes that court's taps (court read from the file name, e.g. "Court 1 ..."), corrects clock differences
  up to 10 min by lining taps up with detected rally ends, and changes the board as each point ends. Tested with a
  90 s clock error and a stray tap from another court. The LAN page has no PIN: anyone on the venue WiFi can tap.
- **Scoreboard** (optional, off by default): bottom left, logo small at the bottom right. After detection, the
  operator taps who won each rally (1 / 2 / 0 keys) and the app keeps the official score: side-out doubles
  (0-0-2 start, server 1/2), side-out singles or rally scoring, games to 11/15/21, win by 2. Styles: Broadcast,
  Compact, Score call. "Preview on this video" shows the real burn-in before exporting. Not on camera-copy full
  games (a stream copy can't carry graphics) and skipped on watch-folder runs (each rally needs a tap).
  Why a tap and not automatic: rally ends are detected, but who won the rally is not. On real venue footage the
  first detected sound is often a mid-rally shot, not the soft serve, so serve-end inference is unreliable; the
  US leaders (PB Vision, SwingVision) track the ball in 3D and still ask a person to confirm.

It finds rallies from paddle "pop" sounds (1 to 4 kHz onsets) plus movement on the court, chains hits into rallies and cuts out the dead time.

## Run
- Desktop shortcut **Highlight Studio IO**, or `dist\HighlightStudioIO.exe` (one file, ffmpeg bundled; build with `build_exe.ps1`).
- From source: `pip install -r requirements.txt`, then `python highlight_cutter.py`.
- Command line: `python highlight_cutter.py --cli match.mp4 --longest --full --brand` (see `--help`).
  Scoreboard from the command line: `--score ABB0A --teams "Keng & Pat,Junnie & Dudut" --sb-style Compact`.
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
Scoreboard tested on a 13-minute real 1080p match (77 scoring rallies, full game duration exact, score changes on time).
Rally detection thresholds still get tuned on Playhouse footage in the Court 1 pilot.
