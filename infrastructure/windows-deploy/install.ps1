# =============================================================================
# Loyalty BFF — PowerShell installer for Windows Server 2016+
#
# Run from an elevated PowerShell prompt:
#   Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
#   .\install.ps1
#
# Equivalent to install.bat but with cleaner error handling and output.
# Same prerequisites: Node 20.x, Git, PostgreSQL, Redis/Memurai, nssm.exe.
# =============================================================================

#Requires -RunAsAdministrator
$ErrorActionPreference = 'Stop'

$ScriptDir   = $PSScriptRoot
$RepoRoot    = (Resolve-Path (Join-Path $ScriptDir '..\..')).Path
$ServiceName = 'LoyaltyBff'
$Nssm        = Join-Path $ScriptDir 'nssm.exe'
$EnvFile     = Join-Path $RepoRoot 'apps\bff\.env'
$LogDir      = Join-Path $ScriptDir 'logs'

function Write-Step($n, $total, $msg) {
    Write-Host ""
    Write-Host "[$n/$total] $msg" -ForegroundColor Cyan
}

function Fail($msg) {
    Write-Host "[ERROR] $msg" -ForegroundColor Red
    exit 1
}

function Run($cmd, $argList) {
    $p = Start-Process -FilePath $cmd -ArgumentList $argList `
        -NoNewWindow -Wait -PassThru
    if ($p.ExitCode -ne 0) {
        Fail "$cmd $($argList -join ' ') exited with code $($p.ExitCode)"
    }
}

Write-Host "=== Loyalty BFF installer (PowerShell) ===" -ForegroundColor Green
Write-Host "Repo root:    $RepoRoot"
Write-Host "Service name: $ServiceName"

# --- Node.js 20 check --------------------------------------------------------
$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) {
    Fail "Node.js not in PATH. Install Node 20.x LTS from https://nodejs.org/dist/latest-v20.x/"
}
$nodeVersion = & node -v
Write-Host "[INFO] Found Node $nodeVersion"
if ($nodeVersion -notmatch '^v20\.') {
    Write-Host "[WARN] Node version is not v20.x. Tested against Node 20 LTS only." -ForegroundColor Yellow
}

# --- pnpm check / install ----------------------------------------------------
$pnpm = Get-Command pnpm -ErrorAction SilentlyContinue
if (-not $pnpm) {
    Write-Host "[INFO] Installing pnpm@9.0.0 globally..."
    Run 'npm' @('install', '-g', 'pnpm@9.0.0')
} else {
    $pnpmVersion = & pnpm -v
    Write-Host "[INFO] Found pnpm $pnpmVersion"
}

# --- NSSM check --------------------------------------------------------------
if (-not (Test-Path $Nssm)) {
    Fail "nssm.exe not found in $ScriptDir`n         Download from https://nssm.cc/download (win64) and place nssm.exe here."
}

# --- .env check --------------------------------------------------------------
if (-not (Test-Path $EnvFile)) {
    Fail "Environment file missing: $EnvFile`n         Copy: copy `"$ScriptDir\.env.template`" `"$EnvFile`""
}

$NodeExe = (Get-Command node).Source
Write-Host "[INFO] node.exe: $NodeExe"

# --- Build pipeline ----------------------------------------------------------
Push-Location $RepoRoot
try {
    Write-Step 1 5 'pnpm install (frozen lockfile, no scripts)'
    Run 'pnpm' @('install', '--frozen-lockfile', '--ignore-scripts')

    Write-Step 2 5 'Build shared packages'
    Run 'pnpm' @('--filter', '@loyalty/shared-types', 'build')
    Run 'pnpm' @('--filter', '@loyalty/shared-utils', 'build')

    Write-Step 3 5 'Prisma generate + migrate deploy'
    Run 'pnpm' @('--filter', 'bff', 'exec', 'prisma', 'generate', '--schema=prisma/schema.prisma')
    Run 'pnpm' @('--filter', 'bff', 'exec', 'prisma', 'migrate', 'deploy', '--schema=prisma/schema.prisma')

    Write-Step 4 5 'Build BFF'
    Run 'pnpm' @('--filter', 'bff', 'build')
} finally {
    Pop-Location
}

# --- Service registration ----------------------------------------------------
Write-Step 5 5 "Register Windows service '$ServiceName'"
if (-not (Test-Path $LogDir)) { New-Item -ItemType Directory -Path $LogDir | Out-Null }

# Tear down any existing service first.
& $Nssm status $ServiceName 2>$null | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host "[INFO] Service exists; stopping and removing..."
    & $Nssm stop $ServiceName 2>$null | Out-Null
    & $Nssm remove $ServiceName confirm 2>$null | Out-Null
}

$AppDir     = Join-Path $RepoRoot 'apps\bff'
$StdoutLog  = Join-Path $LogDir 'bff-stdout.log'
$StderrLog  = Join-Path $LogDir 'bff-stderr.log'

& $Nssm install $ServiceName $NodeExe 'dist\main.js'
& $Nssm set $ServiceName AppDirectory $AppDir
& $Nssm set $ServiceName AppEnvironmentExtra 'NODE_ENV=production'
& $Nssm set $ServiceName Start SERVICE_AUTO_START
& $Nssm set $ServiceName Description 'Loyalty App BFF (NestJS)'
& $Nssm set $ServiceName AppStdout $StdoutLog
& $Nssm set $ServiceName AppStderr $StderrLog
& $Nssm set $ServiceName AppRotateFiles 1
& $Nssm set $ServiceName AppRotateBytes 10485760

& $Nssm start $ServiceName
if ($LASTEXITCODE -ne 0) {
    Fail "Failed to start service. Check $StderrLog"
}

Write-Host ""
Write-Host "=== Installation complete ===" -ForegroundColor Green
Write-Host "Service '$ServiceName' is running."
Write-Host "Logs:    $LogDir"
Write-Host "Manage:  start.bat / stop.bat / update.bat"
