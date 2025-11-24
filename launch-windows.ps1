# NXT HUMANS WORKBENCH LAUNCHER FOR WINDOWS (PowerShell)
# Run with: powershell -ExecutionPolicy Bypass -File launch-windows.ps1

Write-Host ""
Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host "NXT HUMANS INTELLIGENCE AUGMENTATION SUITE - WINDOWS LAUNCHER" -ForegroundColor Cyan
Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host ""

# Function to check if port is in use
function Test-Port {
    param($Port)
    $connection = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
    return $connection -ne $null
}

# Function to kill process on port
function Stop-PortProcess {
    param($Port)
    $connection = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
    if ($connection) {
        $processId = $connection.OwningProcess | Select-Object -Unique
        foreach ($pid in $processId) {
            if ($pid -ne 0 -and $pid -ne 4) {  # Don't kill System processes
                try {
                    Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
                    Write-Host "[INFO] Freed port $Port (PID: $pid)" -ForegroundColor Yellow
                } catch {
                    Write-Host "[WARNING] Could not kill process on port $Port" -ForegroundColor Yellow
                }
            }
        }
    }
}

# Check if Docker is running
try {
    docker info | Out-Null
    Write-Host "[OK] Docker is running." -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Docker is not running. Please start Docker Desktop first." -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# Check for .env file
if (!(Test-Path ".env")) {
    Write-Host "[ERROR] No .env file found! Please create one with your API keys." -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host "[OK] .env file found." -ForegroundColor Green

# Load environment variables from .env file
Write-Host "[INFO] Loading environment variables..." -ForegroundColor Yellow
Get-Content .env | ForEach-Object {
    if ($_ -match "^([^=#]+)=(.*)$") {
        $name = $matches[1].Trim()
        $value = $matches[2].Trim()
        [Environment]::SetEnvironmentVariable($name, $value, "Process")
    }
}

# Verify API keys
if (![Environment]::GetEnvironmentVariable("ANTHROPIC_API_KEY", "Process")) {
    Write-Host "[ERROR] ANTHROPIC_API_KEY is not set in .env file!" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}
if (![Environment]::GetEnvironmentVariable("OPENAI_API_KEY", "Process")) {
    Write-Host "[ERROR] OPENAI_API_KEY is not set in .env file!" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host "[OK] API keys loaded." -ForegroundColor Green

# Kill processes on common ports
Write-Host "[INFO] Checking for port conflicts..." -ForegroundColor Yellow
$ports = @(3000, 5001, 5002, 5003, 8000, 8080, 8081, 8095, 8500, 8501, 8502, 8503, 8504, 8506)
foreach ($port in $ports) {
    if (Test-Port $port) {
        Write-Host "[WARNING] Port $port is in use. Attempting to free it..." -ForegroundColor Yellow
        Stop-PortProcess $port
    }
}
Write-Host "[OK] Ports checked." -ForegroundColor Green

# Stop any existing containers
Write-Host "[INFO] Stopping existing containers..." -ForegroundColor Yellow
docker compose -f docker-compose-all.yml down 2>$null | Out-Null
docker container prune -f 2>$null | Out-Null
Write-Host "[OK] Existing containers stopped." -ForegroundColor Green

# Rebuild Social Research frontend with dependencies
Write-Host "[INFO] Building Social Research frontend with fresh dependencies..." -ForegroundColor Yellow
Write-Host "      This may take 60-90 seconds on first run..." -ForegroundColor Yellow
$buildResult = docker compose -f docker-compose-all.yml build --no-cache social-research-frontend 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "[WARNING] Frontend build had issues but continuing..." -ForegroundColor Yellow
}

# Start all services
Write-Host "[INFO] Starting all services..." -ForegroundColor Yellow
docker compose -f docker-compose-all.yml up -d
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Failed to start services. Check Docker logs for details." -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# Wait for services to initialize
Write-Host "[INFO] Waiting for services to initialize (30 seconds)..." -ForegroundColor Yellow
Start-Sleep -Seconds 30

# Function to check service health
function Test-Service {
    param($Url, $Name)
    try {
        $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 2 -ErrorAction SilentlyContinue
        if ($response.StatusCode -eq 200) {
            Write-Host "[OK]   ${Name}: $Url" -ForegroundColor Green
            return $true
        }
    } catch {}
    Write-Host "[WAIT] ${Name}: Starting..." -ForegroundColor Yellow
    return $false
}

# Check service health
Write-Host ""
Write-Host "[INFO] Checking service health..." -ForegroundColor Yellow
Write-Host ""

Test-Service "http://localhost:8000" "Launchpad Hub          " | Out-Null
Test-Service "http://localhost:3000" "Social Research        " | Out-Null
Test-Service "http://localhost:8080" "Journey Mapper         " | Out-Null
Test-Service "http://localhost:5001" "Reddit Ripper          " | Out-Null
Test-Service "http://localhost:5002" "Video Analyzer         " | Out-Null

# Display summary
Write-Host ""
Write-Host "================================================================================" -ForegroundColor Green
Write-Host "ALL SERVICES HAVE BEEN STARTED!" -ForegroundColor Green
Write-Host "================================================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Primary URLs:" -ForegroundColor Cyan
Write-Host "  Launchpad Hub:              http://localhost:8000" -ForegroundColor White
Write-Host "  Social Research Analytics:  http://localhost:3000" -ForegroundColor White
Write-Host "  Journey Mapper (Claude 3.7): http://localhost:8080" -ForegroundColor White
Write-Host "  Journey Mapper (Claude 4):  http://localhost:8095" -ForegroundColor White
Write-Host "  Reddit Data Collector:      http://localhost:5001" -ForegroundColor White
Write-Host "  Video Analyzer:             http://localhost:5002" -ForegroundColor White
Write-Host "  LinkedIn Generator:         http://localhost:5003" -ForegroundColor White
Write-Host ""
Write-Host "To monitor logs:" -ForegroundColor Yellow
Write-Host "  docker compose -f docker-compose-all.yml logs -f [service-name]" -ForegroundColor White
Write-Host ""
Write-Host "To check Social Research frontend specifically:" -ForegroundColor Yellow
Write-Host "  docker logs social-research-frontend" -ForegroundColor White
Write-Host ""
Write-Host "To stop all services:" -ForegroundColor Yellow
Write-Host "  docker compose -f docker-compose-all.yml down" -ForegroundColor White
Write-Host ""
Write-Host "NOTE: Social Research may take 60-90 seconds to fully start on first run." -ForegroundColor Yellow
Write-Host "      If it doesn't load, wait a moment and refresh the page." -ForegroundColor Yellow
Write-Host ""
Read-Host "Press Enter to exit"