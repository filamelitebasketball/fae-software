#!/usr/bin/env bash
# F.A.E. Claude Code tooling installer (macOS / Linux / Git Bash)
#
#   ./install.sh              install
#   ./install.sh --dry-run    preview only
#   ./install.sh --skills-only
#   ./install.sh --project-path "/d/work/CLAUDE"
#
# Same behaviour as install.ps1: merges marketplaces + plugins into
# ~/.claude/settings.json (backing up first, never dropping your own keys),
# then copies the F.A.E. skills, slash commands, scheduled tasks and project
# memory into place.

set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLAUDE_DIR="$HOME/.claude"
SETTINGS="$CLAUDE_DIR/settings.json"
TEMPLATE="$HERE/settings/settings.template.json"

DRY_RUN=0
SKILLS_ONLY=0
PROJECT_PATH="$HOME/Desktop/CLAUDE"
while [ $# -gt 0 ]; do
  case "$1" in
    --dry-run) DRY_RUN=1 ;;
    --skills-only) SKILLS_ONLY=1 ;;
    --project-path) shift; PROJECT_PATH="${1:-}" ;;
    *) echo "Unknown option: $1" >&2; exit 2 ;;
  esac
  shift
done

echo
echo "=== F.A.E. Claude Code tooling installer ==="
echo "Target: $CLAUDE_DIR"
[ "$DRY_RUN" = 1 ] && echo "DRY RUN - nothing will be written."
echo

command -v python >/dev/null 2>&1 && PY=python || PY=python3
mkdir -p "$CLAUDE_DIR"

if [ "$SKILLS_ONLY" = 0 ]; then
  [ -f "$TEMPLATE" ] || { echo "Missing template: $TEMPLATE" >&2; exit 1; }
  if [ -f "$SETTINGS" ]; then
    BACKUP="$CLAUDE_DIR/settings.backup-$(date +%Y%m%d-%H%M%S).json"
    echo "Backing up existing settings -> $(basename "$BACKUP")"
    [ "$DRY_RUN" = 1 ] || cp "$SETTINGS" "$BACKUP"
  fi
  DRY_RUN="$DRY_RUN" SETTINGS="$SETTINGS" TEMPLATE="$TEMPLATE" "$PY" - <<'PYEOF'
import json, os, collections

dry = os.environ["DRY_RUN"] == "1"
settings_path = os.environ["SETTINGS"]
template = json.load(open(os.environ["TEMPLATE"], encoding="utf-8"),
                     object_pairs_hook=collections.OrderedDict)

if os.path.exists(settings_path):
    settings = json.load(open(settings_path, encoding="utf-8"),
                         object_pairs_hook=collections.OrderedDict)
else:
    print("No existing settings.json - creating a new one.")
    settings = collections.OrderedDict()

for key in ("permissions", "enableWorkflows", "agentPushNotifEnabled"):
    if key not in settings:
        settings[key] = template[key]
        print("  set %s" % key)
    else:
        print("  keep existing %s" % key)

for key in ("extraKnownMarketplaces", "enabledPlugins"):
    settings.setdefault(key, collections.OrderedDict())
    added = 0
    for name, value in template[key].items():
        if name not in settings[key]:
            settings[key][name] = value
            added += 1
    print("  %s : +%d added, %d total" % (key, added, len(settings[key])))

if not dry:
    with open(settings_path, "w", encoding="utf-8") as f:
        json.dump(settings, f, indent=2)
        f.write("\n")
    print("Wrote %s" % settings_path)
PYEOF
else
  echo "Skipping settings merge (--skills-only)."
fi

copy_tree() {
  local src="$HERE/$1" dst="$CLAUDE_DIR/$2"
  [ -d "$src" ] || { echo "No $1 folder - skipping."; return; }
  [ "$DRY_RUN" = 1 ] || mkdir -p "$dst"
  for item in "$src"/*; do
    [ -e "$item" ] || continue
    echo "  $2/$(basename "$item")"
    [ "$DRY_RUN" = 1 ] || cp -R "$item" "$dst/"
  done
}

echo
echo "Installing F.A.E. skills:"
copy_tree skills skills
echo "Installing slash commands:"
copy_tree commands commands
echo "Installing saved scheduled tasks:"
copy_tree scheduled-tasks scheduled-tasks

# Claude Code keys memory to the working folder: C:\Users\me\Desktop\CLAUDE
# becomes ~/.claude/projects/C--Users-me-Desktop-CLAUDE/memory. Rebuild that
# name for whatever folder this machine will actually work in.
if [ -d "$HERE/memory" ]; then
  SLUG="$(printf '%s' "$PROJECT_PATH" | sed 's#[:\\/]#-#g')"
  MEM_DST="$CLAUDE_DIR/projects/$SLUG/memory"
  echo
  echo "Installing F.A.E. memory for $PROJECT_PATH"
  echo "  -> projects/$SLUG/memory"
  [ "$DRY_RUN" = 1 ] || mkdir -p "$MEM_DST"
  for f in "$HERE"/memory/*.md; do
    [ -e "$f" ] || continue
    echo "  $(basename "$f")"
    [ "$DRY_RUN" = 1 ] || cp "$f" "$MEM_DST/"
  done
else
  echo "No memory folder - skipping."
fi

echo
echo "Done."
echo "Next: start Claude Code. It will fetch the marketplaces and install the"
echo "plugins on first launch (one-off, needs internet). Sign in with"
echo "filamelitebasketball@gmail.com to pull the account-synced skills too."
echo "Verify with:  claude plugin list"
echo
