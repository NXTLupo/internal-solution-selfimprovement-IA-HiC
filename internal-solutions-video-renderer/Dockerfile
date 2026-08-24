# HiC VIDEO RENDERER (E3.1, 2026-08-21)
#
# HyperFrames (github.com/heygen-com/hyperframes, Apache-2.0) is a deterministic
# HTML-to-video renderer: a paused, seekable timeline in a plain HTML file, captured
# frame by frame through Chrome DevTools BeginFrame, encoded by ffmpeg. It is Node-only,
# so it cannot live inside the Python research proxy; this sidecar is the same split the
# platform already uses for gold_pptx_export and nxt_diagram_render.
#
# Three hard requirements, verified by running the tool on this machine before writing
# any of this: Node 22 or newer, an ffmpeg built WITH libx264 (Playwright's bundled
# ffmpeg carries only libvpx and HyperFrames correctly refuses it), and a
# chrome-headless-shell. Chromium comes from the distro here rather than the tool's
# pinned download, so the image builds without reaching the internet at runtime.
FROM node:22-bookworm-slim

# ffmpeg from Debian carries libx264. chromium supplies the capture surface.
# The remaining packages are the font and library set headless Chromium needs to
# rasterize text at all; without them every frame renders blank boxes.
RUN apt-get update && apt-get install -y --no-install-recommends \
        ffmpeg \
        chromium \
        fonts-liberation \
        fontconfig \
        libnss3 \
        libatk1.0-0 \
        libatk-bridge2.0-0 \
        libcups2 \
        libdrm2 \
        libxkbcommon0 \
        libxcomposite1 \
        libxdamage1 \
        libxfixes3 \
        libxrandr2 \
        libgbm1 \
        libpango-1.0-0 \
        libcairo2 \
        libasound2 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev

COPY server.mjs ./
COPY fonts/ /usr/local/share/fonts/
RUN fc-cache -f || true

# Point HyperFrames at the distro Chromium instead of its pinned download, and turn
# telemetry off: it is ON by default and this service renders client material.
ENV HYPERFRAMES_BROWSER_PATH=/usr/bin/chromium \
    HYPERFRAMES_NO_TELEMETRY=1 \
    DO_NOT_TRACK=1 \
    PRODUCER_RENDERS_DIR=/renders \
    PORT=4600

RUN mkdir -p /renders /work

EXPOSE 4600
# Chromium needs more than the 64MB default /dev/shm; compose sets shm_size to match.
CMD ["node", "server.mjs"]
