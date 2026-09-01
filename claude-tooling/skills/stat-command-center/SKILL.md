---
name: stat-command-center
description: Use when entering basketball game stats, pushing stats to Supabase, generating box score Excel sheets, or computing standings/leaders for the NXGEN Premier League
---

# NXGEN Stat Command Center

Process game-night basketball statistics for the NXGEN Premier League. This skill handles the full pipeline from raw stat entry to live website updates.

## When to use

- User says "enter stats", "game stats", "box score", "push stats"
- User forwards a stat sheet or raw numbers after a game
- User asks to update standings, leaders, or player averages
- User wants an Excel export of game results

## Supabase schema

**Project ref:** `lpsjbgdxkguouryexoth`

### `player_stats` table
| Column | Type | Required |
|--------|------|----------|
| player_id | uuid (FK → profiles.id) | yes |
| game_id | uuid (FK → games.id) | yes |
| team_id | uuid (FK → teams.id) | no |
| division | text | yes |
| points | int (default 0) | no |
| assists | int (default 0) | no |
| rebounds | int (default 0) | no |
| steals | int (default 0) | no |
| blocks | int (default 0) | no |
| minutes | int | no |

### `games` table
| Column | Type | Required |
|--------|------|----------|
| division | text | yes |
| home_team_id | uuid | no |
| away_team_id | uuid | no |
| home_team_name | text | no |
| away_team_name | text | no |
| home_score | int | no |
| away_score | int | no |
| scheduled_at | timestamptz | yes |
| status | text (default 'scheduled') | no |
| venue | text | no |

## League structure

- 10 teams, 12 players per roster
- 9-week single round-robin (45 total games, 5 per week)
- Stats tracked: PTS, AST, REB, STL, BLK, MIN, FGM/FGA, 3PM/3PA, FTM/FTA, TO, PF

## Workflow

### 1. Receive stat data
When the user provides game stats (paste, photo, or typed), parse into structured format:
- Identify the game (week, matchup)
- Map player names to roster
- Extract all stat columns

### 2. Validate
- Check all players belong to the correct teams
- Verify point totals (PTS = FGM*2 + 3PM + FTM if shooting stats provided)
- Flag any anomalies (e.g., player with 50+ minutes)

### 3. Compute
- Team totals (home score, away score)
- Per-player averages across all games played (PPG, APG, RPG, SPG, BPG)
- Updated standings (W-L, PCT, PF, PA, DIFF)
- Updated league leaders

### 4. Push to Supabase
Use the Supabase MCP tools to:
- Upsert `player_stats` rows for each player in the game
- Update the `games` row with final scores and status = 'final'
- Log edits via `stat_edit_history` table

### 5. Export
Generate an Excel box score summary using the xlsx builder pattern (ZIP of XML files via PowerShell .NET compression — no external dependencies needed).

## Show the dashboard

When the user wants to see the dashboard or enter stats visually, render the stat command center widget using `show_widget`. See `references/dashboard-widget.md` for the full HTML template.

## Stat averages formula

```
PPG = total_points / games_played
APG = total_assists / games_played
RPG = total_rebounds / games_played
SPG = total_steals / games_played
BPG = total_blocks / games_played
FG% = field_goals_made / field_goals_attempted * 100
3P% = three_pointers_made / three_pointers_attempted * 100
FT% = free_throws_made / free_throws_attempted * 100
```
