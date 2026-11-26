# Read-only: Figma processes, their exe paths, per-process GPU memory by card, current Windows preference.
$key = 'HKCU:\Software\Microsoft\DirectX\UserGpuPreferences'
$procs = @(Get-CimInstance Win32_Process | Where-Object { $_.Name -like 'Figma*' -or $_.Name -like 'figma_agent*' })
"figma processes: " + $procs.Count
$procs | Group-Object ExecutablePath | ForEach-Object { "   " + $_.Count + " x " + $_.Name }
$main = $procs | Where-Object { $_.Name -eq 'Figma.exe' -and $_.CommandLine -notlike '*--type=*' } | Select-Object -First 1
if ($main) { "main command line: " + $main.CommandLine }
$ids = @($procs.ProcessId)
$samples = (Get-Counter '\GPU Process Memory(*)\Dedicated Usage', '\GPU Process Memory(*)\Shared Usage' -ErrorAction SilentlyContinue).CounterSamples
$tot = @{}
foreach ($s in $samples) {
  if ($s.CookedValue -lt 1e6) { continue }
  foreach ($id in $ids) {
    if ($s.InstanceName -like "pid_$($id)_*") {
      $kind = $s.Path.Split([char]92)[-1]
      $card = if ($s.InstanceName -like '*0x000150e7*') { 'NVIDIA' } elseif ($s.InstanceName -like '*0x00014c29*') { 'Intel' } else { 'other:' + $s.InstanceName }
      $k = "$card $kind"
      $tot[$k] = [double]$tot[$k] + $s.CookedValue
    }
  }
}
foreach ($k in ($tot.Keys | Sort-Object)) { "   $k = " + [math]::Round($tot[$k] / 1MB) + " MB" }
"nvidia-smi: " + (& nvidia-smi --query-gpu=memory.used,memory.total,temperature.gpu --format=csv,noheader)
"existing preferences:"
if (Test-Path $key) { (Get-ItemProperty -Path $key).PSObject.Properties | Where-Object { $_.Name -notlike 'PS*' } | ForEach-Object { "   " + $_.Name + " = " + $_.Value } }
"figma install folder:"
Get-ChildItem (Join-Path $env:LOCALAPPDATA 'Figma') -ErrorAction SilentlyContinue | ForEach-Object { "   " + $_.Name }
