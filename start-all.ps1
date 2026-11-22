# ═══════════════════════════════════════════════════════════════════
#  FOLIA — AI Plant Disease Detection System
#  One-Click Windows Launcher (start-all.ps1)
#  Launches: Flask AI Engine (:5001) + Node API Gateway (:5000) + Vite (:5173)
# ═══════════════════════════════════════════════════════════════════

$ErrorActionPreference = "Continue"
$ROOT = $PSScriptRoot
if (-not $ROOT) { $ROOT = "D:\PlantDetection" }

Write-Host ""
Write-Host "  ╔══════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "  ║   🌿 FOLIA — AI Plant Disease Detection     ║" -ForegroundColor Green
Write-Host "  ║   Starting all services...                   ║" -ForegroundColor Green
Write-Host "  ╚══════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""

# ── 1. Python AI Engine Setup ──
Write-Host "[1/6] Setting up Python AI Engine..." -ForegroundColor Cyan
$aiDir = Join-Path $ROOT "ai-engine-python"

if (-not (Test-Path (Join-Path $aiDir "venv"))) {
    Write-Host "  → Creating Python virtual environment..." -ForegroundColor Yellow
    Push-Location $aiDir
    python -m venv venv
    Pop-Location
}

Write-Host "  → Installing Python dependencies..." -ForegroundColor Yellow
& "$aiDir\venv\Scripts\pip.exe" install -r "$aiDir\requirements.txt" --quiet 2>&1 | Out-Null

# ── 2. Node.js Backend Setup ──
Write-Host "[2/6] Setting up Node.js API Gateway..." -ForegroundColor Cyan
$nodeDir = Join-Path $ROOT "backend-node"

if (-not (Test-Path (Join-Path $nodeDir "node_modules"))) {
    Write-Host "  → Running npm install..." -ForegroundColor Yellow
    Push-Location $nodeDir
    npm install --silent 2>&1 | Out-Null
    Pop-Location
}

# ── 3. Frontend Setup ──
Write-Host "[3/6] Setting up React frontend..." -ForegroundColor Cyan
$frontDir = Join-Path $ROOT "frontend"

if (-not (Test-Path (Join-Path $frontDir "node_modules"))) {
    Write-Host "  → Running npm install..." -ForegroundColor Yellow
    Push-Location $frontDir
    npm install --silent 2>&1 | Out-Null
    Pop-Location
}

# ── 4. Launch Flask AI Engine on :5001 ──
Write-Host "[4/6] Starting Flask AI Engine on port 5001..." -ForegroundColor Cyan
$flaskJob = Start-Job -Name "Folia-Flask" -ScriptBlock {
    param($dir)
    Set-Location $dir
    $env:PATH = "$dir\venv\Scripts;$env:PATH"
    & "$dir\venv\Scripts\python.exe" app.py 2>&1
} -ArgumentList $aiDir

# ── 5. Launch Node API Gateway on :5000 ──
Write-Host "[5/6] Starting Node API Gateway on port 5000..." -ForegroundColor Cyan
$nodeJob = Start-Job -Name "Folia-Node" -ScriptBlock {
    param($dir)
    Set-Location $dir
    node server.js 2>&1
} -ArgumentList $nodeDir

# ── 6. Launch Vite Dev Server on :5173 ──
Write-Host "[6/6] Starting Vite dev server on port 5173..." -ForegroundColor Cyan
$viteJob = Start-Job -Name "Folia-Vite" -ScriptBlock {
    param($dir)
    Set-Location $dir
    npx vite --host 2>&1
} -ArgumentList $frontDir

# ── Wait for services to start ──
Write-Host ""
Write-Host "  Waiting for services to initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds 8

# ── Status Table ──
Write-Host ""
Write-Host "  ┌─────────────────────┬──────────────────────────────────┬──────────┐" -ForegroundColor White
Write-Host "  │ Service             │ URL                              │ Status   │" -ForegroundColor White
Write-Host "  ├─────────────────────┼──────────────────────────────────┼──────────┤" -ForegroundColor White

# Check Flask
$flaskOk = $false
try {
    $r = Invoke-WebRequest -Uri "http://localhost:5001/health" -TimeoutSec 3 -UseBasicParsing -ErrorAction Stop
    if ($r.StatusCode -eq 200) { $flaskOk = $true }
} catch {}
$flaskStatus = if ($flaskOk) { "  ✅ UP   " } else { "  ⏳ WAIT " }
Write-Host "  │ Flask AI Engine     │ http://localhost:5001/predict     │$flaskStatus│" -ForegroundColor $(if ($flaskOk) {"Green"} else {"Yellow"})

# Check Node
$nodeOk = $false
try {
    $r = Invoke-WebRequest -Uri "http://localhost:5000/health" -TimeoutSec 3 -UseBasicParsing -ErrorAction Stop
    if ($r.StatusCode -eq 200) { $nodeOk = $true }
} catch {}
$nodeStatus = if ($nodeOk) { "  ✅ UP   " } else { "  ⏳ WAIT " }
Write-Host "  │ Node API Gateway    │ http://localhost:5000/api/diagnose│$nodeStatus│" -ForegroundColor $(if ($nodeOk) {"Green"} else {"Yellow"})

# Check Vite
$viteOk = $false
try {
    $r = Invoke-WebRequest -Uri "http://localhost:5173" -TimeoutSec 3 -UseBasicParsing -ErrorAction Stop
    if ($r.StatusCode -eq 200) { $viteOk = $true }
} catch {}
$viteStatus = if ($viteOk) { "  ✅ UP   " } else { "  ⏳ WAIT " }
Write-Host "  │ Vite Frontend       │ http://localhost:5173             │$viteStatus│" -ForegroundColor $(if ($viteOk) {"Green"} else {"Yellow"})

Write-Host "  └─────────────────────┴──────────────────────────────────┴──────────┘" -ForegroundColor White
Write-Host ""

if ($flaskOk -and $nodeOk -and $viteOk) {
    Write-Host "  🌿 All services are running! Open http://localhost:5173" -ForegroundColor Green
} else {
    Write-Host "  ⏳ Some services are still starting. Wait a few seconds and check the URLs above." -ForegroundColor Yellow
    Write-Host "     If Flask is slow, PyTorch is loading (~30s on first run)." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "  Press Ctrl+C to stop all services." -ForegroundColor DarkGray
Write-Host ""

# ── Keep alive and show logs ──
try {
    while ($true) {
        # Show job output
        Receive-Job -Job $flaskJob, $nodeJob, $viteJob -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 2
    }
} finally {
    Write-Host ""
    Write-Host "  Stopping all Folia services..." -ForegroundColor Yellow
    Stop-Job -Job $flaskJob, $nodeJob, $viteJob -ErrorAction SilentlyContinue
    Remove-Job -Job $flaskJob, $nodeJob, $viteJob -Force -ErrorAction SilentlyContinue
    Write-Host "  All services stopped. 🌿" -ForegroundColor Green
}
