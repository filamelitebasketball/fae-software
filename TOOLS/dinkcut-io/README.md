# DinkCut IO v3.5

© 2026 LINKMEIO. All rights reserved. Licensed to Playhouse Pickle (Team Payaman Pickleball).
Formerly Highlight Studio IO (renamed in v3.5, 2026-09-25).

Desktop app that turns a pickleball match video into what players take home:
- **Highlights video**: every rally in one video (or only the best N), vertical 9:16 or 16:9, Playhouse watermark.
- **Longest rally**: the single longest exchange on its own.
- **Full game**: the whole match.
- **Clip per rally**: optional, off by default.

## Folders
| Folder | What it is |
|---|---|
| `product/` | The real product: `DinkCutIO.exe` (full version; Desktop shortcut "DinkCut IO"). |
| `trial/` | What you send a prospect: `DinkCutIO-Trial.exe` + `READ ME FIRST.txt`. Never send the source. |
| `test-scoreboard/` | The scoreboard + phone scoring, taken out in v3.5 and parked for a future version. Not used by the app. |
| `source/` | The code: `dinkcut_io.py`, build scripts, icon, assets, `_versions/` snapshots. |

## Build and run (from `source/`)
- `build_exe.ps1` writes `..\product\DinkCutIO.exe`; `build_trial.ps1` writes `..\trial\DinkCutIO-Trial.exe`
  (one file each, ffmpeg bundled, "Opening..." splash while it unpacks: a fresh download can take up to 30 s to open).
- From source: `pip install -r requirements.txt`, then `python dinkcut_io.py`.
- Command line: `python dinkcut_io.py --cli match.mp4 --longest --full --brand` (see `--help`).
- Logic check: `python dinkcut_io.py --selftest`.

## How it finds rallies
Paddle "pop" sounds (sharp 1 to 4 kHz onsets) plus movement on the court. Loud pops seed a rally; softer pops (two
sensitivity steps looser, capped at 8) join it and pull its start back to the soft serve, at most 4 s before the
first loud hit. A rally needs 2+ loud pops and 3+ pops in all, under 2.5 s apart; dead time between rallies is cut.
On the 13-minute test match (v3.5 vs v3.4): 33 rallies vs 25, 297 s of play kept vs 209 s, longest 16 s (no points
joined). Frame checks: of 14 extra rallies the rule found (court filter off), about 10 were real play; 2 of the 3
serves that started before the clip are now inside it.

A YOLO (ultralytics) ball/player engine was tested on the same match and not adopted: it saw a "ball" in 56% of rally
frames but also 37% of dead-time frames (held balls, lights, other courts): its rally logic made 78 rallies, 43 of them in dead time; and all players
fit a 9:16 crop in only ~20% of frames, so following the players' average lands in the centre anyway.

## Trial edition
The full app for 24 hours from first launch, then a free tier (highlights video only, 720p, LINKMEIO watermark, no
watch folder). Start time kept in HKCU\Software\LINKMEIO\HighlightStudioIO and `%APPDATA%\HighlightStudioIO\license.json`
(names kept from before the rename, so trials carry over), earliest wins; a clock set back = ended. Shown in the app:
"TRIAL · N H LEFT" chip, then a banner naming the free-tier limits.

## Settings (Recommended preset = the defaults)
| Setting | Recommended | Options |
|---|---|---|
| Preset | Recommended | Social highlights (best 5 + longest, High) · Full game only (camera copy) · Custom |
| Format | MP4 · iPhone + Android (H.264 High, yuv420p, AAC-LC 48 kHz stereo 160k, faststart) | HEVC · smaller (hvc1) · Camera copy (no re-encode) |
| Resolution | 1080p (never upscales) | Original · 720p · 480p |
| Frame rate | 30 | Original · 60 |
| Quality | Standard | High · Small file |
| Watermark | Playhouse logo, small bottom right | Custom PNG · None |
| Detection | sensitivity 6, min hits 3, max gap 2.5 s, pre 1.8 s, post 1.2 s, court motion on, ignore edges 5% | popup |

Input: one file or a watch folder (auto-processes each new recording once the camera stops writing).
Delivery: files in the output folder plus a QR code (venue WiFi download page, or a custom link).
Settings save to `%APPDATA%\HighlightStudioIO\settings.json`. First WiFi share: allow the app on Private networks in Windows Firewall.

## Status
Tested on a synthetic match (all rally hits found, durations exact, outputs H.264 High / AAC / faststart) and on a
13-minute real 1080p match. Thresholds still get tuned on Playhouse footage in the Court 1 pilot.
