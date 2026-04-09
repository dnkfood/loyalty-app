@echo off
REM ============================================================================
REM Start the BFF.
REM
REM Default mode (no args): starts the Windows service via NSSM. Use this for
REM normal operation after install.bat has been run.
REM
REM "manual" mode: runs node dist\main.js in the foreground in this console
REM window. Use for debugging — Ctrl+C to stop. The service must NOT be
REM running at the same time (port conflict).
REM
REM Usage:
REM   start.bat              (start the service)
REM   start.bat manual       (run in foreground for debugging)
REM ============================================================================

setlocal
set SCRIPT_DIR=%~dp0
set REPO_ROOT=%SCRIPT_DIR%..\..
set SERVICE_NAME=LoyaltyBff
set NSSM=%SCRIPT_DIR%nssm.exe

if /i "%~1"=="manual" (
    echo [INFO] Starting BFF in foreground mode. Press Ctrl+C to stop.
    pushd "%REPO_ROOT%\apps\bff"
    node dist\main.js
    popd
    endlocal
    exit /b %ERRORLEVEL%
)

if not exist "%NSSM%" (
    echo [ERROR] nssm.exe not found in %SCRIPT_DIR%
    echo         Run install.bat first, or use: start.bat manual
    exit /b 1
)

"%NSSM%" start %SERVICE_NAME%
if errorlevel 1 (
    echo [ERROR] Failed to start service "%SERVICE_NAME%".
    echo         Check that install.bat has been run successfully.
    exit /b 1
)
echo [OK] Service "%SERVICE_NAME%" started.
endlocal
exit /b 0
