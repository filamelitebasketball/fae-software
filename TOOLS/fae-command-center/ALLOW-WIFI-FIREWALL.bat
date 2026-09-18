@echo off
REM ===========================================================================
REM  Let the office phones reach this computer
REM
REM  Run this ONCE, and only if the phones cannot open the ticket form after
REM  you started START-COMMAND-CENTER-WIFI.bat. It asks Windows to allow
REM  incoming connections on port 8765/8766 from the OFFICE network only.
REM
REM  Right-click this file -> "Run as administrator".
REM ===========================================================================

title F.A.E. - allow office Wi-Fi access

net session >nul 2>&1
if errorlevel 1 (
  echo.
  echo   This has to run as administrator.
  echo   Close this window, RIGHT-CLICK the file, and choose
  echo   "Run as administrator".
  echo.
  pause
  exit /b 1
)

echo.
echo   Adding the firewall rule...
echo.

netsh advfirewall firewall delete rule name="F.A.E. Command Center" >nul 2>&1
netsh advfirewall firewall add rule name="F.A.E. Command Center" ^
  dir=in action=allow protocol=TCP localport=8765-8766 profile=private ^
  description="Lets staff phones on the office Wi-Fi open the F.A.E. Command Center and send daily task tickets."

if errorlevel 1 (
  echo.
  echo   That did not work. You can add it by hand:
  echo   Windows Security ^> Firewall ^> Advanced settings ^> Inbound Rules ^>
  echo   New Rule ^> Port ^> TCP ^> 8765-8766 ^> Allow ^> Private only.
) else (
  echo.
  echo   Done. Phones on the office Wi-Fi can now reach the Command Center.
  echo   This only applies to networks Windows calls "Private" - not to
  echo   public Wi-Fi in a mall or coffee shop.
)

echo.
pause
