@echo off
REM ============================================================================
REM Update the BFF to the latest commit on the current branch.
REM
REM Steps:
REM   1. Stop the service
REM   2. git pull
REM   3. pnpm install (frozen lockfile)
REM   4. Rebuild shared packages and BFF
REM   5. Run any new prisma migrations
REM   6. Start the service
REM
REM Run from an Administrator cmd.exe.
REM ============================================================================

setlocal enabledelayedexpansion

set SCRIPT_DIR=%~dp0
set REPO_ROOT=%SCRIPT_DIR%..\..
set SERVICE_NAME=LoyaltyBff
set NSSM=%SCRIPT_DIR%nssm.exe

REM --- Admin check -----------------------------------------------------------
net session >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Run as Administrator.
    exit /b 1
)

if not exist "%NSSM%" (
    echo [ERROR] nssm.exe not found. Run install.bat first.
    exit /b 1
)

echo === Updating Loyalty BFF ===

echo.
echo [1/6] Stopping service...
"%NSSM%" stop %SERVICE_NAME% >nul 2>&1

pushd "%REPO_ROOT%"

echo.
echo [2/6] git pull
call git pull --ff-only
if errorlevel 1 (
    echo [ERROR] git pull failed. Resolve conflicts manually.
    popd
    exit /b 1
)

echo.
echo [3/6] pnpm install
call pnpm install --frozen-lockfile --ignore-scripts
if errorlevel 1 ( echo [ERROR] pnpm install failed. & popd & exit /b 1 )

echo.
echo [4/6] Rebuild shared packages + Admin + BFF
call pnpm --filter @loyalty/shared-types build
if errorlevel 1 ( echo [ERROR] shared-types build failed. & popd & exit /b 1 )
call pnpm --filter @loyalty/shared-utils build
if errorlevel 1 ( echo [ERROR] shared-utils build failed. & popd & exit /b 1 )
call pnpm --filter admin build
if errorlevel 1 ( echo [ERROR] admin build failed. & popd & exit /b 1 )
call pnpm --filter bff exec prisma generate --schema=prisma/schema.prisma
if errorlevel 1 ( echo [ERROR] prisma generate failed. & popd & exit /b 1 )
call pnpm --filter bff build
if errorlevel 1 ( echo [ERROR] BFF build failed. & popd & exit /b 1 )

echo.
echo [5/6] prisma migrate deploy
call pnpm --filter bff exec prisma migrate deploy --schema=prisma/schema.prisma
if errorlevel 1 (
    echo [ERROR] prisma migrate deploy failed. Service NOT restarted.
    popd
    exit /b 1
)

popd

echo.
echo [6/6] Starting service...
"%NSSM%" start %SERVICE_NAME%
if errorlevel 1 (
    echo [ERROR] Failed to start service. Check logs/bff-stderr.log
    exit /b 1
)

echo.
echo === Update complete ===
endlocal
exit /b 0
