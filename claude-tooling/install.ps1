# F.A.E. Claude Code tooling installer (Windows / PowerShell)
#
#   Run from this folder:   .\install.ps1
#   Preview only:           .\install.ps1 -DryRun
#   Skip settings merge:    .\install.ps1 -SkillsOnly
#   Memory for another folder: .\install.ps1 -ProjectPath "D:\work\CLAUDE"
#
# What it does:
#   1. Merges the marketplace + plugin list into ~/.claude/settings.json
#      (existing settings are backed up first; your own keys are preserved)
#   2. Copies the F.A.E. skills into ~/.claude/skills
#   3. Copies the slash commands into ~/.claude/commands
#   4. Copies the F.A.E. project memory into the memory folder for -ProjectPath
#   5. Copies the saved scheduled tasks into ~/.claude/scheduled-tasks
#
# Claude Code fetches the marketplaces and installs the enabled plugins on its
# next launch. Nothing here touches credentials or MCP auth.

[CmdletBinding()]
param(
    [switch]$DryRun,
    [switch]$SkillsOnly,
    [string]$ProjectPath = (Join-Path $env:USERPROFILE 'Desktop\CLAUDE')
)

$ErrorActionPreference = 'Stop'
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$claudeDir = Join-Path $env:USERPROFILE '.claude'
$settingsPath = Join-Path $claudeDir 'settings.json'
$templatePath = Join-Path $here 'settings\settings.template.json'

function Say($msg, $color = 'Gray') { Write-Host $msg -ForegroundColor $color }

Say ''
Say '=== F.A.E. Claude Code tooling installer ===' Cyan
Say "Target: $claudeDir"
if ($DryRun) { Say 'DRY RUN - nothing will be written.' Yellow }
Say ''

if (-not (Test-Path $claudeDir)) {
    Say "Creating $claudeDir"
    if (-not $DryRun) { New-Item -ItemType Directory -Path $claudeDir -Force | Out-Null }
}

# --- 1. settings.json merge ------------------------------------------------
if (-not $SkillsOnly) {
    if (-not (Test-Path $templatePath)) { throw "Missing template: $templatePath" }
    $template = Get-Content $templatePath -Raw | ConvertFrom-Json

    if (Test-Path $settingsPath) {
        $stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
        $backup = Join-Path $claudeDir "settings.backup-$stamp.json"
        Say "Backing up existing settings -> $(Split-Path -Leaf $backup)" Yellow
        if (-not $DryRun) { Copy-Item $settingsPath $backup }
        $settings = Get-Content $settingsPath -Raw | ConvertFrom-Json
    } else {
        Say 'No existing settings.json - creating a new one.'
        $settings = [pscustomobject]@{}
    }

    # Scalar / object keys: only set when absent, so local choices survive.
    foreach ($key in @('permissions', 'enableWorkflows', 'agentPushNotifEnabled')) {
        if ($null -eq $settings.PSObject.Properties[$key]) {
            $settings | Add-Member -NotePropertyName $key -NotePropertyValue $template.$key -Force
            Say "  set $key"
        } else {
            Say "  keep existing $key" DarkGray
        }
    }

    # Map keys: union - add anything missing, never remove what is already there.
    foreach ($key in @('extraKnownMarketplaces', 'enabledPlugins')) {
        if ($null -eq $settings.PSObject.Properties[$key]) {
            $settings | Add-Member -NotePropertyName $key -NotePropertyValue ([pscustomobject]@{}) -Force
        }
        $added = 0
        foreach ($prop in $template.$key.PSObject.Properties) {
            if ($null -eq $settings.$key.PSObject.Properties[$prop.Name]) {
                $settings.$key | Add-Member -NotePropertyName $prop.Name -NotePropertyValue $prop.Value -Force
                $added++
            }
        }
        Say "  $key : +$added added, $(($settings.$key.PSObject.Properties | Measure-Object).Count) total"
    }

    if (-not $DryRun) {
        $settings | ConvertTo-Json -Depth 20 | Set-Content -Path $settingsPath -Encoding utf8
        Say "Wrote $settingsPath" Green
    }
} else {
    Say 'Skipping settings merge (-SkillsOnly).' DarkGray
}

# --- 2 & 3. skills and commands -------------------------------------------
function Copy-Tree($srcName, $dstName) {
    $src = Join-Path $here $srcName
    if (-not (Test-Path $src)) { Say "No $srcName folder - skipping." DarkGray; return }
    $dst = Join-Path $claudeDir $dstName
    if (-not (Test-Path $dst) -and -not $DryRun) { New-Item -ItemType Directory -Path $dst -Force | Out-Null }
    Get-ChildItem $src | ForEach-Object {
        Say "  $dstName/$($_.Name)"
        if (-not $DryRun) { Copy-Item $_.FullName -Destination $dst -Recurse -Force }
    }
}

Say ''
Say 'Installing F.A.E. skills:'
Copy-Tree 'skills' 'skills'
Say 'Installing slash commands:'
Copy-Tree 'commands' 'commands'
Say 'Installing saved scheduled tasks:'
Copy-Tree 'scheduled-tasks' 'scheduled-tasks'

# --- 4. project memory -----------------------------------------------------
# Claude Code keys memory to the working folder: C:\Users\me\Desktop\CLAUDE
# becomes ~/.claude/projects/C--Users-me-Desktop-CLAUDE/memory. Rebuild that
# name for whatever folder this machine will actually work in.
$memorySrc = Join-Path $here 'memory'
if (Test-Path $memorySrc) {
    $slug = $ProjectPath -replace '[:\\/]', '-'
    $memoryDst = Join-Path $claudeDir "projects\$slug\memory"
    Say ''
    Say "Installing F.A.E. memory for $ProjectPath"
    Say "  -> projects\$slug\memory" DarkGray
    if (-not $DryRun) { New-Item -ItemType Directory -Path $memoryDst -Force | Out-Null }
    Get-ChildItem $memorySrc -Filter *.md | ForEach-Object {
        Say "  $($_.Name)"
        if (-not $DryRun) { Copy-Item $_.FullName -Destination $memoryDst -Force }
    }
    if ($ProjectPath -ne (Join-Path $env:USERPROFILE 'Desktop\CLAUDE')) {
        Say '  (non-default folder - memory only loads when Claude Code runs there)' Yellow
    }
} else {
    Say 'No memory folder - skipping.' DarkGray
}

Say ''
Say 'Done.' Green
Say 'Next: start Claude Code. It will fetch the marketplaces and install the'
Say 'plugins on first launch (one-off, needs internet). Sign in with'
Say 'filamelitebasketball@gmail.com to pull the account-synced skills too.'
Say 'Verify with:  claude plugin list'
Say ''
