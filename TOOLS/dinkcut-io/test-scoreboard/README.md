# Test scoreboard (parked)

Scoreboard and phone scoring, taken out of DinkCut IO (then Highlight Studio IO) in v3.5 (2026-09-25) because it did not work in
practice at the court. Kept here, isolated, for a future version. Nothing in the app imports this folder.

## What is here
`scoreboard.py`: standalone (numpy, Pillow, imageio-ffmpeg). Run `python scoreboard.py` for the self check.
- `score_states`, `score_call`: USA Pickleball scoring. Side-out doubles (0-0-2 start, server 1/2), side-out
  singles, rally scoring, games to 11/15/21, win by 2.
- `scoreboard_png`, `board_input`, `overlays`: the burned-in board (Broadcast, Compact, Score call) at the bottom
  left with the logo at the bottom right. `overlays` is a drop-in for the app's logo-only `overlays`.
- `Taps`, `ScoreServer`, `SCORE_PAGE`: phone scoring page on the venue WiFi (port 8900), taps saved to
  `%APPDATA%\HighlightStudioIO\taps.json`.
- `align_shift`, `recording_starts`, `court_of`, `phone_board`: lines phone taps up with detected rally ends
  (clock drift up to 10 min, court number read from the file name "Court 1 ...").
- `point_chains`: every burst of hits, even a single one (each is a candidate point).
- `SB_DEFAULTS`, `SB_CHOICES`: the settings keys the app used.

The full app with the scoreboard wired in (Scoreboard page, preview, "Score the match" window, phone QR) is the
v3.4 snapshot: `../source/_versions/v3.4-phone-scoring/highlight_cutter.py`.

## Why it was parked
- Who won a rally is not detected. Sound shows when a rally ends, not who won it (the first detected pop is often
  mid-rally, so serve-side inference fails). PB Vision and SwingVision also ask a person to confirm.
- Tapping every rally after the match was rejected (too much work). Phone taps during play depend on players
  tapping every rally, the PC clock, and recordings named by court.
- The LAN scoring page has no PIN: anyone on the venue WiFi can tap.

## Plugging it back in (against `../source/dinkcut_io.py` v3.5)
1. `from scoreboard import *` (or copy the module in), merge `SB_DEFAULTS` into `DEFAULTS` and `SB_CHOICES` into `CHOICES`.
2. Replace the app's `overlays` with this one. In `build_reel` and `full_game` pass
   `sb=board and board[0], timeline=board and score_timeline(board[1], board[2], a, b)`.
3. In `process()`, after `find_rallies`: `chains = point_chains(hits, opt["gap"], active)` (from this module), then
   `board, winners = phone_board(src, dur, chains, opt, log, Taps()) or (None, None)`; add the `points` list to
   `rallies.json` (see v3.4).
4. GUI: start `ScoreServer(Taps(), live)` with the app, stop it on close, and restore the Scoreboard page from v3.4.
5. Trial edition: add `sb=False` to `TRIAL_LIMITS`.

Before shipping it again: a real auto-tally needs rally-winner detection (ball tracking or a trained model on the
labeled taps this collects), plus a PIN on the scoring page.
