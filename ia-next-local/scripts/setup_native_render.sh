#!/usr/bin/env bash
# Install the Docker-free renderer in the existing Ubuntu WSL distribution as root.
set -euo pipefail

source_root="$(cd "$(dirname "$0")/.." && pwd)"
runtime=/opt/ia-next-native/render
install -d -m 0755 "$runtime"
install -m 0644 "$source_root/render/app.py" "$runtime/app.py"
# Native launches also use Chromium's inner sandbox.
sed -i 's/launch(args=\["--no-sandbox", /launch(chromium_sandbox=True, args=[/g' "$runtime/app.py"

python3 -m venv "$runtime/venv"
"$runtime/venv/bin/pip" install --disable-pip-version-check 'fastapi==0.115.12' 'uvicorn==0.34.2' 'playwright==1.65.2'
export PLAYWRIGHT_BROWSERS_PATH="$runtime/browsers"
"$runtime/venv/bin/python" -m playwright install --with-deps --only-shell chromium
chmod -R a+rX "$PLAYWRIGHT_BROWSERS_PATH"

# The public side is one loopback TCP socket. The worker receives its listening FD from systemd,
# so it can respond while all of its new connections stay inside an empty network namespace.
cat >/etc/systemd/system/ia-next-native-render.socket <<'UNIT'
[Unit]
Description=IA Next Native renderer socket

[Socket]
ListenStream=127.0.0.1:9501

[Install]
WantedBy=sockets.target
UNIT

cat >/etc/systemd/system/ia-next-native-render.service <<'UNIT'
[Unit]
Description=IA Next Native isolated renderer
Requires=ia-next-native-render.socket

[Service]
Type=simple
DynamicUser=yes
WorkingDirectory=/opt/ia-next-native/render
Environment=PLAYWRIGHT_BROWSERS_PATH=/opt/ia-next-native/render/browsers
Environment=PYTHONDONTWRITEBYTECODE=1
Environment=HOME=/tmp
ExecStart=/opt/ia-next-native/render/venv/bin/python -m uvicorn app:app --fd 3
PrivateNetwork=yes
PrivateTmp=yes
PrivateDevices=yes
NoNewPrivileges=yes
ProtectHome=yes
ProtectSystem=strict
InaccessiblePaths=/mnt -/run/WSL -/run/dbus -/run/user
UMask=0077
UNIT

systemctl daemon-reload
systemctl enable --now ia-next-native-render.socket
systemctl restart ia-next-native-render.service
