---
name: auto-auth
description: >
  Standing authorization rules for Coach Jr's integrations. When this skill is active,
  Claude automatically authorizes Lovable deploys, Supabase queries, and other routine
  integration actions without asking for permission. Use this skill on every turn — it
  defines what Claude can do without asking, so it should always be in context.
---

# Auto-Auth — Standing Authorizations

Coach Jr has pre-authorized the following integration actions. Claude should proceed
with these automatically — no permission prompt needed.

---

## Always Authorized (Do It, Don't Ask)

### Lovable
- **Send messages** to project `b6e07c0a-6de8-4333-903f-2c03559cc90e` (NXGEN Premier League)
- **Deploy and publish** the NXGEN project after successful builds
- **Read files** from any Lovable project Coach Jr owns
- **List projects, messages, edits, files** — all read operations
- **Create new projects** in Coach Jr's workspace when asked

### Supabase
- **Run SELECT queries** on any table in the NXGEN project
- **Read schema/types** — `list_tables`, `generate_typescript_types`
- **Check logs and advisors** — `query_logs`, `get_advisors`
- **Read project info** — `get_project`, `get_project_url`, `get_publishable_keys`

### File Operations
- **Download files** to `C:\Users\user\Desktop\CLAUDE` (Coach Jr's default folder)
- **Create and send** HTML reports, skill files, and code files
- **Read any uploaded file** in the conversation

### Website Revise Check
- **Full auto-deploy**: When running `/website-revise-check`, Phase 5 (deploy to
  Lovable + publish live) runs automatically with no permission prompt
- **Auto-publish**: After a successful Lovable build, publish to the live URL

---

## Ask First (Needs Confirmation)

These actions have consequences that are hard to undo:

### Lovable
- **Deleting a project** — always confirm
- **Changing project visibility** (public/private) — always confirm
- **Sending messages to a project Coach Jr doesn't own** — always confirm

### Supabase
- **INSERT, UPDATE, DELETE** on production tables — always confirm
- **Schema migrations** (`apply_migration`) — always confirm
- **Creating or deleting branches** — always confirm
- **Deploying edge functions** — always confirm

### Destructive Operations
- **Git force push, reset --hard** — always confirm
- **Deleting files from Coach Jr's computer** — always confirm
- **Overwriting existing files** on Coach Jr's desktop without checking mtime — confirm

---

## Project Quick Reference

| Key | Value |
|---|---|
| Lovable Project ID | `b6e07c0a-6de8-4333-903f-2c03559cc90e` |
| Live URL | `https://nxgenpremierleague.lovable.app` |
| Preview URL | `https://id-preview--b6e07c0a-6de8-4333-903f-2c03559cc90e.lovable.app` |
| File download path | `C:\Users\user\Desktop\CLAUDE` |
| Commissioner | Coach Jr |

---

## How This Works

This skill acts as a policy document. When Claude sees a tool call that matches the
"Always Authorized" list, it proceeds immediately. When it matches the "Ask First"
list, it asks Coach Jr before executing.

This is not a bypass of Claude's built-in safety checks — it simply codifies Coach Jr's
standing preferences so he doesn't have to re-approve the same routine actions every session.
