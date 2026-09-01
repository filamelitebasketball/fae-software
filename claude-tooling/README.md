# F.A.E. Claude Code Tooling

Everything Claude Code needs on a new machine: the 16 plugin marketplaces, the
39 plugins, and the seven F.A.E. skills built for the league. Captured from the
home desktop on 2026-09-01 so the same setup can be installed at the FAE court.

---

## Install at the court

Clone the software repo, then run the installer from this folder.

```bash
git clone https://github.com/filamelitebasketball/fae-software.git
```

**Windows (PowerShell)** — from `fae-software\claude-tooling`:

```bash
powershell -ExecutionPolicy Bypass -File .\install.ps1
```

**macOS / Linux / Git Bash:**

```bash
./install.sh
```

Preview without writing anything: add `-DryRun` (PowerShell) or `--dry-run` (bash).

Then start Claude Code. It fetches the marketplaces and installs the plugins on
first launch — that one launch needs internet and takes a few minutes. Check it
worked with:

```bash
claude plugin list
```

---

## What the installer does

1. **Merges** `settings/settings.template.json` into `~/.claude/settings.json`.
   The existing file is backed up to `~/.claude/settings.backup-<timestamp>.json`
   first. The merge is additive: marketplaces and plugins get added, and any key
   already present on that machine is left alone.
2. **Copies** `skills/` into `~/.claude/skills/`.
3. **Copies** `commands/` into `~/.claude/commands/`.
4. **Copies** `scheduled-tasks/` into `~/.claude/scheduled-tasks/`.
5. **Copies** `memory/` into the memory folder for the working directory.

It never touches credentials, MCP auth tokens, or session data.

### About the memory step

Claude Code keys project memory to the folder it runs in — working in
`C:\Users\me\Desktop\CLAUDE` means memory lives in
`~/.claude/projects/C--Users-me-Desktop-CLAUDE/memory/`. The installer rebuilds
that folder name, defaulting to `<your home>\Desktop\CLAUDE`. If the court
machine keeps its F.A.E. files somewhere else, say so:

```bash
powershell -ExecutionPolicy Bypass -File .\install.ps1 -ProjectPath "D:\FAE\CLAUDE"
```

Memory only loads when Claude Code is started in that folder. Point it at the
wrong path and the memory sits there unread.

---

## F.A.E. skills included

| Skill | What it does |
|---|---|
| `agent-execution` | Delegating business workflows to subagents |
| `auto-skill-saver` | Packages any newly created skill for saving |
| `deploy-to-lovable` | Sends `/website-revise-check` prompts to Lovable and watches the build |
| `model-efficiency` | Picks the cheapest model that still does the job |
| `skill-engine` | Extracts reusable code patterns out of the NXGEN codebase |
| `stat-command-center` | Game-night stat entry → Supabase → box scores and standings |
| `white-label-template-engine` | Rebrands the NXGEN site for a new league |

Slash command: `/stats` (opens the stat command center dashboard).

The originals stay where they were — `skill-library/` (flat `.skill.md` files)
and `nxgen-stat-center/`. The `skills/` and `commands/` folders are the
installable copies, in the `skills/<name>/SKILL.md` layout Claude Code expects.
Edit the originals and re-run the packaging, or edit `skills/` directly and
treat it as the source of truth — just don't let the two drift silently.

---

## Plugins by marketplace

- **agent-browser** — `https://github.com/vercel-labs/agent-browser.git`
  `agent-browser`
- **awesome-claude-plugins** — `https://github.com/composiohq/awesome-claude-plugins.git`
  `agent-sdk-dev`, `artifacts-builder`, `audit-project`, `backend-architect`, `bug-fix`, `canvas-design`, `changelog-generator`, `code-review`, `commit`, `connect-apps`, `create-pr`, `debugger`, `developer-growth-analysis`, `documentation-generator`, `frontend-design`, `frontend-developer`, `mcp-builder`, `perf`, `pr-review`, `security-guidance`, `senior-frontend`, `ship`, `test-writer-fixer`, `theme-factory`
- **caveman** — `https://github.com/juliusbrussee/caveman.git`
  `caveman`
- **claude-plugins-official** — `https://github.com/anthropics/claude-plugins-official.git`
  `outputai`
- **ecc** — `https://github.com/affaan-m/ECC.git`
  `ecc`
- **impeccable** — `https://github.com/pbakaus/impeccable.git`
  `impeccable`
- **karpathy-skills** — `https://github.com/forrestchang/andrej-karpathy-skills.git`
  `andrej-karpathy-skills`
- **mattpocock** — `https://github.com/mattpocock/skills.git`
  `mattpocock-skills`
- **obsidian-skills** — `https://github.com/kepano/obsidian-skills.git`
  `obsidian`
- **ponytail** — `https://github.com/DietrichGebert/ponytail.git`
  `ponytail`
- **superpowers-marketplace** — `https://github.com/obra/superpowers-marketplace.git`
  `episodic-memory`, `superpowers-dev`, `superpowers-developing-for-claude-code`, `superpowers-lab`
- **taste-skill** — `https://github.com/Leonxlnx/taste-skill.git`
  `taste-skill`
- **ui-ux-pro-max-skill** — `https://github.com/nextlevelbuilder/ui-ux-pro-max-skill.git`
  `ui-ux-pro-max`

Three more marketplaces are registered but have nothing installed from them yet —
`knowledge-work-plugins`, `voltagent-subagents`, `addy-agent-skills`. They come
along so they're one `claude plugin install` away at the court.

The machine-readable version of all of this is `manifest.json`.

---

## What does *not* travel in this repo

- **Credentials and MCP auth.** `~/.claude/.credentials.json` stays put. At the
  court, sign in as `filamelitebasketball@gmail.com` and re-authorize the
  connectors (Lovable, Supabase, Google Drive, Gmail, Notion, Canva…) from the
  claude.ai connector settings.
- **Account-synced skills.** `fae-quote`, `fae-dashboard-builder`, `morning`,
  `schedule` and the rest of the `anthropic-skills:*` set live on the Anthropic
  account, not on disk. They appear automatically once signed in.
- **`.env` files.** Excluded by `.gitignore` and staying that way. If the court
  machine runs `fae-hub` or the NXGEN site locally, carry the Supabase URL and
  publishable key across by hand.
- **`local-desktop-app-uploads`** marketplace — a local folder, currently empty.

## What `memory/` contains

The nine project-memory files, carried so the court machine starts with the same
F.A.E. context instead of blank. No credentials — checked before committing. They
do hold working handles: Google Drive and Sheet file IDs, Lovable project UUIDs,
the public `.lovable.app` URLs, and GitHub repo URLs. Anyone with read access to
this repo can reach those, which is a reason to keep the repo private.

---

## Manual install without the script

```bash
claude plugin marketplace add https://github.com/composiohq/awesome-claude-plugins.git
claude plugin install ship@awesome-claude-plugins
```

Repeat per `manifest.json`, then copy `skills/*` into `~/.claude/skills/` and
`commands/*` into `~/.claude/commands/`.

---

## Re-capturing after changes at home

Install a new plugin or write a new skill on the desktop, then regenerate the
manifest and settings template from the live config and commit. The generator
reads `~/.claude/plugins/installed_plugins.json`,
`~/.claude/plugins/known_marketplaces.json` and `~/.claude/settings.json`, and
writes `manifest.json` plus `settings/settings.template.json`. Ask Claude to
"re-capture the claude-tooling manifest" and it will redo this pass.
