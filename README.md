# F.A.E. / NXGEN — Software

Working code for F.A.E. Sports Complex and the NXGEN Premier League.
Mirrored to GitHub so it stays reachable when the desktop PC is off.

## What's here

| Folder | What it is |
|---|---|
| `fae-command-center/` | Front-desk hub (static HTML). Dashboard, court schedule, payroll, playbook, NXGEN stats. Open `index.html` in a browser. |
| `fae-hub/` | F.A.E. booking site — Vite + TanStack Router + Supabase. Lovable project. |
| `claude-tooling/` | Claude Code plugin (`nxgen-stat-center`) and the saved skill library. |

## What's deliberately NOT here

- **`nxgen-premier-league/`** — has its own repo: `filamelitebasketball/nxgenpremierleague`. Clone it separately.
- **`.env` files** — Supabase URLs and publishable keys stay local. Copy them from the PC, or pull them from the Lovable project settings.
- **`*.zip` snapshots and `nxgen-codebase-snapshots/`** — large and regenerable.

## Getting set up on another machine

```bash
git clone <this repo>
cd fae-hub && bun install
# then create fae-hub/.env with the SUPABASE_* and VITE_SUPABASE_* values
bun run dev
```

`fae-command-center/` needs no build — just open the HTML files.

## Changing things

Command Center changes get logged in `fae-command-center/logs/CHANGELOG.md`. Keep that habit.
