# Stand-in test: does the Windows per-app graphics preference move a Chromium app that requests the fast card
# onto the integrated card? Uses the private Playwright chrome.exe only; the registry value is removed at the end.
$exe = Join-Path $env:LOCALAPPDATA 'ms-playwright\chromium-1194\chrome-win\chrome.exe'
$key = 'HKCU:\Software\Microsoft\DirectX\UserGpuPreferences'
$prof = Join-Path $env:TEMP 'gpupref-profile'
$page = 'file:///' + (Join-Path $PSScriptRoot 'gl.html').Replace([char]92, [char]47)

function Run-Once($label) {
  Start-Process -FilePath $exe -ArgumentList @("--user-data-dir=$prof", '--no-first-run', '--force_high_performance_gpu', '--window-size=900,700', $page) | Out-Null
  Start-Sleep -Seconds 10
  $ids = @((Get-CimInstance Win32_Process -Filter "Name='chrome.exe'" | Where-Object { $_.CommandLine -like "*gpupref-profile*" }).ProcessId)
  $title = (Get-Process -Id $ids -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowTitle } | Select-Object -First 1).MainWindowTitle
  $samples = (Get-Counter '\GPU Process Memory(*)\Dedicated Usage', '\GPU Process Memory(*)\Shared Usage' -ErrorAction SilentlyContinue).CounterSamples
  "$label"
  "   renderer reported by the page: $title"
  foreach ($s in $samples) {
    if ($s.CookedValue -lt 1e6) { continue }
    foreach ($id in $ids) {
      if ($s.InstanceName -like "pid_$($id)_*") {
        $kind = $s.Path.Split([char]92)[-1]
        $card = if ($s.InstanceName -like '*0x000150e7*') { 'NVIDIA' } elseif ($s.InstanceName -like '*0x00014c29*') { 'Intel' } else { $s.InstanceName }
        "   $card $kind = " + [math]::Round($s.CookedValue / 1MB) + " MB"
      }
    }
  }
  foreach ($id in $ids) { Stop-Process -Id $id -Force -ErrorAction SilentlyContinue }
  Start-Sleep -Seconds 2
}

$had = (Get-ItemProperty -Path $key -Name $exe -ErrorAction SilentlyContinue).$exe
Run-Once 'A. no Windows preference, app asks for the fast card'
if (-not (Test-Path $key)) { New-Item -Path $key -Force | Out-Null }
Set-ItemProperty -Path $key -Name $exe -Value 'GpuPreference=1;'
Run-Once 'B. Windows preference = Power saving, app still asks for the fast card'
if ($had) { Set-ItemProperty -Path $key -Name $exe -Value $had } else { Remove-ItemProperty -Path $key -Name $exe -ErrorAction SilentlyContinue }
"preference removed: " + (-not (Get-ItemProperty -Path $key -Name $exe -ErrorAction SilentlyContinue))
Remove-Item -Recurse -Force $prof -ErrorAction SilentlyContinue
