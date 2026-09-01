---
name: nxgen-no-credit-deploy-via-github
description: How to ship changes to the NXGEN Premier League Lovable site without spending Lovable credits - push to main on GitHub.
metadata: 
  node_type: memory
  type: project
  originSessionId: 7c40abd5-eb93-4b79-bd31-1a009f8f91bb
  modified: 2026-08-31T16:24:12.701Z
---

The NXGEN site (nxgenpremierleague.lovable.app) syncs bidirectionally with a
GitHub repo. Editing code locally and pushing to `main` makes Lovable rebuild
the live site **without invoking the Lovable AI agent, so it costs no Lovable
credits**. Prompting inside the Lovable editor does cost credits. This is the
whole point of the GitHub setup — prefer pushes over prompts for anything that
can be written as code.

- Repo: `https://github.com/filamelitebasketball/nxgenpremierleague.git` (private)
- Local clone: `C:\dev\nxgen` (set up 2026-09-01). Deliberately OUTSIDE OneDrive —
  `node_modules` is 30k+ files and OneDrive sync causes lock conflicts and broken
  installs. GitHub is the backup; never move a dev repo back under OneDrive.
- Lovable project id: `b6e07c0a-6de8-4333-903f-2c03559cc90e`, workspace `T2ndaReXiLQE35GnF4pR` ("FILAM's Lovable", Pro)
- Stack: TanStack Start + TypeScript + Vite + Tailwind + Supabase, 257 files

Auth: a GitHub token for user `filamelitebasketball` is stored in Windows
Credential Manager (written by GitHub Desktop), and git's `credential.helper=manager`
reads it. Clone/fetch/push work with no prompt. Do not re-run any auth setup
before testing whether push already works.

The committed `.env` holds only Supabase *publishable* values (`VITE_`-prefixed
anon key, URL, project id) — these ship in the browser bundle by design. Not a
leak, do not "fix" it. There is no service_role key in the repo.

Node v24.19.0 + npm 11.17.0 installed 2026-09-01 via winget at
`C:\Program Files\nodejs`. Machine PATH is set, but a shell started before the
install has a stale env — call the full path `"C:\Program Files\nodejs\npm.cmd"`
if `npm` reports not found. `npm run dev` previews locally before pushing.

`NXGENPREMIERLEAGUE.zip` on the Desktop\Claude folder is a dead code export with
no git history. Work in the clone, never the zip.
