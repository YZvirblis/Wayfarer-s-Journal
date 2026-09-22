@echo off
setlocal
cd /d "%~dp0"

set "PORT=4777"
if not "%WJ_PORT%"=="" set "PORT=%WJ_PORT%"

echo.
echo   Closing Wayfarer's Journal (port %PORT%)...

set "STOPPED="
for /f "tokens=5" %%p in ('netstat -ano -p tcp ^| findstr /c:"127.0.0.1:%PORT%" ^| findstr /c:"LISTENING"') do (
    taskkill /PID %%p /F >nul 2>nul
    if not errorlevel 1 set "STOPPED=1"
)

if defined STOPPED (
    echo   Closed. Your journal is saved on disk.
) else (
    echo   Nothing was running on port %PORT%.
)
echo.
timeout /t 3 >nul
