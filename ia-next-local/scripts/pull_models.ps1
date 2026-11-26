# IA Next Local: the open-weight models each seat uses, pulled into Ollama's store (OLLAMA_MODELS, on D:).
# Safe to run again: a model already present is verified, not downloaded twice.
#
#   Seat                         Model                                       Size     Publisher   Licence
#   orchestration, verifier      Nemotron 3.5 Lightning 30B-A3B  Q4_0        18.9 GB  NVIDIA      OpenMDW 1.1
#   artifact, analysis, vision   Qwen3.8-27B  Q4_K_M (and UD-IQ4_XS)         17 GB    Alibaba     Apache 2.0
#   prototype                    Ornith 1.5 35B-A3B  Q4_K_M                  21.7 GB  Ornith      MIT
#   fast                         MiniCPM5-2B  Q4_K_M                         1.6 GB   OpenBMB     Apache 2.0
#   embeddings (themes)          qwen3-embedding 0.6b                        0.6 GB   Alibaba     Apache 2.0
$ErrorActionPreference = "Stop"
if (-not $env:OLLAMA_MODELS) { Write-Warning "OLLAMA_MODELS is not set; Ollama will store models under your user profile on C:." }
$models = @(
  "hf.co/ggml-org/NVIDIA-Nemotron-3.5-Lightning-30B-A3B-GGUF:Q4_0",
  "qwen3.8:27b-q4_K_M",
  "qwen3.8:27b-ud-iq4_xs",
  "hf.co/ornith-ai/Ornith-1.5-35B-A3B-GGUF:Q4_K_M",
  "hf.co/openbmb/MiniCPM5-2B-GGUF:Q4_K_M",
  "qwen3-embedding:0.6b"
)
foreach ($m in $models) { Write-Host "== $m"; ollama pull $m }
ollama list
