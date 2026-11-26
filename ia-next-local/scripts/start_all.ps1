# Start everything IA Next Local needs, in order, and say what is up. Safe to run again: each part is started only
# when it is not already answering. Nothing here touches a key, another project's files, or IA Next on port 9400.
#
#   1. Ollama (the language models). After a reboot it does not start by itself.
#   2. The picture and video engine on port 8189, in its own window, under its memory watchdog
#      (scripts\start_image_engine.ps1).
#   3. The app, the page renderer and the search service (docker compose), on http://127.0.0.1:9460
#
# It needs Docker Desktop running. HiC's research proxy (port 5012, from the main workbench's compose file) is used
# for data packs, the second brain and the PowerPoint exporter; this script reports whether it answers and does not
# start it, because it belongs to the main project.
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$root = Split-Path -Parent $here

function Test-Url($url) {
    try { return (Invoke-WebRequest $url -UseBasicParsing -TimeoutSec 4).StatusCode -eq 200 } catch { return $false }
}

function Wait-Url($url, $seconds) {
    $until = (Get-Date).AddSeconds($seconds)
    while ((Get-Date) -lt $until) { if (Test-Url $url) { return $true }; Start-Sleep -Seconds 2 }
    return $false
}

# 1. Ollama
if (-not (Test-Url 'http://127.0.0.1:11434/api/tags')) {
    $app = Join-Path $env:LOCALAPPDATA 'Programs\Ollama\ollama app.exe'
    if (Test-Path $app) { Start-Process $app } else { Write-Output 'Ollama is not installed where expected; start it by hand.' }
}
$ollama = Wait-Url 'http://127.0.0.1:11434/api/tags' 60

# 2. the picture and video engine, in its own window so it outlives this script
if (-not (Test-Url 'http://127.0.0.1:8189/system_stats')) {
    Start-Process powershell -ArgumentList @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', (Join-Path $here 'start_image_engine.ps1')) -WindowStyle Minimized
}
$engine = Wait-Url 'http://127.0.0.1:8189/system_stats' 120

# 3. the app
$envFile = 'D:/NXT-HUMANS_AI_CX_WORKBENCH/.env'      # read by compose only for the two free Reddit application names
Push-Location $root
docker compose -f ia-next-local.compose.yml --env-file $envFile up -d | Out-Null
Pop-Location
$appUp = Wait-Url 'http://127.0.0.1:9460/health' 90
$hic = Test-Url 'http://127.0.0.1:5012/health'

$word = { param($ok) if ($ok) { 'up' } else { 'NOT ANSWERING' } }
Write-Output ("Language models (Ollama, 11434):      " + (& $word $ollama))
Write-Output ("Pictures and video (ComfyUI, 8189):   " + (& $word $engine))
Write-Output ("IA Next Local (9460):                 " + (& $word $appUp))
Write-Output ("HiC research proxy (5012, main suite): " + (& $word $hic) + $(if (-not $hic) { '  - data packs, the second brain and PowerPoint export need it' } else { '' }))
if ($appUp) { Write-Output 'Open http://127.0.0.1:9460' }
