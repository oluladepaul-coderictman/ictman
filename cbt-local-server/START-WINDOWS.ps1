# CBT Bulldozer Local Server — Windows PowerShell Launcher
# Run this script in PowerShell to start your local server
# Keep this window OPEN — closing it will stop the server

Write-Host ""
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host "   CBT BULLDOZER — Local Server Launcher   " -ForegroundColor Cyan
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host ""

# Check if Node.js is installed
if (-not (Get-Command "node" -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] Node.js is not installed!" -ForegroundColor Red
    Write-Host "Download from: https://nodejs.org (choose LTS version)" -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

$nodeVersion = node --version
Write-Host "[OK] Node.js found: $nodeVersion" -ForegroundColor Green

# Get this script's directory
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# Install dependencies if needed
if (-not (Test-Path "$scriptDir\node_modules")) {
    Write-Host ""
    Write-Host "[SETUP] Installing dependencies (one time only)..." -ForegroundColor Yellow
    Set-Location $scriptDir
    npm install
    Write-Host "[OK] Dependencies installed!" -ForegroundColor Green
}

# Get local IP
$localIp = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notlike "*Loopback*" -and $_.PrefixOrigin -ne "WellKnown" } | Select-Object -First 1).IPAddress

# Load .env if present
$envFile = "$scriptDir\.env"
$port = "3001"
if (Test-Path $envFile) {
    $envContent = Get-Content $envFile | Where-Object { $_ -match "^PORT=" }
    if ($envContent) { $port = $envContent -replace "PORT=", "" }
}

Write-Host ""
Write-Host "===========================================" -ForegroundColor Green
Write-Host "   SERVER STARTING..." -ForegroundColor Green  
Write-Host "===========================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Local URL:    http://localhost:$port" -ForegroundColor White
Write-Host "  Network URL:  http://${localIp}:$port" -ForegroundColor Cyan
Write-Host ""
Write-Host "  On your phone APK, enter:" -ForegroundColor Yellow
Write-Host "  http://${localIp}:$port" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Keep this window OPEN to keep server running!" -ForegroundColor Red
Write-Host "  Press Ctrl+C to stop the server." -ForegroundColor Gray
Write-Host "===========================================" -ForegroundColor Green
Write-Host ""

# Start server
Set-Location $scriptDir
node server.js
