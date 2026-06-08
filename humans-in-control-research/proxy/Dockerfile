# humans-in-control-research/proxy/Dockerfile -- 2026-05-19
#
# Cached-layer image for the HiC research proxy. Replaces the "image:
# python:3.11-slim + bash command: install-on-every-start" pattern in
# docker-compose-all.yml that caused 60-120 sec of ERR_EMPTY_RESPONSE
# after every rebuild (pip would reinstall 50+ packages from PyPI before
# uvicorn bound port 5012).
#
# Architecture rules this image is designed around:
#   1. The compose file mounts ./humans-in-control-research/proxy:/app at
#      runtime so the proxy's Python source (app.py, pptx_export.py, etc.)
#      can be edited on the host without rebuilding the image. That mount
#      OVERLAYS anything copied to /app during build — so we do NOT copy
#      the app sources here. Only the runtime command + system deps live
#      in the image; the code is volume-mounted.
#   2. Python deps install to the global site-packages
#      (/usr/local/lib/python3.11/site-packages) where they survive the
#      /app overlay. `import fastapi` works at runtime even though /app
#      is host-mounted because the import path looks in site-packages,
#      not /app.
#   3. ffmpeg is required by the YouTube transcription path
#      (/api/transcribe-youtube). The previous bash wrapper did
#      `command -v ffmpeg || apt install` on every start — baking it into
#      the image removes that path entirely.
#
# Rebuild behavior:
#   - Edit requirements.txt -> docker compose up -d --build research-proxy
#     reinstalls deps in the build cache. Slow on first rebuild after a
#     change, fast (cache-hit) otherwise.
#   - Edit app.py / pptx_export.py / topic_modeling.py / wiki_*.py -> NO
#     rebuild needed. Volume mount picks up the change; restart the
#     container if the change touches FastAPI app initialization
#     (`docker compose restart research-proxy`).

FROM python:3.11-slim

# System deps baked in:
#   - ffmpeg: YouTube transcription audio chunking (>25 MB → segment to MP3
#     before whisper-1 upload). Previously installed by the bash wrapper
#     on every container start.
#   - build-essential: needed by some Python wheels (hdbscan, numba, llvmlite,
#     pynndescent) when prebuilt wheels aren't available for slim image.
#   - libxml2-dev / libxslt-dev: lxml's C extensions.
#   - curl: lightweight healthcheck.
RUN apt-get update -qq \
 && apt-get install -y --no-install-recommends \
        ffmpeg \
        build-essential \
        libxml2-dev \
        libxslt-dev \
        curl \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy requirements FIRST so the pip layer caches independently of source
# changes. This is the whole point of the rebuild: changing app.py no longer
# invalidates the pip-install layer.
COPY requirements.txt /tmp/requirements.txt

# Install Python deps into the global site-packages so the runtime volume
# mount of ./proxy:/app (which overlays /app) doesn't hide them. --no-cache-dir
# keeps the image small; --no-compile skips writing .pyc files (we don't need
# them in a long-running server).
RUN pip install --no-cache-dir --no-compile -r /tmp/requirements.txt

# 2026-05-30 — Headless Chromium for slide-export fidelity. Renders the real
# .nxt-slide frames so PNG/PDF exports are pixel-faithful to the CSS preview
# (generic over every design-system block). The earlier apt layer ran
# `rm -rf /var/lib/apt/lists/*`, so `playwright install --with-deps` (which
# shells to apt-get install) finds no package lists and fails. Run apt-get
# update first, install the OS deps, then fetch the browser binary, then clean.
# `playwright install-deps` assumes Ubuntu and pulls ttf-unifont /
# ttf-ubuntu-font-family, which do not exist on Debian slim (python:3.11-slim
# is Debian bookworm). Install the headless-Chromium runtime libraries by their
# Debian names instead, then fetch only the browser binary.
RUN apt-get update -qq \
 && apt-get install -y --no-install-recommends \
        libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 \
        libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 \
        libgbm1 libpango-1.0-0 libcairo2 libasound2 libatspi2.0-0 \
        libx11-6 libxcb1 libxext6 libxi6 fonts-liberation \
 && playwright install chromium \
 && rm -rf /var/lib/apt/lists/*
# Bake the brand fonts into the OS font path so Chromium renders Saira
# Condensed + Archivo identically to the CSS preview.
COPY fonts/static/*.ttf /usr/share/fonts/truetype/nxt/
RUN fc-cache -f 2>/dev/null || true

# The proxy listens on 5012 inside the container (compose maps host port).
ENV PORT=5012
EXPOSE 5012

# Healthcheck: hit the proxy's /health endpoint. 30-second interval keeps it
# light; 60-second start_period gives uvicorn time to boot. Curl is silent;
# only the exit code matters to Docker.
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
    CMD curl -sf "http://127.0.0.1:${PORT}/health" || exit 1

# python app.py boots uvicorn via the app's own __main__ block (the previous
# bash wrapper did the same thing). app.py is provided by the host volume
# mount at runtime — that's the entire reason this Dockerfile exists.
CMD ["python", "app.py"]
