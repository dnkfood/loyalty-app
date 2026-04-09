@echo off
REM ============================================================================
REM Loyalty BFF — one-click installer for Windows Server 2016+
REM
REM Run from an Administrator cmd.exe in this folder:
REM   install.bat
REM
REM Prerequisites (the script verifies these and stops with a message if any
REM are missing — it does NOT auto-install system software):
REM   - Node.js 20.x (https://nodejs.org/dist/latest-v20.x/)
REM   - Git for Windows (https://git-scm.com/download/win)
REM   - PostgreSQL reachable via DATABASE_URL in apps\bff\.env
REM   - Redis or Memurai reachable via REDIS_URL in apps\bff\.env
REM   - nssm.exe in this folder (https://nssm.cc/download)
REM ============================================================================

setlocal enabledelayedexpansion

set SCRIPT_DIR=%~dp0
set REPO_ROOT=%SCRIPT_DIR%..\..
set SERVICE_NAME=LoyaltyBff
set NSSM=%SCRIPT_DIR%nssm.exe
set ENV_FILE=%REPO_ROOT%\apps\bff\.env
set LOG_DIR=%SCRIPT_DIR%logs

echo.
echo === Loyalty BFF installer ===
echo Repo root:    %REPO_ROOT%
echo Service name: %SERVICE_NAME%
echo.

REM --- Admin check -----------------------------------------------------------
net session >nul 2>&1
if errorlevel 1 (
    echo [ERROR] This script must be run as Administrator.
    echo         Right-click cmd.exe and choose "Run as administrator".
    exit /b 1
)

REM --- Node.js 20 check ------------------------------------------------------
where node >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js is not installed or not in PATH.
    echo         Download Node.js 20.x LTS from:
    echo         https://nodejs.org/dist/latest-v20.x/
    exit /b 1
)

for /f "tokens=*" %%i in ('node -v') do set NODE_VERSION=%%i
echo [INFO] Found Node %NODE_VERSION%
echo %NODE_VERSION% | findstr /b "v20." >nul
if errorlevel 1 (
    echo [WARN] Node version is not v20.x. The BFF is tested against Node 20 LTS.
    echo        Continuing, but unexpected errors may occur.
)

REM --- pnpm check / install --------------------------------------------------
where pnpm >nul 2>&1
if errorlevel 1 (
    echo [INFO] pnpm not found. Installing pnpm@9.0.0 globally via npm...
    call npm install -g pnpm@9.0.0
    if errorlevel 1 (
        echo [ERROR] Failed to install pnpm. Check npm output above.
        exit /b 1
    )
) else (
    for /f "tokens=*" %%i in ('pnpm -v') do echo [INFO] Found pnpm %%i
)

REM --- NSSM check ------------------------------------------------------------
if not exist "%NSSM%" (
    echo [ERROR] nssm.exe not found in %SCRIPT_DIR%
    echo         Download NSSM from https://nssm.cc/download and extract
    echo         the matching architecture (win64) nssm.exe into this folder.
    exit /b 1
)

REM --- .env check ------------------------------------------------------------
if not exist "%ENV_FILE%" (
    echo [ERROR] Environment file missing: %ENV_FILE%
    echo         Copy the template and fill in real values:
    echo         copy "%SCRIPT_DIR%.env.template" "%ENV_FILE%"
    exit /b 1
)

REM --- Resolve full path to node.exe (NSSM needs an absolute path) ----------
for /f "delims=" %%i in ('where node') do (
    set NODE_EXE=%%i
    goto :node_found
)
:node_found
echo [INFO] node.exe: %NODE_EXE%

REM --- Install workspace dependencies ----------------------------------------
pushd "%REPO_ROOT%"
echo.
echo [STEP 1/5] pnpm install (frozen lockfile, no scripts)
call pnpm install --frozen-lockfile --ignore-scripts
if errorlevel 1 (
    echo [ERROR] pnpm install failed.
    popd
    exit /b 1
)

echo.
echo [STEP 2/5] Build shared packages
call pnpm --filter @loyalty/shared-types build
if errorlevel 1 ( echo [ERROR] shared-types build failed. & popd & exit /b 1 )
call pnpm --filter @loyalty/shared-utils build
if errorlevel 1 ( echo [ERROR] shared-utils build failed. & popd & exit /b 1 )

echo.
echo [STEP 3/5] Prisma generate + migrate deploy
call pnpm --filter bff exec prisma generate --schema=prisma/schema.prisma
if errorlevel 1 ( echo [ERROR] prisma generate failed. & popd & exit /b 1 )
call pnpm --filter bff exec prisma migrate deploy --schema=prisma/schema.prisma
if errorlevel 1 (
    echo [ERROR] prisma migrate deploy failed. Check DATABASE_URL in .env
    echo         and confirm the PostgreSQL server is reachable.
    popd
    exit /b 1
)

echo.
echo [STEP 4/5] Build BFF
call pnpm --filter bff build
if errorlevel 1 ( echo [ERROR] BFF build failed. & popd & exit /b 1 )
popd

REM --- Register / re-register Windows service --------------------------------
echo.
echo [STEP 5/5] Register Windows service "%SERVICE_NAME%"
if not exist "%LOG_DIR%" mkdir "%LOG_DIR%"

"%NSSM%" status %SERVICE_NAME% >nul 2>&1
if not errorlevel 1 (
    echo [INFO] Service already exists. Stopping and removing first...
    "%NSSM%" stop %SERVICE_NAME% >nul 2>&1
    "%NSSM%" remove %SERVICE_NAME% confirm >nul 2>&1
)

"%NSSM%" install %SERVICE_NAME% "%NODE_EXE%" "dist\main.js"
"%NSSM%" set %SERVICE_NAME% AppDirectory "%REPO_ROOT%\apps\bff"
"%NSSM%" set %SERVICE_NAME% AppEnvironmentExtra "NODE_ENV=production"
"%NSSM%" set %SERVICE_NAME% Start SERVICE_AUTO_START
"%NSSM%" set %SERVICE_NAME% Description "Loyalty App BFF (NestJS)"
"%NSSM%" set %SERVICE_NAME% AppStdout "%LOG_DIR%\bff-stdout.log"
"%NSSM%" set %SERVICE_NAME% AppStderr "%LOG_DIR%\bff-stderr.log"
"%NSSM%" set %SERVICE_NAME% AppRotateFiles 1
"%NSSM%" set %SERVICE_NAME% AppRotateBytes 10485760

"%NSSM%" start %SERVICE_NAME%
if errorlevel 1 (
    echo [ERROR] Failed to start service. Check %LOG_DIR%\bff-stderr.log
    exit /b 1
)

echo.
echo === Installation complete ===
echo Service "%SERVICE_NAME%" is running.
echo Logs:    %LOG_DIR%
echo Manage:  start.bat / stop.bat / update.bat
echo.
endlocal
exit /b 0
