# Sets the Windows per-app graphics preference "Power saving" for every Figma.exe on this machine, then restarts Figma.
# Undo: remove the listed values under HKCU:\Software\Microsoft\DirectX\UserGpuPreferences and restart Figma.
$key = 'HKCU:\Software\Microsoft\DirectX\UserGpuPreferences'
$root = Join-Path $env:LOCALAPPDATA 'Figma'
$exes = @(Join-Path $root 'Figma.exe') + @(Get-ChildItem $root -Directory -Filter 'app-*' | ForEach-Object { Join-Path $_.FullName 'Figma.exe' } | Where-Object { Test-Path $_ })
if (-not (Test-Path $key)) { New-Item -Path $key -Force | Out-Null }
foreach ($e in $exes) {
  $old = (Get-ItemProperty -Path $key -Name $e -ErrorAction SilentlyContinue).$e
  Set-ItemProperty -Path $key -Name $e -Value 'GpuPreference=1;'
  "set: $e (was: " + $(if ($old) { $old } else { 'none' }) + ")"
}
$figs = @(Get-Process -Name Figma -ErrorAction SilentlyContinue)
"closing " + $figs.Count + " Figma processes"
foreach ($p in $figs) { if ($p.MainWindowHandle -ne 0) { $p.CloseMainWindow() | Out-Null } }
$t = 0
while ((Get-Process -Name Figma -ErrorAction SilentlyContinue) -and $t -lt 30) { Start-Sleep -Seconds 1; $t++ }
$left = @(Get-Process -Name Figma -ErrorAction SilentlyContinue)
if ($left.Count) { "still running after 30 s, stopping " + $left.Count; $left | Stop-Process -Force -ErrorAction SilentlyContinue; Start-Sleep -Seconds 2 } else { "closed cleanly in $t s" }
Start-Process -FilePath (Join-Path $root 'Figma.exe')
Start-Sleep -Seconds 40
"restarted: " + @(Get-Process -Name Figma -ErrorAction SilentlyContinue).Count + " processes"
