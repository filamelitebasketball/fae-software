# Highlight Studio (Your Brand Highlight Cutter)

Desktop app for **Team Payaman Pickleball / Playhouse Pickle**. Drop in a match video and it finds
every rally on its own, then exports a highlight reel, one clip per rally and the full game, and
shows a QR code players scan to download them.

## How it finds rallies
1. **Sound:** listens for the paddle "pop" (sharp 1 to 4 kHz spikes).
2. **Motion:** checks that players are actually moving on this court, so pops from the next court
   or music are ignored.
3. **Rallies:** pops closer than 2.5 s chain into a rally (3+ hits), padded 1.8 s before and
   1.2 s after. The reel uses the longest rallies.

## Options
| Section | Choices |
|---|---|
| Input | One video, or a **watch folder** (the beacon): every new recording that lands there is processed automatically once the camera finishes writing it |
| Video output | Format: H.264 (plays everywhere), H.265 (about half the size) or Camera copy (instant, no re-encode) · Frame rate: Original, 30 or 60 · Resolution: Original, 1080p, 720p, 480p · Quality: High / Standard / Small file |
| Exports | Highlight reel (vertical 9:16 for Reels/TikTok or 16:9), top N rallies, per-rally clips, full game, watermark: Playhouse Pickle logo (bundled, default), custom PNG or none |
| Delivery | Regular files in the output folder, and/or a QR code: **venue WiFi** (the app serves the files to phones on the same network) or a **custom link** (e.g. the portal page) |
| Detection (popup) | Sensitivity, min hits, max gap, pre/post roll, require court motion, ignore edges % |

Settings are saved automatically in `%APPDATA%\YourBrandHighlightCutter\settings.json` and come back on the next launch (Reset settings restores defaults).

Each export folder also gets `rallies.json` (rally times) and `share-qr.png`.

## Run
- Windows app: the **Highlight Studio** shortcut on the Desktop, or `dist\YourBrandHighlightCutter.exe` (build with `build_exe.ps1`). No installs needed; ffmpeg is bundled.
  The first time you share by WiFi, Windows Firewall asks to allow it: tick **Private networks**.
- From source: `pip install -r requirements.txt`, then `python highlight_cutter.py`
- Command line: `python highlight_cutter.py --cli match.mp4 --format h265 --fps 30 --res 720p --brand --full --qr`
- Logic check: `python highlight_cutter.py --selftest`

## Status
Tested on a synthetic match (3 rallies + 2 stray pops): all 30 rally hits found to 0.1 s, strays
rejected, all exports and the QR download verified. Thresholds still need tuning on real Court 1
footage (the pilot in the Instant Highlights report).
