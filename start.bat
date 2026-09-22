@echo off
setlocal enabledelayedexpansion
title Wayfarer's Journal
cd /d "%~dp0"

echo.
echo   ======================================
echo     Wayfarer's Journal
echo   ======================================
echo.

rem --- 1. Is Node.js installed? ------------------------------------------
where node >nul 2>nul
if errorlevel 1 goto no_node

for /f "tokens=1 delims=." %%v in ('node -v 2^>nul') do set "NODE_MAJOR=%%v"
set "NODE_MAJOR=!NODE_MAJOR:v=!"
if not defined NODE_MAJOR goto no_node
if !NODE_MAJOR! LSS 20 goto old_node

rem --- 2. First run: install dependencies --------------------------------
if not exist "node_modules\" (
    echo   First time here, so a few pieces need downloading.
    echo   This happens once and usually takes a minute or two.
    echo.
    call npm install --no-audit --no-fund
    if errorlevel 1 goto failed
    echo.
)

rem --- 3. Build the journal if it has not been built yet -----------------
if not exist "dist\client\index.html" (
    echo   Preparing the journal...
    echo.
    call npm run build
    if errorlevel 1 goto failed
    echo.
)

rem --- 4. Run -------------------------------------------------------------
echo   Opening your journal in the browser.
echo   Keep this window open while you write - closing it closes the journal.
echo.
set "WJ_OPEN=1"
call npm start
goto :eof

:no_node
echo   Node.js is not installed, and this app needs it to run.
echo.
echo     1. Go to   https://nodejs.org/en/download
echo     2. Download the version marked "LTS" and install it
echo        (the default options are fine)
echo     3. Close this window, then run start.bat again
echo.
pause
exit /b 1

:old_node
echo   Your Node.js is version !NODE_MAJOR!, which is too old for this app.
echo   Version 20 or newer is needed.
echo.
echo     Get the latest "LTS" version from  https://nodejs.org/en/download
echo     then close this window and run start.bat again.
echo.
pause
exit /b 1

:failed
echo.
echo   Something went wrong during setup - the details are above.
echo   If you cannot make sense of it, copy this window's text into an issue at
echo   https://github.com/YZvirblis/Wayfarer-s-Journal/issues
echo.
pause
exit /b 1
