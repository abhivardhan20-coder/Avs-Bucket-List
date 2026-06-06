@echo off
setlocal enabledelayedexpansion
title AV's Bucket List - Bootstrapper

:: --- CONFIGURATION ---
set PORT=3000

:: Find Chrome in common installation paths
set CHROME=
if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" (
    set CHROME="C:\Program Files\Google\Chrome\Application\chrome.exe"
) else if exist "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" (
    set CHROME="C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
) else if exist "%USERPROFILE%\AppData\Local\Google\Chrome\Application\chrome.exe" (
    set CHROME="%USERPROFILE%\AppData\Local\Google\Chrome\Application\chrome.exe"
) else if exist "%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe" (
    set CHROME="%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe"
)

:: Find Brave in common installation paths
set BRAVE=
if exist "C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe" (
    set BRAVE="C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe"
) else if exist "C:\Program Files (x86)\BraveSoftware\Brave-Browser\Application\brave.exe" (
    set BRAVE="C:\Program Files (x86)\BraveSoftware\Brave-Browser\Application\brave.exe"
) else if exist "%USERPROFILE%\AppData\Local\BraveSoftware\Brave-Browser\Application\brave.exe" (
    set BRAVE="%USERPROFILE%\AppData\Local\BraveSoftware\Brave-Browser\Application\brave.exe"
) else if exist "%LOCALAPPDATA%\BraveSoftware\Brave-Browser\Application\brave.exe" (
    set BRAVE="%LOCALAPPDATA%\BraveSoftware\Brave-Browser\Application\brave.exe"
)

:: Find Edge in common installation paths
set EDGE=
if exist "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" (
    set EDGE="C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
) else if exist "C:\Program Files\Microsoft\Edge\Application\msedge.exe" (
    set EDGE="C:\Program Files\Microsoft\Edge\Application\msedge.exe"
) else if exist "%USERPROFILE%\AppData\Local\Microsoft\Edge\Application\msedge.exe" (
    set EDGE="%USERPROFILE%\AppData\Local\Microsoft\Edge\Application\msedge.exe"
) else if exist "%LOCALAPPDATA%\Microsoft\Edge\Application\msedge.exe" (
    set EDGE="%LOCALAPPDATA%\Microsoft\Edge\Application\msedge.exe"
)
:: ---------------------

echo.
echo  ================================================
echo     AV's Bucket List - System Startup (Supabase)
echo  ================================================
echo.

:: 1. Cleanup old processes using standard cmd utilities
echo [1/3] Checking for stale processes on port %PORT%...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :%PORT% ^| findstr LISTENING 2^>nul') do (
    echo     ^> Killing process %%a running on port %PORT%...
    taskkill /F /PID %%a >nul 2>&1
)

:: 2. Dependencies check
if not exist "node_modules\" (
    echo [2/3] Installing dependencies...
    call npm install --legacy-peer-deps
)

:: 3. Start Server
echo [3/3] Starting Frontend Server...
start /B npm run dev -- --port %PORT%

:: 4. Launch Browser
echo Waiting for frontend server to respond...
set ATTEMPTS=0
:WAIT_LOOP
set /a ATTEMPTS+=1
if %ATTEMPTS% gtr 20 (
    echo [!] Server failed to start in time.
    goto ERROR
)
:: Use native curl if available, fallback to PowerShell
curl -s -I http://localhost:%PORT% > nul 2>&1
if %ERRORLEVEL% neq 0 (
    powershell -Command "(New-Object System.Net.WebClient).DownloadString('http://localhost:%PORT%')" > nul 2>&1
    if !ERRORLEVEL! neq 0 (
        timeout /t 1 /nobreak > nul
        goto WAIT_LOOP
    )
)

echo     ^> Server is LIVE. Launching App...

:: Try Chrome
if defined CHROME (
    if exist %CHROME% (
        start "" /WAIT %CHROME% --app=http://localhost:%PORT% --user-data-dir="%CD%\.pwa-profile" --no-first-run --remote-debugging-port=9222
        goto CLEANUP
    )
)

:: Try Brave
if defined BRAVE (
    if exist %BRAVE% (
        start "" /WAIT %BRAVE% --app=http://localhost:%PORT% --user-data-dir="%CD%\.pwa-profile" --no-first-run --remote-debugging-port=9222
        goto CLEANUP
    )
)

:: Try Edge
if defined EDGE (
    if exist %EDGE% (
        start "" /WAIT %EDGE% --app=http://localhost:%PORT% --user-data-dir="%CD%\.pwa-profile" --no-first-run --remote-debugging-port=9222
        goto CLEANUP
    )
)

:: Fallback
echo [!] Chromium browser not found. Launching in default browser...
start http://localhost:%PORT%
echo.
echo Press any key to shutdown the server...
pause > nul

:CLEANUP
echo.
echo [CLEANUP] Stopping background server...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :%PORT% ^| findstr LISTENING 2^>nul') do (
    taskkill /F /PID %%a >nul 2>&1
)
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
