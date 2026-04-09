@echo off
REM ============================================================================
REM Stop the LoyaltyBff Windows service.
REM ============================================================================

setlocal
set SCRIPT_DIR=%~dp0
set SERVICE_NAME=LoyaltyBff
set NSSM=%SCRIPT_DIR%nssm.exe

if not exist "%NSSM%" (
    echo [ERROR] nssm.exe not found in %SCRIPT_DIR%
    exit /b 1
)

"%NSSM%" stop %SERVICE_NAME%
if errorlevel 1 (
    echo [WARN] nssm stop returned non-zero. The service may already be stopped.
    exit /b 0
)
echo [OK] Service "%SERVICE_NAME%" stopped.
endlocal
exit /b 0
