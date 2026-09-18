@echo off
REM ===========================================================================
REM  F.A.E. COMMAND CENTER - one-click launcher
REM
REM  Double-click this file. It starts a small local server and opens the
REM  Command Center in your browser with LIVE court schedule reading turned on.
REM
REM  Leave the black window open while you work. Closing it stops live mode.
REM ===========================================================================

title F.A.E. Command Center - leave this window open
cd /d "%~dp0"

echo.
echo   F.A.E. COMMAND CENTER
echo   =====================
echo.

REM --- find Python -----------------------------------------------------------
set "PY="
where py >nul 2>&1 && set "PY=py"
if not defined PY ( where python >nul 2>&1 && set "PY=python" )

if not defined PY (
  echo   Python was not found on this computer.
  echo.
  echo   The Command Center still works without it - it just cannot read the
  echo   live court schedule. Close this window and open  console.html  directly.
  echo.
  echo   To turn live mode on, install Python from https://python.org
  echo   and tick "Add python.exe to PATH" during setup.
  echo.
  pause
  exit /b 1
)

REM --- pick a free port ------------------------------------------------------
set "PORT=8765"
netstat -ano ^| findstr ":%PORT%" >nul 2>&1 && set "PORT=8766"

echo   Starting live mode on port %PORT% ...
echo.

start "" "http://127.0.0.1:%PORT%/console.html"

echo   Command Center is open in your browser.
echo.
echo   KEEP THIS WINDOW OPEN while you are using it.
echo   Closing it turns live mode off.
echo.

%PY% -m http.server %PORT% --bind 127.0.0.1

echo.
echo   Live mode stopped.
pause
