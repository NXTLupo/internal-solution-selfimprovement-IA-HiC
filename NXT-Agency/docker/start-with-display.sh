#!/bin/bash
# Start virtual display + VNC + noVNC + FastAPI app
set -e

echo "=== Starting NXT Agency Backend with Live Browser Display ==="

# Clean stale X lock files from previous runs
rm -f /tmp/.X99-lock /tmp/.X11-unix/X99

# Start Xvfb (virtual framebuffer)
echo "Starting Xvfb on display :99 (${RESOLUTION})..."
Xvfb :99 -screen 0 ${RESOLUTION} -ac +extension GLX +render -noreset &
sleep 1

# Start Fluxbox window manager (lightweight, gives windows proper frames)
echo "Starting Fluxbox window manager..."
DISPLAY=:99 fluxbox &
sleep 1

# Start x11vnc (VNC server on the virtual display, no password for internal use)
echo "Starting x11vnc on display :99..."
x11vnc -display :99 -forever -nopw -shared -rfbport 5900 -bg -o /tmp/x11vnc.log
sleep 1

# Start noVNC (web-based VNC viewer) on port 6080
echo "Starting noVNC web viewer on port 6080..."
websockify --web=/usr/share/novnc/ 6080 localhost:5900 &
sleep 1

echo "=== Display services ready ==="
echo "  Virtual display: :99 (${RESOLUTION})"
echo "  VNC: localhost:5900"
echo "  noVNC web viewer: http://localhost:6080/vnc.html?autoconnect=true&resize=scale"
echo "=== Starting FastAPI application ==="

# Start the FastAPI app
exec python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
