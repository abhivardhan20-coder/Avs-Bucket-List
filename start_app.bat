@echo off
setlocal enabledelayedexpansion
title AV's Bucket List - Bootstrapper

:: --- CONFIGURATION ---
set PORT=3000
set B_PORT=8000
set CHROME="C:\Program Files\Google\Chrome\Application\chrome.exe"
set BRAVE="C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe"
set EDGE="C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
:: ---------------------

echo.
echo  ================================================
echo     AV's Bucket List - System Startup
echo  ================================================
echo.

:: 1. Cleanup old processes using PowerShell (more reliable)
echo [1/4] Checking for stale processes...
powershell -Command "Get-NetTCPConnection -LocalPort %PORT% -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }"
powershell -Command "Get-NetTCPConnection -LocalPort %B_PORT% -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }"

:: 2. Dependencies
if not exist "node_modules\" (
    echo [2/4] Installing dependencies...
    call npm install
)

:: 3. Start Servers
echo [3/4] Starting Frontend Server...
start /B npm run dev -- --port %PORT%

if exist "backend\main.py" (
    echo     ^> Starting Backend...
    start /B python backend/main.py
)

:: 4. Launch Browser
echo [4/4] Waiting for server to respond...
set ATTEMPTS=0
:WAIT_LOOP
set /a ATTEMPTS+=1
if %ATTEMPTS% gtr 20 (
    echo [!] Server failed to start in time.
    goto ERROR
)
powershell -Command "(New-Object System.Net.WebClient).DownloadString('http://localhost:%PORT%')" > nul 2>&1
if %ERRORLEVEL% neq 0 (
    timeout /t 1 /nobreak > nul
    goto WAIT_LOOP
)

echo     ^> Server is LIVE. Launching App...
start "" README.md

:: Try Chrome
if exist %CHROME% (
    start "" /WAIT %CHROME% --app=http://localhost:%PORT% --user-data-dir="%CD%\.pwa-profile" --no-first-run
    goto CLEANUP
)

:: Try Brave
if exist %BRAVE% (
    start "" /WAIT %BRAVE% --app=http://localhost:%PORT% --user-data-dir="%CD%\.pwa-profile" --no-first-run
    goto CLEANUP
)

:: Try Edge
if exist %EDGE% (
    start "" /WAIT %EDGE% --app=http://localhost:%PORT% --user-data-dir="%CD%\.pwa-profile" --no-first-run
    goto CLEANUP
)

:: Fallback
echo [!] Chromium browser not found. Launching in default browser...
start http://localhost:%PORT%
echo.
echo Press any key to shutdown the server...
pause > nul

:CLEANUP
echo.
echo [CLEANUP] Stopping background servers...
powershell -Command "Get-NetTCPConnection -LocalPort %PORT% -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }"
powershell -Command "Get-NetTCPConnection -LocalPort %B_PORT% -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }"
echo System shutdown complete.
timeout /t 2 > nul
exit

:ERROR
echo.
echo ================================================
echo    FATAL ERROR: System failed to start.
echo ================================================
echo.
pause
exit
