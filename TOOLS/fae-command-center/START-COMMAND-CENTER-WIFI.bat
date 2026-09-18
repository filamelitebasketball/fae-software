@echo off
REM ===========================================================================
REM  F.A.E. COMMAND CENTER - OFFICE WI-FI MODE
REM
REM  Same as START-COMMAND-CENTER.bat, but it also lets the STAFF PHONES on the
REM  office Wi-Fi open the Daily Task Ticket form - and it receives what they
REM  submit straight into  data\tickets\ .
REM
REM  Use the plain START-COMMAND-CENTER.bat instead if you only want this
REM  computer to see the Command Center.
REM
REM  First time only: Windows will ask "Allow access?" - tick PRIVATE networks
REM  and click Allow. If you miss it, run ALLOW-WIFI-FIREWALL.bat once.
REM ===========================================================================

title F.A.E. Command Center - WI-FI MODE - leave this window open
cd /d "%~dp0"

echo.
echo   F.A.E. COMMAND CENTER  -  starting Wi-Fi mode...
echo.

REM --- find Python -----------------------------------------------------------
set "PY="
where py >nul 2>&1 && set "PY=py"
if not defined PY ( where python >nul 2>&1 && set "PY=python" )

if not defined PY (
  echo   Python was not found on this computer.
  echo.
  echo   Wi-Fi mode needs it. Install Python from https://python.org
  echo   and tick "Add python.exe to PATH" during setup, then run this again.
  echo.
  echo   Without Python you can still use the Command Center on this PC -
  echo   close this window and open  console.html  directly.
  echo.
  pause
  exit /b 1
)

REM --- pick a free port ------------------------------------------------------
set "PORT=8765"
netstat -ano ^| findstr ":%PORT%" >nul 2>&1 && set "PORT=8766"

start "" "http://127.0.0.1:%PORT%/console.html"

%PY% "%~dp0fae-server.py" %PORT%

echo.
echo   Wi-Fi mode stopped. Phones can no longer send tickets.
pause
