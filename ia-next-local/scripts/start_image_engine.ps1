# IA Next Local's own image and video engine: a dedicated ComfyUI on D:, separate from every other project.
#   Folder   D:\IA-Next-Runtimes\ComfyUI_windows_portable   (official portable build v0.46.0, sha256 6a5255c7...5fac6)
#   Python   its own python_embeded; PyTorch pinned to 2.11.0+cu128 (torch, torchvision 0.26.0, torchaudio 2.11.0),
#            because NVIDIA driver 576.57 (replaced by 621.24 on 2026-11-19) did not support the CUDA 13.0 build the
#            archive ships with. After a driver update, the archive's own build can be restored with
#            update\update_comfyui.bat.
#   Weights  pictures: read from D:\nxt-ai-capabilities\local\engines\comfyui\models through
#            ComfyUI\extra_model_paths.yaml (nothing is copied; that project's own ComfyUI is not touched).
#            video: in this engine's own ComfyUI\models (Kandinsky 6.0 Lite Distill, 25.4 GB).
#   Port     8189, loopback only. Core nodes plus ONE reviewed extension: the official Kandinsky 6 nodes for video
#            (custom_nodes/kandinsky6, from github.com/kandinskylab/kandinsky-6 at commit 73b892b7, copied by hand;
#            its source is kept in D:/IA-Next-Runtimes/src/kandinsky-6). No other custom node loads, no paid API nodes.
#            The environment before the extension is recorded in freeze-before-video-2026-11-19.txt.
#
# The engine shares the one graphics card with the language models. After a video it keeps about 18 GB and does not
# give it back when asked (measured 2026-11-19: a mind map then ran at one word a second for 14 minutes). So this
# script watches it: when the engine has nothing queued and still holds more than 2 GB for 20 seconds, it is restarted.
# IA Next Local waits up to 90 seconds for a restarting engine before it says pictures are unavailable.
$engine = 'D:\IA-Next-Runtimes\ComfyUI_windows_portable'
$url = 'http://127.0.0.1:8189'
$engineArgs = @('-s', 'ComfyUI\main.py', '--listen', '127.0.0.1', '--port', '8189', '--disable-all-custom-nodes',
                '--whitelist-custom-nodes', 'kandinsky6', '--disable-api-nodes', '--disable-auto-launch')
Set-Location $engine

function Get-EngineHeldGB {
    try {
        $s = Invoke-RestMethod "$url/system_stats" -TimeoutSec 4
        return [double]$s.devices[0].torch_vram_total / 1e9
    } catch { return -1 }
}

function Test-EngineBusy {
    try {
        $q = Invoke-RestMethod "$url/queue" -TimeoutSec 4
        return (@($q.queue_running).Count + @($q.queue_pending).Count) -gt 0
    } catch { return $true }      # not answering: starting up or working hard; leave it alone
}

while ($true) {
    $p = Start-Process -FilePath "$engine\python_embeded\python.exe" -ArgumentList $engineArgs -WorkingDirectory $engine -NoNewWindow -PassThru
    Write-Output "engine started, pid $($p.Id)"
    $idleHolding = 0
    while (-not $p.HasExited) {
        Start-Sleep -Seconds 5
        $held = Get-EngineHeldGB
        if ($held -gt 2 -and -not (Test-EngineBusy)) { $idleHolding += 5 } else { $idleHolding = 0 }
        if ($idleHolding -ge 20) {
            Write-Output ("engine idle but holding {0:N1} GB of graphics memory: restarting it" -f $held)
            Stop-Process -Id $p.Id -Force
            break
        }
    }
    Start-Sleep -Seconds 2
}
