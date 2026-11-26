# Run the existing IA Next Local build directly on Windows.
[CmdletBinding()]
param(
    [ValidateSet('Start', 'Status', 'Stop')][string]$Action = 'Start',
    [ValidateRange(1024,65535)][int]$Port = 9461,
    [string]$Runtime = 'D:\IA-Next-Runtimes\ia-next-native',
    [string]$DataDir,
    [string]$HicRuntime,
    [switch]$UseHiC
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
if (-not $DataDir) { $DataDir = Join-Path $Runtime 'data' }
$python = Join-Path $Runtime 'venv\Scripts\python.exe'
$pidFile = Join-Path $Runtime "app-$Port.pid"
$base = "http://127.0.0.1:$Port"

function Get-NativeProcess {
    if (-not (Test-Path -LiteralPath $pidFile)) { return }
    $serverId = Get-Content -LiteralPath $pidFile -ErrorAction Stop
    $listener = Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue |
        Where-Object LocalAddress -eq '127.0.0.1' | Select-Object -First 1
    if (-not $listener) { return }
    $owner = Get-CimInstance Win32_Process -Filter "ProcessId = $($listener.OwningProcess)"
    if ($owner -and ($owner.ProcessId -eq [int]$serverId -or $owner.ParentProcessId -eq [int]$serverId) -and
        $owner.CommandLine -match " -m uvicorn ia_next\.app:app --host 127\.0\.0\.1 --port $Port$") {
        $owner
    }
}

function Get-NativeHealth {
    try { Invoke-RestMethod "$base/health" -TimeoutSec 2 } catch { $null }
}

if ($Action -eq 'Status') {
    $health = Get-NativeHealth
    if (-not $health -or -not (Get-NativeProcess)) { throw "Native IA Next is unavailable at $base." }
    $health
    return
}

if ($Action -eq 'Stop') {
    $process = Get-NativeProcess
    if (-not $process) { return }
    $tasks = Invoke-RestMethod "$base/api/tasks" -TimeoutSec 3
    if (@($tasks.tasks | Where-Object { $_.status -in @('queued','running','stopping') }).Count) {
        throw 'IA Next has active tasks. Stop them from the workspace or let them finish first.'
    }
    Stop-Process -Id $process.ProcessId
    Remove-Item -LiteralPath $pidFile
    return
}

if ((Get-NativeProcess) -and (Get-NativeHealth)) {
    Write-Output $base
    return
}
if (Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue) {
    throw "Port $Port is already in use."
}
if (-not (Test-Path -LiteralPath $python -PathType Leaf)) {
    throw "Create the Python environment at $Runtime\venv and install requirements.txt first."
}
$null = Invoke-RestMethod 'http://127.0.0.1:11434/api/tags' -TimeoutSec 5
$null = New-Item -ItemType Directory -Force -Path $Runtime
$env:IA_NEXT_PORT = [string]$Port
$env:IA_NEXT_DATA = [IO.Path]::GetFullPath($DataDir)
$env:IA_NEXT_OLLAMA_URL = 'http://127.0.0.1:11434'
$env:IA_NEXT_SEARCH_URL = 'http://127.0.0.1:8891'
$env:IA_NEXT_RENDER_URL = 'http://127.0.0.1:9501'
$env:IA_NEXT_COMFY_URL = 'http://127.0.0.1:8189'
$env:IA_NEXT_SOCIAL_RESEARCH_URL = 'http://127.0.0.1:9'
$env:IA_NEXT_HIC_URL = 'http://127.0.0.1:9'
if ($UseHiC) {
    if (-not $HicRuntime) {
        $HicRuntime = 'D:\NXT-HUMANS_AI_CX_WORKBENCH\humans-in-control-research\hic-workspace\.runtime\config.json'
    }
    $env:IA_NEXT_HIC_URL = 'http://127.0.0.1:5012'
    $env:IA_NEXT_HIC_RUNTIME = $HicRuntime
}
$env:IA_NEXT_SPEECH_DIR = 'D:\ia-next-local-models'
$env:HF_HUB_OFFLINE = '1'
$env:PYTHONDONTWRITEBYTECODE = '1'
$env:PYTHONUNBUFFERED = '1'

$log = Join-Path $Runtime "app-$Port"
$server = Start-Process -FilePath $python -ArgumentList @('-m','uvicorn','ia_next.app:app','--host','127.0.0.1','--port',$Port) `
    -WorkingDirectory $root -WindowStyle Hidden -RedirectStandardOutput "$log.log" -RedirectStandardError "$log.err" -PassThru
Set-Content -LiteralPath $pidFile -Value $server.Id -Encoding ascii
for ($i = 0; $i -lt 30; $i++) {
    if (Get-NativeHealth) { Write-Output $base; return }
    if ($server.HasExited) { break }
    Start-Sleep -Seconds 1
}
throw "IA Next did not answer at $base. See $log.err."
