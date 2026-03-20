#!/usr/bin/env pwsh
# PowerShell script to start NXT Humans platform with proper error handling

Write-Host "NXT HUMANS INTELLIGENCE AUGMENTATION SUITE" -ForegroundColor Blue
Write-Host "==========================================" -ForegroundColor Blue

# Function to check if Docker Desktop is running
function Test-DockerRunning {
    try {
        docker info 2>&1 | Out-Null
        return $?
    }
    catch {
        return $false
    }
}

# Check if Docker Desktop is running
Write-Host "`nChecking Docker Desktop status..." -ForegroundColor Yellow
if (-not (Test-DockerRunning)) {
    Write-Host "Docker Desktop is not running!" -ForegroundColor Red
    Write-Host "Starting Docker Desktop..." -ForegroundColor Yellow
    
    # Try to start Docker Desktop
    $dockerPath = "C:\Program Files\Docker\Docker\Docker Desktop.exe"
    if (Test-Path $dockerPath) {
        Start-Process -FilePath $dockerPath
        Write-Host "Waiting for Docker Desktop to initialize (this may take 30-60 seconds)..." -ForegroundColor Yellow
        
        # Wait for Docker to be ready
        $maxAttempts = 30
        $attempt = 0
        while ((-not (Test-DockerRunning)) -and ($attempt -lt $maxAttempts)) {
            Start-Sleep -Seconds 2
            $attempt++
            Write-Host "." -NoNewline
        }
        Write-Host ""
        
        if (Test-DockerRunning) {
            Write-Host "Docker Desktop is now running!" -ForegroundColor Green
        }
        else {
            Write-Host "Docker Desktop failed to start. Please start it manually and run this script again." -ForegroundColor Red
            exit 1
        }
    }
    else {
        Write-Host "Docker Desktop not found at expected location." -ForegroundColor Red
        Write-Host "Please install Docker Desktop from: https://www.docker.com/products/docker-desktop" -ForegroundColor Yellow
        exit 1
    }
}
else {
    Write-Host "Docker Desktop is running." -ForegroundColor Green
}

# Check if .env file exists
if (-not (Test-Path ".env")) {
    Write-Host "`.env file not found!" -ForegroundColor Red
    if (Test-Path ".env.example") {
        Write-Host "Copying .env.example to .env..." -ForegroundColor Yellow
        Copy-Item ".env.example" ".env"
        Write-Host "Please edit .env file with your API keys before continuing." -ForegroundColor Yellow
        exit 1
    }
    else {
        Write-Host "No .env.example file found. Please create .env file with required API keys." -ForegroundColor Red
        exit 1
    }
}

# Load environment variables from .env file
Write-Host "`nLoading environment variables..." -ForegroundColor Yellow
Get-Content .env | ForEach-Object {
    if ($_ -match '^([^#][^=]+)=(.*)$') {
        $name = $matches[1].Trim()
        $value = $matches[2].Trim()
        [System.Environment]::SetEnvironmentVariable($name, $value, 'Process')
    }
}

# Check for required API keys
$requiredKeys = @("ANTHROPIC_API_KEY", "OPENAI_API_KEY")
$missingKeys = @()

foreach ($key in $requiredKeys) {
    if ([string]::IsNullOrEmpty([System.Environment]::GetEnvironmentVariable($key))) {
        $missingKeys += $key
    }
}

if ($missingKeys.Count -gt 0) {
    Write-Host "Missing required API keys in .env file:" -ForegroundColor Red
    $missingKeys | ForEach-Object { Write-Host "  - $_" -ForegroundColor Red }
    Write-Host "Please add these keys to your .env file and run the script again." -ForegroundColor Yellow
    exit 1
}

Write-Host "API keys loaded successfully." -ForegroundColor Green

# Check and fix port conflicts
Write-Host "`nChecking for port conflicts..." -ForegroundColor Yellow
if (Test-Path "port_scanner.py") {
    python port_scanner.py --fix 2>&1 | Out-Null
    if ($?) {
        Write-Host "Port conflicts resolved." -ForegroundColor Green
    }
}

# Pull latest images (optional)
Write-Host "`nPulling latest Docker images..." -ForegroundColor Yellow
docker compose -f docker-compose-all.yml pull 2>&1 | Out-Null

# Start the services
Write-Host "`nStarting all services..." -ForegroundColor Yellow
Write-Host "Using docker-compose-all.yml" -ForegroundColor Cyan

try {
    docker compose -f docker-compose-all.yml up -d
    if ($?) {
        Write-Host "`nAll services started successfully!" -ForegroundColor Green
        Write-Host "`nService URLs:" -ForegroundColor Blue
        Write-Host "  Main Platform:     http://localhost:8000" -ForegroundColor Cyan
        Write-Host "  AI Agent:          http://localhost:8500" -ForegroundColor Cyan
        Write-Host "  Social Research:   http://localhost:3000" -ForegroundColor Cyan
        Write-Host "  Journey Mapper:    http://localhost:8080" -ForegroundColor Cyan
        Write-Host "  Video Analyzer:    http://localhost:5002" -ForegroundColor Cyan
        Write-Host "`nTo view logs: docker compose -f docker-compose-all.yml logs -f [service-name]" -ForegroundColor Gray
        Write-Host "To stop all:  docker compose -f docker-compose-all.yml down" -ForegroundColor Gray
    }
    else {
        Write-Host "Failed to start services. Check the error messages above." -ForegroundColor Red
        exit 1
    }
}
catch {
    Write-Host "Error starting services: $_" -ForegroundColor Red
    exit 1
}